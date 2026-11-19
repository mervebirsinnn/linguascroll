import { Inject, Injectable } from "@nestjs/common";
import { and, asc, eq, inArray, isNull, sql } from "drizzle-orm";
import { DRIZZLE_DB, type Database } from "../database/database.module";
import { userSavedWordsTable } from "../words/user-saved-words.schema";
import { wordsTable } from "../words/words.schema";
import { passageAnswersTable } from "./passage-answers.schema";
import type { PassageCursor } from "./passage-cursor";
import {
  passageOptionsTable,
  passageQuestionsTable,
  passagesTable,
  passageWordSpansTable,
  passageWordsTable,
} from "./passages.schema";

export type PassageRow = typeof passagesTable.$inferSelect;
export type PassageQuestionRow = typeof passageQuestionsTable.$inferSelect;
export type PassageOptionRow = typeof passageOptionsTable.$inferSelect;
export type PassageWordRow = { passageId: string; wordId: string; gloss: string; contextSentence: string };
export type PassageSpanRow = { id: string; passageId: string; paragraphIndex: number; start: number; end: number; wordId: string; surface: string; contextSentence: string | null };

export type QuestionAccessContext = { questionId: string; passageId: string; isFreeSample: boolean; retiredAt: Date | null };

/**
 * Okuma pratiği içeriğinin OKUMA tarafı (yazma/yayın sonraki PR). Servis N+1 yapmasın diye her metot bir SAYFANIN tüm
 * id'lerini tek sorguda alır (`WHERE id IN (...)`), metin/soru başına döngüyle sorgu YOK. Cevap yazımı
 * PassageAnswersRepository'de (ayrı aggregate); burada yalnız okuma.
 */
@Injectable()
export class PassagesRepository {
  constructor(@Inject(DRIZZLE_DB) private readonly db: Database) {}

  /**
   * Keyset sayfalama: `(sort_order, id)` artan, imleçten SONRAKİ `limit` satır. Emekli metinler (retired_at) hiç gelmez.
   * `(sort_order, id) > (?, ?)` satır karşılaştırması aynı sort_order değerli metinlerde atlama/tekrarı engeller (id tie-break).
   */
  async findActivePage(level: string, after: PassageCursor | null, limit: number): Promise<PassageRow[]> {
    const afterClause = after ? sql`(${passagesTable.sortOrder}, ${passagesTable.id}) > (${after.sortOrder}, ${after.id}::uuid)` : undefined;
    return this.db
      .select()
      .from(passagesTable)
      .where(and(eq(passagesTable.level, level), isNull(passagesTable.retiredAt), afterClause))
      .orderBy(asc(passagesTable.sortOrder), asc(passagesTable.id))
      .limit(limit);
  }

  async findQuestions(passageIds: readonly string[]): Promise<PassageQuestionRow[]> {
    if (passageIds.length === 0) return [];
    return this.db
      .select()
      .from(passageQuestionsTable)
      .where(inArray(passageQuestionsTable.passageId, [...passageIds]))
      .orderBy(asc(passageQuestionsTable.passageId), asc(passageQuestionsTable.position));
  }

  async findOptions(questionIds: readonly string[]): Promise<PassageOptionRow[]> {
    if (questionIds.length === 0) return [];
    return this.db
      .select()
      .from(passageOptionsTable)
      .where(inArray(passageOptionsTable.questionId, [...questionIds]))
      .orderBy(asc(passageOptionsTable.questionId), asc(passageOptionsTable.position));
  }

  /** Kelime anlamı `words.gloss`'tan (kelimeler yayın sırasında oluşturulur; kullanıcı dokunuşunda yeni satır açılmaz). */
  async findWords(passageIds: readonly string[]): Promise<PassageWordRow[]> {
    if (passageIds.length === 0) return [];
    return this.db
      .select({ passageId: passageWordsTable.passageId, wordId: passageWordsTable.wordId, gloss: wordsTable.gloss, contextSentence: passageWordsTable.contextSentence })
      .from(passageWordsTable)
      .innerJoin(wordsTable, eq(wordsTable.id, passageWordsTable.wordId))
      .where(inArray(passageWordsTable.passageId, [...passageIds]));
  }

  async findSpans(passageIds: readonly string[]): Promise<PassageSpanRow[]> {
    if (passageIds.length === 0) return [];
    return this.db
      .select({
        id: passageWordSpansTable.id,
        passageId: passageWordSpansTable.passageId,
        paragraphIndex: passageWordSpansTable.paragraphIndex,
        start: passageWordSpansTable.start,
        end: passageWordSpansTable.end,
        wordId: passageWordSpansTable.wordId,
        surface: passageWordSpansTable.surface,
        contextSentence: passageWordSpansTable.contextSentence,
      })
      .from(passageWordSpansTable)
      .where(inArray(passageWordSpansTable.passageId, [...passageIds]))
      .orderBy(asc(passageWordSpansTable.paragraphIndex), asc(passageWordSpansTable.start));
  }

  /** Bu kullanıcının bu sorulardaki SAKLANAN cevapları (yalnız kendisininki: user_id filtresi zorunlu). */
  async findUserAnswers(userId: string, questionIds: readonly string[]): Promise<Array<{ questionId: string; optionId: string; isCorrect: boolean }>> {
    if (questionIds.length === 0) return [];
    return this.db
      .select({ questionId: passageAnswersTable.questionId, optionId: passageAnswersTable.optionId, isCorrect: passageAnswersTable.isCorrect })
      .from(passageAnswersTable)
      .where(and(eq(passageAnswersTable.userId, userId), inArray(passageAnswersTable.questionId, [...questionIds])));
  }

  /**
   * Kullanıcının bu kelimelerden hangilerini kaydettiği. user_saved_words'e doğrudan okuma (quizzes→segments gibi
   * cross-feature referans precedent'i); WordsRepository'ye taşımak şimdilik gereksiz bir sınır olurdu.
   */
  async findSavedWordIds(userId: string, wordIds: readonly string[]): Promise<Set<string>> {
    if (wordIds.length === 0) return new Set();
    const rows = await this.db
      .select({ wordId: userSavedWordsTable.wordId })
      .from(userSavedWordsTable)
      .where(and(eq(userSavedWordsTable.userId, userId), inArray(userSavedWordsTable.wordId, [...wordIds])));
    return new Set(rows.map((row) => row.wordId));
  }

  /** answer endpoint'inin erişim/varlık kontrolü için: soru → metin bağlamı. Bilinmeyen soru → null. */
  async findQuestionAccessContext(questionId: string): Promise<QuestionAccessContext | null> {
    const [row] = await this.db
      .select({
        questionId: passageQuestionsTable.id,
        passageId: passagesTable.id,
        isFreeSample: passagesTable.isFreeSample,
        retiredAt: passagesTable.retiredAt,
      })
      .from(passageQuestionsTable)
      .innerJoin(passagesTable, eq(passagesTable.id, passageQuestionsTable.passageId))
      .where(eq(passageQuestionsTable.id, questionId))
      .limit(1);
    return row ?? null;
  }
}
