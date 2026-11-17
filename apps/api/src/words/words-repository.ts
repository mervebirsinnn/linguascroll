import { Inject, Injectable } from "@nestjs/common";
import { wordSchema, type Word } from "@linguascroll/shared-types";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { DRIZZLE_DB, type Database } from "../database/database.module";
import { passagesTable, passageWordsTable } from "../passages/passages.schema";
import { videoTranscriptSegmentsTable } from "../videos/transcript-segments.schema";
import { videosTable } from "../videos/videos.schema";
import { segmentWordGlossesTable } from "./segment-word-glosses.schema";
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

  /** Anlam istemciden alınmaz: offline segment verisinden çözülür, kayıt/review'a bağlanır. */
  // 2026-11-17 — `created`: user_saved_words eklemesi satır döndürdüyse true (yeni kayıt), ON CONFLICT ile
  // atlandıysa false. saveWord'deki gerekçenin aynısı (bkz. aşağı); segment satırındaki FOR UPDATE kilidi
  // aynı segment üzerinden gelen paralel kayıtları ayrıca sıralar.
  async saveSegmentGloss(userId: string, segmentId: string, lemma: string): Promise<{ word: Word; created: boolean } | null> {
    return this.db.transaction(async (tx) => {
      const [segment] = await tx.select({ language: videosTable.learningLanguage })
        .from(videoTranscriptSegmentsTable).innerJoin(videosTable, eq(videosTable.id, videoTranscriptSegmentsTable.videoId))
        .where(eq(videoTranscriptSegmentsTable.id, segmentId)).for("update", { of: videoTranscriptSegmentsTable });
      if (!segment) return null;
      const [entry] = await tx.select({ gloss: segmentWordGlossesTable.gloss }).from(segmentWordGlossesTable)
        .where(and(eq(segmentWordGlossesTable.segmentId, segmentId), eq(segmentWordGlossesTable.word, lemma)));
      if (!entry) return null;
      const [existing] = await tx.select().from(wordsTable).where(and(eq(wordsTable.language, segment.language), eq(wordsTable.lemma, lemma), eq(wordsTable.gloss, entry.gloss))).orderBy(wordsTable.id).limit(1);
      const word = existing ?? (await tx.insert(wordsTable).values({ language: segment.language, lemma, gloss: entry.gloss }).returning())[0]!;
      const inserted = await tx.insert(userSavedWordsTable).values({ userId, wordId: word.id, sourceSegmentId: segmentId }).onConflictDoNothing().returning({ wordId: userSavedWordsTable.wordId });
      return { word: toWord(word), created: inserted.length === 1 };
    });
  }

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
   *
   * 2026-11-17 — Loopi: `created` DB'nin kendi ekleme sonucundan geliyor (`RETURNING`: çakışmada 0 satır).
   * "Önce var mı diye SELECT, sonra INSERT" seçilmedi: iki paralel istek ikisi de "yok" görüp ikisi de
   * created:true dönerdi. ON CONFLICT aynı (user, word) için yalnız BİR isteğe satır döndürür — ek kilit
   * gerekmez.
   */
  async saveWord(
    userId: string,
    wordId: string,
    sourceSegmentId: string | null = null,
    sourcePassageId: string | null = null,
  ): Promise<{ created: boolean }> {
    const inserted = await this.db
      .insert(userSavedWordsTable)
      .values({ userId, wordId, sourceSegmentId, sourcePassageId })
      .onConflictDoNothing({ target: [userSavedWordsTable.userId, userSavedWordsTable.wordId] })
      .returning({ wordId: userSavedWordsTable.wordId });
    return { created: inserted.length === 1 };
  }

  /**
   * Okuma pratiği — `sourcePassageId` doğrulaması için TEK sorgu: metin var mı, emekli mi, ücretsiz örnek mi ve bu
   * kelime GERÇEKTEN bu metnin kelimelerinden mi (`passage_words`). Metin yoksa null; kelime metinde yoksa
   * `containsWord: false`. HTTP kararı (400/403) WordsService'te; burada yalnız olgular.
   */
  async findPassageWordAccess(
    passageId: string,
    wordId: string,
  ): Promise<{ isFreeSample: boolean; retired: boolean; containsWord: boolean } | null> {
    const [row] = await this.db
      .select({ isFreeSample: passagesTable.isFreeSample, retiredAt: passagesTable.retiredAt, linkedWordId: passageWordsTable.wordId })
      .from(passagesTable)
      .leftJoin(passageWordsTable, and(eq(passageWordsTable.passageId, passagesTable.id), eq(passageWordsTable.wordId, wordId)))
      .where(eq(passagesTable.id, passageId))
      .limit(1);
    return row ? { isFreeSample: row.isFreeSample, retired: row.retiredAt !== null, containsWord: row.linkedWordId !== null } : null;
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
        // Okuma pratiği: altyazı kaynağı varsa o, yoksa metindeki ilk geçtiği cümle (passage_words.context_sentence).
        // İki kaynak birbirini dışlar (CHECK), COALESCE hangisinin dolu olduğuna göre tek değer verir.
        sourceSentence: sql<string | null>`coalesce(${videoTranscriptSegmentsTable.text}, ${passageWordsTable.contextSentence})`,
      })
      .from(userSavedWordsTable)
      .innerJoin(wordsTable, eq(wordsTable.id, userSavedWordsTable.wordId))
      .leftJoin(videoTranscriptSegmentsTable, eq(videoTranscriptSegmentsTable.id, userSavedWordsTable.sourceSegmentId))
      .leftJoin(
        passageWordsTable,
        and(eq(passageWordsTable.passageId, userSavedWordsTable.sourcePassageId), eq(passageWordsTable.wordId, userSavedWordsTable.wordId)),
      )
      .where(eq(userSavedWordsTable.userId, userId))
      // En yeni kayıt ilk (sözleşme + test). ORDER BY OLMADAN sıra fiziksel satır/plan sırasına bağlıydı (flaky); eşit savedAt için
      // word id ikincil anahtarı sırayı deterministik yapar.
      .orderBy(desc(userSavedWordsTable.savedAt), desc(wordsTable.id));

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
