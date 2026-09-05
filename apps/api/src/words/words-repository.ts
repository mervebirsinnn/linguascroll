import { Inject, Injectable } from "@nestjs/common";
import { wordSchema, type Word } from "@linguascroll/shared-types";
import { and, eq, inArray } from "drizzle-orm";
import { DRIZZLE_DB, type Database } from "../database/database.module";
import { videoWordsTable } from "./video-words.schema";
import { userSavedWordsTable } from "./user-saved-words.schema";
import { wordsTable } from "./words.schema";

type WordRow = typeof wordsTable.$inferSelect;

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
   */
  async saveWord(userId: string, wordId: string): Promise<void> {
    await this.db
      .insert(userSavedWordsTable)
      .values({ userId, wordId })
      .onConflictDoNothing({ target: [userSavedWordsTable.userId, userSavedWordsTable.wordId] });
  }

  /** Idempotent by construction: var olmayan bir (user,word) çiftini silmek 0-row-affected, hatasız. */
  async unsaveWord(userId: string, wordId: string): Promise<void> {
    await this.db
      .delete(userSavedWordsTable)
      .where(and(eq(userSavedWordsTable.userId, userId), eq(userSavedWordsTable.wordId, wordId)));
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
