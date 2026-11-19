import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { wordsTable } from "../words/words.schema";
import { passageOptionsTable, passageQuestionsTable, passagesTable, passageWordSpansTable, passageWordsTable } from "./passages.schema";

/**
 * Passages testleri (e2e + integration) için TEK, dar amaçlı veri hazırlama yardımcısı (test-database.ts ile aynı
 * "generic test framework DEĞİL" yaklaşımı). Her metin: 1 paragraf, 4 soru x 4 şık, 1 kelime (iki geçiş + bir ifade yok).
 * Doğru şık konumu soruya göre dönüşümlü (position % 4) — testler konuma bağımlı olmasın diye `correctOptionId` döner.
 */
export const FIXTURE_PARAGRAPH = "A cat sat. The cat left.";
export const FIXTURE_GLOSS = "kedi (test anlamı)";
export const EXPLANATION_PREFIX = "GİZLİ-AÇIKLAMA";

export type PassageFixture = {
  passageId: string;
  wordId: string;
  /** Aynı kelimenin iki geçişi: [0] = "A cat sat." cümlesindeki, [1] = "The cat left." cümlesindeki. */
  spanIds: [string, string];
  questions: Array<{ questionId: string; correctOptionId: string; wrongOptionId: string; optionIds: string[] }>;
};

export async function createPassageFixture(
  db: NodePgDatabase,
  params: { slug: string; level?: string; sortOrder?: number; isFreeSample?: boolean; retired?: boolean },
): Promise<PassageFixture> {
  const [passage] = await db
    .insert(passagesTable)
    .values({
      slug: params.slug,
      level: params.level ?? "B2",
      title: `Başlık ${params.slug}`,
      topic: "Konu",
      paragraphs: [FIXTURE_PARAGRAPH],
      sortOrder: params.sortOrder ?? 1,
      isFreeSample: params.isFreeSample ?? false,
      contentHash: `hash-${params.slug}`,
      retiredAt: params.retired ? new Date() : null,
    })
    .returning();
  if (!passage) throw new Error("Passage eklenemedi");

  const [word] = await db.insert(wordsTable).values({ language: "en", lemma: "cat", gloss: FIXTURE_GLOSS }).returning();
  if (!word) throw new Error("Kelime eklenemedi");
  await db.insert(passageWordsTable).values({ passageId: passage.id, wordId: word.id, contextSentence: "A cat sat." });
  // "A cat sat. The cat left." → ilk "cat" [2,5), ikinci "cat" [15,18) (tekrar eden kelime: iki ayrı span).
  const spans = await db
    .insert(passageWordSpansTable)
    .values([
      { passageId: passage.id, paragraphIndex: 0, start: 2, end: 5, wordId: word.id, surface: "cat", contextSentence: "A cat sat." },
      { passageId: passage.id, paragraphIndex: 0, start: 15, end: 18, wordId: word.id, surface: "cat", contextSentence: "The cat left." },
    ])
    .returning({ id: passageWordSpansTable.id, start: passageWordSpansTable.start });
  const [firstSpan, secondSpan] = [...spans].sort((a, b) => a.start - b.start);
  if (!firstSpan || !secondSpan) throw new Error("Span'lar eklenemedi");

  const questions: PassageFixture["questions"] = [];
  for (const position of [1, 2, 3, 4]) {
    const [question] = await db
      .insert(passageQuestionsTable)
      .values({ passageId: passage.id, key: `q${position}`, position, type: "detail", prompt: `Soru ${position}?` })
      .returning();
    if (!question) throw new Error("Soru eklenemedi");
    const correctIndex = position % 4;
    const options = await db
      .insert(passageOptionsTable)
      .values(
        [0, 1, 2, 3].map((index) => ({
          questionId: question.id,
          key: `o${index}`,
          position: index,
          text: `Şık ${position}-${index}`,
          isCorrect: index === correctIndex,
          trapType: index === correctIndex ? null : "copy",
          explanation: `${EXPLANATION_PREFIX} ${position}-${index}`,
        })),
      )
      .returning();
    const correct = options.find((option) => option.isCorrect);
    const wrong = options.find((option) => !option.isCorrect);
    if (!correct || !wrong) throw new Error("Şıklar eksik");
    questions.push({ questionId: question.id, correctOptionId: correct.id, wrongOptionId: wrong.id, optionIds: options.map((option) => option.id) });
  }

  return { passageId: passage.id, wordId: word.id, spanIds: [firstSpan.id, secondSpan.id], questions };
}
