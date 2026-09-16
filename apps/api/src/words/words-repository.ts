import { Inject, Injectable } from "@nestjs/common";
import { wordSchema, type Word } from "@linguascroll/shared-types";
import { and, eq, inArray, sql } from "drizzle-orm";
import { DRIZZLE_DB, type Database } from "../database/database.module";
import { videoTranscriptSegmentsTable } from "../videos/transcript-segments.schema";
import { videoWordsTable } from "./video-words.schema";
import { userSavedWordsTable } from "./user-saved-words.schema";
import { wordsTable } from "./words.schema";

type WordRow = typeof wordsTable.$inferSelect;

export type SavedWordRow = { word: Word; savedAt: Date; sourceSentence: string | null };

/**
 * Persistence katmanı: sadece DB row → domain Word projeksiyonunu ve
 * video_words/user_saved_words join'lerini bilir. HTTP exception üretmiyor —
 * bu WordsService'in işi.
 */
@Injectable()
export class WordsRepository {
  constructor(@Inject(DRIZZLE_DB) private readonly db: Database) {}

  async findWordById(wordId: string): Promise<Word | null> {
    const [row] = await this.db.select().from(wordsTable).where(eq(wordsTable.id, wordId));
    return row ? toWord(row) : null;
  }

  /**
   * Idempotent: `ON CONFLICT DO NOTHING` — çift PUT/POST (double-tap) composite
   * PK ihlali nedeniyle 500 üretmiyor, sessizce no-op. Application-level lock/
   * transaction gerekmiyor, Postgres'in kendi atomik constraint çözümü yeterli.
   *
   * Chunk 16 — `sourceSegmentId` (opsiyonel, null varsayılan): ON CONFLICT
   * durumunda (kelime zaten kayıtlıysa) GÜNCELLENMİYOR — ilk save'in context'i
   * kazanır. Bu bilinçli: UI zaten kayıtlı bir kelime için "Kaydet" göstermiyor
   * (bkz. mobile isWordSaved), bu yüzden ikinci bir save çağrısı pratikte
   * neredeyse hiç olmaz; olsa bile mevcut context'i sessizce EZMEMEK daha güvenli.
   */
  async saveWord(userId: string, wordId: string, sourceSegmentId: string | null = null): Promise<void> {
    await this.db
      .insert(userSavedWordsTable)
      .values({ userId, wordId, sourceSegmentId })
      .onConflictDoNothing({ target: [userSavedWordsTable.userId, userSavedWordsTable.wordId] });
  }

  /** Idempotent by construction: var olmayan bir (user,word) çiftini silmek 0-row-affected, hatasız. */
  async unsaveWord(userId: string, wordId: string): Promise<void> {
    await this.db
      .delete(userSavedWordsTable)
      .where(and(eq(userSavedWordsTable.userId, userId), eq(userSavedWordsTable.wordId, wordId)));
  }

  /**
   * Chunk 16, madde 9 — `sourceSegmentId` verilmişse, GERÇEKTEN bu kelimenin
   * bu segment'in videosuyla ilişkili olup olmadığını doğrular (segment'in
   * video'sunun `video_words`'te bu `wordId`'yi taşıyıp taşımadığı) — tahmini
   * bir kontrol DEĞİL, mevcut ilişkiyle düşük maliyetli, güvenilir bir JOIN.
   */
  async isSegmentConsistentWithWord(segmentId: string, wordId: string): Promise<boolean> {
    const [row] = await this.db
      .select({ one: sql<number>`1` })
      .from(videoTranscriptSegmentsTable)
      .innerJoin(
        videoWordsTable,
        and(eq(videoWordsTable.videoId, videoTranscriptSegmentsTable.videoId), eq(videoWordsTable.wordId, wordId)),
      )
      .where(eq(videoTranscriptSegmentsTable.id, segmentId));
    return row !== undefined;
  }

