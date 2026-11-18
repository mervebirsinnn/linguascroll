import { and, eq, isNull, ne, sql } from "drizzle-orm";
import type { Database } from "../database/database.module";
import { wordsTable } from "../words/words.schema";
import { computePassageContentHash, type PassagePack } from "./passage-pack";
import { validatePackSet, validatePassagePack, type PackIssue } from "./passage-pack-validator";
import { passageOptionsTable, passageQuestionsTable, passagesTable, passageWordSpansTable, passageWordsTable } from "./passages.schema";

export type PublishStatus = "created" | "unchanged";
export type PublishResult = { slug: string; status: PublishStatus };

/** Yayın reddedildi: hiçbir şey yazılmadı (tüm çalıştırma tek transaction). `issues` düzeltilecek her sorunu listeler. */
export class PassagePublishError extends Error {
  constructor(readonly issues: readonly PackIssue[]) {
    super(`Yayın reddedildi (${issues.length} sorun):\n${issues.map((entry) => `- [${entry.code}] ${entry.path}: ${entry.message}`).join("\n")}`);
    this.name = "PassagePublishError";
  }
}

const WORD_LANGUAGE = "en";

/** Tüm dosyaları YAZMADAN doğrular (kalite kapısı + küme kuralları). Her sorun hangi pakete ait olduğuyla döner. */
export function validatePacks(inputs: ReadonlyArray<{ source: string; json: unknown }>): { packs: PassagePack[]; issues: PackIssue[] } {
  const packs: PassagePack[] = [];
  const issues: PackIssue[] = [];
  for (const { source, json } of inputs) {
    const result = validatePassagePack(json);
    issues.push(...result.issues.map((entry) => ({ ...entry, path: `${source}: ${entry.path}` })));
    if (result.pack) packs.push(result.pack);
  }
  issues.push(...validatePackSet(packs));
  return { packs, issues };
}

/**
 * Paketleri TEK transaction'da yayınlar; slug'a göre idempotent:
 * - slug yok → oluşturulur ("created").
 * - slug var, içerik/sortOrder/isFreeSample AYNI, emekli değil → HİÇBİR yazım yok ("unchanged"; satır id'leri sabit,
 *   passage_answers'ın bağlı olduğu soru/şık id'leri korunur — sil-yeniden-ekle yok).
 * - slug var ama HERHANGİ bir fark / emekli → REDDEDİLİR (hiçbir şey yazılmaz): esaslı düzeltme = eski metni emekli et +
 *   YENİ slug (bkz. passages.schema.ts); sessiz üzerine yazma cevaplanmış şıkların anlamını değiştirirdi.
 * Her hata tüm çalıştırmayı geri alır. Eşzamanlı yayınlar advisory lock ile sıralanır (words'te UNIQUE yok → kopya riski).
 */
