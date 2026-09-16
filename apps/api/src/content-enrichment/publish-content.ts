import "dotenv/config";
import * as fs from "node:fs";
import * as path from "node:path";
import { and, eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import type { Database } from "../database/database.module";
import { transcriptSegmentLearningPointsTable } from "../videos/transcript-segment-learning-points.schema";
import { videoTranscriptSegmentsTable } from "../videos/transcript-segments.schema";
import { LOCAL_MEDIA_PREFIX } from "../videos/resolve-playback-url";
import { videosTable } from "../videos/videos.schema";
import { videoWordsTable } from "../words/video-words.schema";
import { wordsTable } from "../words/words.schema";
import { quizOptionsTable, quizzesTable } from "../quizzes/quizzes.schema";
import { evaluateContentQuality } from "./content-quality-gate";
import type { QualityReport } from "./content-quality.schema";
import type { EnrichmentVocabularyItem } from "./enrichment-output.schema";
import { publishDraftSchema, type PublishDraft } from "./publish-draft.schema";
import { assertValidSegmentReferences } from "./validate-segment-references";

/**
 * Chunk 12 — `enrich-transcript.ts`'in ürettiği (ve gerekirse insan tarafından
 * elle düzeltilmiş) `enriched.json`'ı GERÇEK DB'ye yazan tek adım (madde 12'nin
 * review→publish sınırı). Diğer seed script'leri gibi (`seed-videos.ts` vb.)
 * Nest DI'ın DIŞINDA, kendi Pool/drizzle bağlantısını açan bağımsız bir CLI.
 *
 * Fark: seed script'leri SABİT, elle verilmiş UUID'lerle `ON CONFLICT DO
 * NOTHING(id)` kullanıyor (statik bir katalog). Burada id'ler DB'nin
 * ürettiği gerçek UUID'ler (`gen_random_uuid()`) — idempotency anahtarı
 * `videos.mux_asset_id` (hem burada application-level SELECT ile HEM DE
 * `videos_mux_asset_id_unique` constraint'iyle DB seviyesinde garanti
 * altında, bkz. videos.schema.ts).
 */

export class PublishAlreadyExistsError extends Error {}
export class PublishPipelineError extends Error {}
/** Chunk 13 — `reject` durumunda fırlatılır. HİÇBİR flag'le override edilemez (kullanıcı kararı). */
export class PublishQualityRejectedError extends Error {}
/** Chunk 13 — `needsReview` durumunda, `--acknowledge-needs-review` verilmemişse fırlatılır. */
export class PublishQualityNeedsReviewError extends Error {}

const API_ROOT = path.resolve(__dirname, "..", "..");
const ENRICHMENT_OUTPUT_DIR = path.join(API_ROOT, "src", "content-enrichment", "output");
const MEDIA_DIR = path.join(API_ROOT, "public", "media");

export function parseArgs(argv: readonly string[]): { contentId: string; acknowledgeNeedsReview: boolean } {
  let contentId: string | undefined;
  let acknowledgeNeedsReview = false;
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--content-id") {
      contentId = argv[++i];
    } else if (argv[i] === "--acknowledge-needs-review") {
      acknowledgeNeedsReview = true;
    } else {
      throw new PublishPipelineError(`Bilinmeyen argüman: "${argv[i]}". Kullanım: --content-id <id> [--acknowledge-needs-review]`);
    }
  }
  if (!contentId) {
    throw new PublishPipelineError("--content-id zorunlu (örn. --content-id a1final1).");
  }
  return { contentId, acknowledgeNeedsReview };
}

export function resolveEnrichedPath(contentId: string): string {
  return path.join(ENRICHMENT_OUTPUT_DIR, contentId, "enriched.json");
}

/**
 * Chunk 14B — `main()`'in enriched.json okuma/doğrulama adımı (dosya var mı →
 * JSON.parse → publishDraftSchema → assertValidSegmentReferences) BURAYA
 * çıkarıldı: `publish-vocabulary.ts`'in CLI'ı da AYNI dosyayı, AYNI trust
 * boundary kontrolleriyle okuyor — iki farklı yerde iki farklı "enriched.json
 * nasıl okunur" mantığı riski istemiyoruz.
 */