  /**
   * Memory ekranı + review session'ının TEK ortak kaynağı — `word_review_events`
   * BİLMİYOR (bu, WordsService'in görevi: bu satırları review-scheduling ile
   * birleştirmek). `sourceSentence`: `source_segment_id` NULL'sa (context hiç
   * kaydedilmemiş VEYA segment SONRADAN silinip `ON DELETE SET NULL` tetiklenmiş)
   * LEFT JOIN doğal olarak NULL döner — tahmini bir fallback YOK.
   */
  async findSavedWordsForUser(userId: string): Promise<SavedWordRow[]> {
    const rows = await this.db
      .select({
        id: wordsTable.id,
        language: wordsTable.language,
        lemma: wordsTable.lemma,
        gloss: wordsTable.gloss,
        savedAt: userSavedWordsTable.savedAt,
        sourceSentence: videoTranscriptSegmentsTable.text,
      })
      .from(userSavedWordsTable)
      .innerJoin(wordsTable, eq(wordsTable.id, userSavedWordsTable.wordId))
      .leftJoin(videoTranscriptSegmentsTable, eq(videoTranscriptSegmentsTable.id, userSavedWordsTable.sourceSegmentId))
      .where(eq(userSavedWordsTable.userId, userId));

    return rows.map((row) => ({
      word: wordSchema.parse({ id: row.id, language: row.language, lemma: row.lemma, gloss: row.gloss }),
      savedAt: row.savedAt,
      sourceSentence: row.sourceSentence,
    }));
  }

  /** Progress aggregate — `WordReviewEventsRepository.getReviewCounts`'un AYNI "tek sorgu, FILTER ile since" deseni. */
  async getSavedWordCounts(userId: string, since: Date): Promise<{ total: number; sinceCount: number }> {
    const [row] = await this.db
      .select({
        total: sql<number>`COUNT(*)`,
        sinceCount: sql<number>`COUNT(*) FILTER (WHERE ${userSavedWordsTable.savedAt} >= ${since})`,
      })
      .from(userSavedWordsTable)
      .where(eq(userSavedWordsTable.userId, userId));

    return { total: Number(row?.total ?? 0), sinceCount: Number(row?.sinceCount ?? 0) };
  }

  /**
   * Chunk 9 — bir feed sayfasındaki video id'leri için TEK bir sorguda hem
   * "bu videolar hangi kelimeleri öğretiyor" (video_words JOIN words) hem
   * "BU kullanıcı hangisini kaydetmiş" (LEFT JOIN user_saved_words, sadece bu
   * userId için) bilgisini batch olarak çözer — id başına ayrı sorgu YOK.
   *
   * Kelime sırası SQL'in kendisinde deterministic (`ORDER BY lemma, id`) —
   * uygulama katmanında yeniden sıralamaya gerek yok. Video-yönü gruplaması
   * WordsService'te (Map<videoId, ...>) yapılıyor — `videoIds`'in girdi sırası
   * bu yüzden önemsiz.
   */
  async findVocabularyForVideos(
    videoIds: string[],
    userId: string,
  ): Promise<{ videoId: string; word: Word; saved: boolean }[]> {
    if (videoIds.length === 0) {
      return [];
    }

    const rows = await this.db
      .select({
        videoId: videoWordsTable.videoId,
        id: wordsTable.id,
        language: wordsTable.language,
        lemma: wordsTable.lemma,
        gloss: wordsTable.gloss,
        savedByUserId: userSavedWordsTable.userId,
      })
      .from(videoWordsTable)
      .innerJoin(wordsTable, eq(wordsTable.id, videoWordsTable.wordId))
      .leftJoin(
        userSavedWordsTable,
        and(eq(userSavedWordsTable.wordId, wordsTable.id), eq(userSavedWordsTable.userId, userId)),
      )
      .where(inArray(videoWordsTable.videoId, videoIds))
      .orderBy(wordsTable.lemma, wordsTable.id);

    return rows.map((row) => ({
      videoId: row.videoId,
      word: wordSchema.parse({ id: row.id, language: row.language, lemma: row.lemma, gloss: row.gloss }),
      saved: row.savedByUserId !== null,
    }));
  }
}

/** DB row → Word: `createdAt` domain contract'ın parçası değil (videos.schema.ts'teki aynı kararla tutarlı). */
function toWord(row: WordRow): Word {
  const { createdAt: _createdAt, ...rest } = row;
  return wordSchema.parse(rest);
}