export async function publishPassagePacks(db: Database, packs: readonly PassagePack[]): Promise<PublishResult[]> {
  // Tek kapı: çağıran doğrulamadıysa bile geçersiz paket DB'ye ulaşamaz.
  const revalidated = validatePacks(packs.map((pack, index) => ({ source: `paket#${index}`, json: pack })));
  if (revalidated.issues.length > 0) throw new PassagePublishError(revalidated.issues);

  return db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext('passages-publish'))`);
    const results: PublishResult[] = [];

    for (const pack of revalidated.packs) {
      const contentHash = computePassageContentHash(pack);
      const [existing] = await tx.select().from(passagesTable).where(eq(passagesTable.slug, pack.slug));

      if (existing) {
        const differences: string[] = [];
        if (existing.retiredAt !== null) differences.push("slug emekli edilmiş (yeni slug kullan)");
        if (existing.contentHash !== contentHash) differences.push("içerik farklı (esaslı düzeltme: eski metni emekli et + yeni slug)");
        if (existing.sortOrder !== pack.sortOrder) differences.push("sortOrder yayından sonra değişmez");
        if (existing.isFreeSample !== pack.isFreeSample) differences.push("isFreeSample ayrı bir işlemle değiştirilir");
        if (differences.length > 0) {
          throw new PassagePublishError(differences.map((message) => ({ code: "slug-conflict", path: pack.slug, message })));
        }
        results.push({ slug: pack.slug, status: "unchanged" });
        continue;
      }

      await assertPlacementFree(tx, pack);
      await insertPack(tx, pack, contentHash);
      results.push({ slug: pack.slug, status: "created" });
    }
    return results;
  });
}

type Tx = Parameters<Parameters<Database["transaction"]>[0]>[0];

/** DB durumuna bağlı kurallar (küme kuralları paketlerin kendi içinde): (seviye, sıra) boş mu, ücretsiz örnek kotası. */
async function assertPlacementFree(tx: Tx, pack: PassagePack): Promise<void> {
  const issues: PackIssue[] = [];
  const [sameOrder] = await tx
    .select({ slug: passagesTable.slug })
    .from(passagesTable)
    .where(and(eq(passagesTable.level, pack.level), eq(passagesTable.sortOrder, pack.sortOrder), isNull(passagesTable.retiredAt)))
    .limit(1);
  if (sameOrder) issues.push({ code: "sort-order-taken", path: pack.slug, message: `(${pack.level}, sortOrder ${pack.sortOrder}) "${sameOrder.slug}" tarafından kullanılıyor` });

  if (pack.isFreeSample) {
    const [otherFree] = await tx
      .select({ slug: passagesTable.slug })
      .from(passagesTable)
      .where(and(eq(passagesTable.level, pack.level), eq(passagesTable.isFreeSample, true), isNull(passagesTable.retiredAt), ne(passagesTable.slug, pack.slug)))
      .limit(1);
    if (otherFree) issues.push({ code: "free-sample-taken", path: pack.slug, message: `${pack.level} için ücretsiz örnek zaten var: "${otherFree.slug}"` });
  }
  if (issues.length > 0) throw new PassagePublishError(issues);
}

async function insertPack(tx: Tx, pack: PassagePack, contentHash: string): Promise<void> {
  const [passage] = await tx
    .insert(passagesTable)
    .values({
      slug: pack.slug,
      level: pack.level,
      title: pack.title,
      topic: pack.topic,
      paragraphs: pack.paragraphs,
      sortOrder: pack.sortOrder,
      isFreeSample: pack.isFreeSample,
      contentHash,
    })
    .returning({ id: passagesTable.id });
  if (!passage) throw new Error("Metin eklenemedi");

  // Kelime: (language, lemma, gloss) ÜÇLÜSÜ ile bul-ya-da-oluştur — lemma tek başına bağlanmaz (homonym: farklı anlam =
  // farklı satır; bkz. words.schema.ts). saveSegmentGloss ile aynı eşleşme kuralı.
  const wordIds: string[] = [];
  for (const word of pack.words) {
    const [found] = await tx
      .select({ id: wordsTable.id })
      .from(wordsTable)
      .where(and(eq(wordsTable.language, WORD_LANGUAGE), eq(wordsTable.lemma, word.lemma), eq(wordsTable.gloss, word.gloss)))
      .orderBy(wordsTable.id)
      .limit(1);
    if (found) {
      wordIds.push(found.id);
      continue;
    }
    const [created] = await tx.insert(wordsTable).values({ language: WORD_LANGUAGE, lemma: word.lemma, gloss: word.gloss }).returning({ id: wordsTable.id });
    if (!created) throw new Error(`Kelime eklenemedi: ${word.lemma}`);
    wordIds.push(created.id);
  }

  await tx.insert(passageWordsTable).values(pack.words.map((word, index) => ({ passageId: passage.id, wordId: wordIds[index]!, contextSentence: word.contextSentence })));
  await tx.insert(passageWordSpansTable).values(
    pack.words.flatMap((word, index) =>
      word.spans.map((span) => ({ passageId: passage.id, paragraphIndex: span.paragraphIndex, start: span.start, end: span.end, wordId: wordIds[index]!, surface: span.surface })),
    ),
  );

  for (const [questionIndex, question] of pack.questions.entries()) {
    const [row] = await tx
      .insert(passageQuestionsTable)
      .values({ passageId: passage.id, key: question.key, position: questionIndex + 1, type: question.type, prompt: question.prompt })
      .returning({ id: passageQuestionsTable.id });
    if (!row) throw new Error("Soru eklenemedi");
    await tx.insert(passageOptionsTable).values(
      question.options.map((option, optionIndex) => ({
        questionId: row.id,
        key: option.key,
        position: optionIndex,
        text: option.text,
        isCorrect: option.isCorrect,
        trapType: option.trapType,
        explanation: option.explanation,
      })),
    );
  }
}