export function loadPublishDraft(contentId: string): PublishDraft {
  const enrichedPath = resolveEnrichedPath(contentId);
  if (!fs.existsSync(enrichedPath)) {
    throw new PublishPipelineError(`"${enrichedPath}" bulunamadı — önce "pnpm enrich --content-id ${contentId}" çalıştırın.`);
  }

  const rawDraft: unknown = JSON.parse(fs.readFileSync(enrichedPath, "utf-8"));
  const parseResult = publishDraftSchema.safeParse(rawDraft);
  if (!parseResult.success) {
    throw new PublishPipelineError(
      `"${enrichedPath}" beklenen şekilde değil:\n${parseResult.error.issues.map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`).join("\n")}`,
    );
  }
  const draft = parseResult.data;
  assertValidSegmentReferences(draft, draft.segments);
  return draft;
}

export function resolveMediaDestination(muxAssetId: string, mediaDir: string = MEDIA_DIR): string {
  return path.join(mediaDir, `${muxAssetId.slice(LOCAL_MEDIA_PREFIX.length)}.mp4`);
}

/**
 * Chunk 13 — diskteki `draft.quality` alanına GÜVENMİYOR (kullanıcı kararı):
 * `enriched.json` insan tarafından elle düzenlenebildiği için, publish anında
 * `evaluateContentQuality` FRESH çalıştırılıyor — `assertValidSegmentReferences`'ın
 * hem enrich hem publish'te tekrar çağrılmasıyla AYNI "her sınırda yeniden
 * doğrula" deseni (bkz. Chunk 12).
 *
 * `reject` HİÇBİR flag'le override edilemez — `acknowledgeNeedsReview` parametresi
 * sadece `needsReview` durumunu etkiler. Bu ayrım, iki AYRI exception sınıfıyla
 * (bir `catch` bloğunun `reject`'i yanlışlıkla `needsReview` gibi ele almasını
 * derleme zamanında değil ama en azından isim/tip seviyesinde imkansız kılacak
 * şekilde) kodda görünür kılınıyor.
 */
export function assertPassesQualityGate(draft: PublishDraft, acknowledgeNeedsReview: boolean): QualityReport {
  const freshQuality = evaluateContentQuality(draft);

  if (freshQuality.status === "reject") {
    const issueList = freshQuality.issues.filter((issue) => issue.severity === "reject").map((issue) => `  - [${issue.code}] ${issue.message}`).join("\n");
    throw new PublishQualityRejectedError(
      `"${draft.muxAssetId}" quality gate'ten "reject" ile döndü — publish edilemez (override YOK):\n${issueList}`,
    );
  }

  if (freshQuality.status === "needsReview" && !acknowledgeNeedsReview) {
    const issueList = freshQuality.issues.map((issue) => `  - [${issue.code}] ${issue.message}`).join("\n");
    throw new PublishQualityNeedsReviewError(
      `"${draft.muxAssetId}" quality gate'ten "needsReview" ile döndü:\n${issueList}\n\n` +
        "Review ettiyseniz ve yine de publish etmek istiyorsanız --acknowledge-needs-review ekleyip tekrar çalıştırın.",
    );
  }

  return freshQuality;
}

/**
 * Idempotency ön-kontrolü (application-level) — `videos_mux_asset_id_unique`
 * constraint'i (bkz. videos.schema.ts) buna EK bir garanti, TEK mekanizma
 * değil: bu kontrol erken, açık bir hata mesajıyla durur; constraint sadece
 * bir race koşuluna karşı son çare (tek-kullanıcılı bir CLI'da ihtimali
 * düşük — STT pipeline'ının kendi `assertOutputDirAvailable` yorumundaki
 * aynı varsayım).
 */
export async function assertNotAlreadyPublished(db: Database, muxAssetId: string): Promise<void> {
  const existing = await db.select({ id: videosTable.id }).from(videosTable).where(eq(videosTable.muxAssetId, muxAssetId));
  if (existing.length > 0) {
    throw new PublishAlreadyExistsError(
      `"${muxAssetId}" zaten yayınlanmış (video id: ${existing[0]!.id}) — aynı içerik tekrar publish edilemez.`,
    );
  }
}

/**
 * `db.transaction`'ın callback'ine geçtiği `tx` parametresinin tipi —
 * `Database`'den TÜRETİLİYOR (ikinci, elle senkronize edilmesi gereken bir tip
 * tanımı DEĞİL). Chunk 14B — `publishVocabularyForVideo`'nun hem `publishContent`'in
 * KENDİ transaction'ı içinden (aşağıda) HEM DE `publish-vocabulary.ts`'in AYRI,
 * daha dar transaction'ından aynı imzayla çağrılabilmesi için export edildi.
 */
export type PublishTransaction = Parameters<Parameters<Database["transaction"]>[0]>[0];

