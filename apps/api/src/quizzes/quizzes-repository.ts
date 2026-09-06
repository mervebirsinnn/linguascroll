import { Inject, Injectable } from "@nestjs/common";
import { eq, inArray } from "drizzle-orm";
import { DRIZZLE_DB, type Database } from "../database/database.module";
import { videoTranscriptSegmentsTable } from "../videos/transcript-segments.schema";
import { quizSchema, type Quiz } from "./quiz";
import { quizOptionsTable, quizzesTable } from "./quizzes.schema";

type QuizOptionRow = {
  quizId: string;
  question: string;
  sourceSegmentId: string;
  optionId: string;
  optionText: string;
  isCorrect: boolean;
  position: number;
};

const QUIZ_OPTION_ROW_COLUMNS = {
  quizId: quizzesTable.id,
  question: quizzesTable.question,
  sourceSegmentId: quizzesTable.sourceTranscriptSegmentId,
  optionId: quizOptionsTable.id,
  optionText: quizOptionsTable.text,
  isCorrect: quizOptionsTable.isCorrect,
  position: quizOptionsTable.position,
};

/**
 * Persistence katmanı: sadece DB row → domain Quiz projeksiyonunu bilir.
 * FeedQuiz'i, HTTP'yi, controller'ı BİLMEZ — bunlar QuizzesService'in işi.
 */
@Injectable()
export class QuizzesRepository {
  constructor(@Inject(DRIZZLE_DB) private readonly db: Database) {}

  async findQuizById(quizId: string): Promise<Quiz | null> {
    const rows = await this.db
      .select(QUIZ_OPTION_ROW_COLUMNS)
      .from(quizzesTable)
      .innerJoin(quizOptionsTable, eq(quizOptionsTable.quizId, quizzesTable.id))
      .where(eq(quizzesTable.id, quizId))
      .orderBy(quizOptionsTable.position);

    const [quiz] = groupRowsIntoQuizzes(rows);
    return quiz ?? null;
  }

  /**
   * Chunk 8 — frozen feed-plan pagination'ın bir sayfasındaki quiz ref'lerini TEK
   * bir `WHERE quiz_id IN (...)` sorgusuyla çözer (N+1 önlemi). Sonuç sırası
   * `quizIds`'in sırasıyla aynı olmak zorunda değil — FeedService kendi frozen
   * sırasına göre yeniden diziyor. Silinmiş bir quiz sonuçta sessizce eksik kalır.
   */
  async findQuizzesByIds(quizIds: string[]): Promise<Quiz[]> {
    if (quizIds.length === 0) {
      return [];
    }
    const rows = await this.db
      .select(QUIZ_OPTION_ROW_COLUMNS)
      .from(quizzesTable)
      .innerJoin(quizOptionsTable, eq(quizOptionsTable.quizId, quizzesTable.id))
      .where(inArray(quizzesTable.id, quizIds))
      .orderBy(quizzesTable.id, quizOptionsTable.position);
    return groupRowsIntoQuizzes(rows);
  }

  /**
   * Chunk 10 — feed composition-time (startSession) ihtiyacı: bu session'ın
   * ranklandığı video id'leri için "hangi quiz hangi videodan geliyor" bilgisi,
   * TEK bir sorguda (quizzes JOIN quiz_options JOIN video_transcript_segments,
   * WHERE segments.video_id IN (...)) — id başına ayrı sorgu YOK. Dönüş,
   * `{videoId, quiz}` çiftleri: quiz'i HANGİ videoya gruplayacağı (Map'e
   * çevirme) FeedService/QuizzesService'in işi, repository sadece ham
   * eşleşmeyi taşıyor.
   *
   * `source_video_id` DB'de YOK (bkz. quizzes.schema.ts) — video_id burada
   * segment JOIN'i üzerinden türetiliyor, quiz'in kendisinde hiç depolanmıyor.
   */
  async findQuizzesForVideos(videoIds: string[]): Promise<{ videoId: string; quiz: Quiz }[]> {
    if (videoIds.length === 0) {
      return [];
    }
    const rows = await this.db
      .select({ ...QUIZ_OPTION_ROW_COLUMNS, videoId: videoTranscriptSegmentsTable.videoId })
      .from(quizzesTable)
      .innerJoin(quizOptionsTable, eq(quizOptionsTable.quizId, quizzesTable.id))
      .innerJoin(videoTranscriptSegmentsTable, eq(videoTranscriptSegmentsTable.id, quizzesTable.sourceTranscriptSegmentId))
      .where(inArray(videoTranscriptSegmentsTable.videoId, videoIds))
      .orderBy(quizzesTable.id, quizOptionsTable.position);

    const videoIdByQuizId = new Map<string, string>();
    for (const row of rows) {
      videoIdByQuizId.set(row.quizId, row.videoId);
    }

    return groupRowsIntoQuizzes(rows).map((quiz) => ({
      videoId: videoIdByQuizId.get(quiz.id)!,
      quiz,
    }));
  }
}

/**
 * Satırları quiz_id'ye göre gruplar, option'ları position'a göre sıralar (SQL'in
 * ORDER BY'ına ek olarak, elle bir güvence daha) ve her grubu quizSchema.parse()
 * ile doğrular — bu, "tam olarak bir doğru cevap" invariant'ının fiilen
 * çalıştığı yer.
 */
function groupRowsIntoQuizzes(rows: QuizOptionRow[]): Quiz[] {
  type GroupedQuiz = {
    id: string;
    question: string;
    sourceSegmentId: string;
    options: { id: string; text: string; isCorrect: boolean; position: number }[];
  };
  const quizzesById = new Map<string, GroupedQuiz>();

  for (const row of rows) {
    let quiz = quizzesById.get(row.quizId);
    if (!quiz) {
      quiz = { id: row.quizId, question: row.question, sourceSegmentId: row.sourceSegmentId, options: [] };
      quizzesById.set(row.quizId, quiz);
    }
    quiz.options.push({ id: row.optionId, text: row.optionText, isCorrect: row.isCorrect, position: row.position });
  }

  return Array.from(quizzesById.values()).map((quiz) => {
    const orderedOptions = [...quiz.options]
      .sort((a, b) => a.position - b.position)
      .map(({ id, text, isCorrect }) => ({ id, text, isCorrect }));
    return quizSchema.parse({
      id: quiz.id,
      question: quiz.question,
      sourceSegmentId: quiz.sourceSegmentId,
      options: orderedOptions,
    });
  });
}