/**
 * Madde 8 — dedup: aynı (language, lower(lemma)) zaten varsa yeni bir
 * `words` satırı AÇILMIYOR, mevcut id reuse ediliyor. `words.schema.ts`'in
 * BİLİNÇLİ UNIQUE(language, lemma) KOYMAMA kararı (homonym'ler için)
 * korunuyor — bu sadece application-level bir "aynı yazımı tekrar
 * yaratma" eşleştirmesi, DB seviyesinde bir constraint DEĞİL.
 */
async function findOrCreateWordId(tx: PublishTransaction, lemma: string, gloss: string): Promise<string> {
  const [existing] = await tx
    .select({ id: wordsTable.id })
    .from(wordsTable)
    .where(and(eq(wordsTable.language, "en"), sql`lower(${wordsTable.lemma}) = lower(${lemma})`));
  if (existing) {
    return existing.id;
  }
  const [created] = await tx.insert(wordsTable).values({ language: "en", lemma, gloss }).returning({ id: wordsTable.id });
  if (!created) {
    throw new PublishPipelineError(`Kelime insert edilemedi: "${lemma}"`);
  }
  return created.id;
}

/**
 * Chunk 14B — `publishContent`'in vocabulary/video_words persistence mantığı
 * (madde 8'in dedup kararı dahil) BURAYA çıkarıldı, tek çağrı noktası HALİNE
 * getirildi: `publishContent` aşağıda bunu kullanmaya devam ediyor,
 * `publish-vocabulary.ts` (mevcut, publish edilmiş bir video için SADECE
 * vocabulary backfill) da AYNI fonksiyonu, kendi (dar) transaction'ından
 * çağırıyor — iki AYRI implementasyon/iki AYRI dedup kuralı riski yok.
 */
export async function publishVocabularyForVideo(
  tx: PublishTransaction,
  videoId: string,
  vocabulary: readonly EnrichmentVocabularyItem[],
): Promise<void> {
  for (const vocabularyItem of vocabulary) {
    const wordId = await findOrCreateWordId(tx, vocabularyItem.lemma, vocabularyItem.gloss);
    await tx
      .insert(videoWordsTable)
      .values({ videoId, wordId })
      .onConflictDoNothing({ target: [videoWordsTable.videoId, videoWordsTable.wordId] });
  }
}

/**
 * Madde 13 — TEK bir DB transaction'ı: video → segments → learning points →
 * words/video_words → quiz. Herhangi bir adım başarısız olursa tx.rollback
 * (drizzle'ın `db.transaction` callback'inde bir throw otomatik rollback
 * eder) — partial publish YAPISAL olarak imkansız, ayrı bir "temizle" adımı
 * gerekmiyor.
 */
export async function publishContent(db: Database, draft: PublishDraft): Promise<{ videoId: string }> {
  return db.transaction(async (tx) => {
    const [video] = await tx
      .insert(videosTable)
      .values({
        // STT pipeline şimdilik sadece İngilizce kabul ediyor (bkz.
        // scripts/stt/language-status.ts) — bu chunk aynı kapsamı miras
        // alıyor, çoklu dil desteği bu chunk'ın kapsamı dışında.
        learningLanguage: "en",
        cefrLevel: draft.cefrLevel,
        muxAssetId: draft.muxAssetId,
        topic: draft.topic,
        durationMs: draft.durationMs,
      })
      .returning();
    if (!video) {
      throw new PublishPipelineError("Video insert edilemedi.");
    }

    const insertedSegments = await tx
      .insert(videoTranscriptSegmentsTable)
      .values(
        draft.segments.map((segment) => ({
          videoId: video.id,
          ordinal: segment.ordinal,
          startMs: segment.startMs,
          endMs: segment.endMs,
          text: segment.text,
          englishExplanation: segment.englishExplanation,
          turkishExplanation: segment.turkishExplanation,
        })),
      )
      .returning({ id: videoTranscriptSegmentsTable.id, ordinal: videoTranscriptSegmentsTable.ordinal });

    const segmentIdByOrdinal = new Map(insertedSegments.map((segment) => [segment.ordinal, segment.id]));
    function requireSegmentId(ordinal: number): string {
      const segmentId = segmentIdByOrdinal.get(ordinal);
      if (!segmentId) {
        // assertValidSegmentReferences publish'ten ÖNCE zaten çalıştı — buraya
        // teorik olarak hiç girilmemeli, yine de sessizce yanlış bir id
        // kullanmak yerine açıkça patlıyoruz (quiz.ts'teki aynı savunma deseni).
        throw new PublishPipelineError(`Segment ordinal ${ordinal} için insert edilmiş bir segment bulunamadı.`);
      }
      return segmentId;
    }

    if (draft.learningPoints.length > 0) {
      const nextOrdinalBySegmentId = new Map<string, number>();
      const learningPointRows = draft.learningPoints.map((learningPoint) => {
        const segmentId = requireSegmentId(learningPoint.segmentOrdinal);
        const ordinal = (nextOrdinalBySegmentId.get(segmentId) ?? 0) + 1;
        nextOrdinalBySegmentId.set(segmentId, ordinal);
        return {
          transcriptSegmentId: segmentId,
          type: learningPoint.type,
          expression: learningPoint.expression,
          englishExplanation: learningPoint.englishExplanation,
          turkishExplanation: learningPoint.turkishExplanation,
          exampleEn: learningPoint.exampleEn,
          exampleTr: learningPoint.exampleTr,
          ordinal,
        };
      });
      await tx.insert(transcriptSegmentLearningPointsTable).values(learningPointRows);
    }

    await publishVocabularyForVideo(tx, video.id, draft.vocabulary);

    const [quizRow] = await tx
      .insert(quizzesTable)
      .values({ question: draft.quiz.question, sourceTranscriptSegmentId: requireSegmentId(draft.quiz.segmentOrdinal) })
      .returning({ id: quizzesTable.id });
    if (!quizRow) {
      throw new PublishPipelineError("Quiz insert edilemedi.");
    }
    await tx.insert(quizOptionsTable).values(
      draft.quiz.options.map((option, index) => ({
        quizId: quizRow.id,
        text: option.text,
        isCorrect: option.isCorrect,
        position: index,
      })),
    );

    return { videoId: video.id };
  });
}

/**
 * Madde: DB transaction'ından ÖNCE çalışır (main() içinde) — kasıtlı sıralama:
 * dosya kopyalama başarısız olursa DB'ye HİÇBİR satır yazılmamış olur (bir
 * video satırı olup medya dosyası eksik kalması — 404 playbackUrl — DB satırı
 * olmadan diskte yetim bir dosya kalmasından daha kötü bir tutarsızlık, bkz.
 * resolve-playback-url.ts'in "bilinmeyen id'de patla" kararı).
 */
export function copyMediaFile(sourceFile: string, muxAssetId: string, mediaDir: string = MEDIA_DIR): string {
  const destination = resolveMediaDestination(muxAssetId, mediaDir);
  if (!fs.existsSync(sourceFile)) {
    throw new PublishPipelineError(
      `Kaynak video dosyası bulunamadı: "${sourceFile}" (enriched.json'daki sourceFile). Dosyayı elle "${destination}" konumuna kopyalayıp tekrar deneyin.`,
    );
  }
  if (fs.existsSync(destination)) {
    throw new PublishPipelineError(`"${destination}" zaten var — üzerine yazılmıyor (muxAssetId çakışması).`);
  }
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.copyFileSync(sourceFile, destination);
  return destination;
}

async function main(): Promise<void> {
  const { contentId, acknowledgeNeedsReview } = parseArgs(process.argv.slice(2));

  const draft = loadPublishDraft(contentId);

  const freshQuality = assertPassesQualityGate(draft, acknowledgeNeedsReview);
  if (freshQuality.status === "needsReview") {
    console.error(`UYARI: quality gate "needsReview" döndü, --acknowledge-needs-review ile publish ediliyor (${freshQuality.issues.length} issue).`);
  }

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new PublishPipelineError("DATABASE_URL tanımlı değil (.env dosyasını kontrol edin).");
  }
  const pool = new Pool({ connectionString: databaseUrl });
  const db = drizzle(pool);

  try {
    await assertNotAlreadyPublished(db, draft.muxAssetId);

    const mediaDestination = copyMediaFile(draft.sourceFile, draft.muxAssetId);
    console.error(`Medya dosyası kopyalandı: ${mediaDestination}`);

    const { videoId } = await publishContent(db, draft);
    console.error(`Publish tamamlandı: video id ${videoId} (muxAssetId: ${draft.muxAssetId})`);
    console.error(
      `  ${draft.segments.length} segment, ${draft.learningPoints.length} learning point, ${draft.vocabulary.length} vocabulary, 1 quiz`,
    );
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  main().catch((error: unknown) => {
    if (
      error instanceof PublishPipelineError ||
      error instanceof PublishAlreadyExistsError ||
      error instanceof PublishQualityRejectedError ||
      error instanceof PublishQualityNeedsReviewError
    ) {
      console.error(`\nHATA: ${error.message}`);
    } else {
      console.error("\nBEKLENMEYEN HATA:");
      console.error(error);
    }
    process.exit(1);
  });
}
