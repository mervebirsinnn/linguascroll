import { pgTable, primaryKey, timestamp, uuid } from "drizzle-orm/pg-core";
import { usersTable } from "../users/users.schema";
import { videoTranscriptSegmentsTable } from "../videos/transcript-segments.schema";
import { wordsTable } from "./words.schema";

/**
 * Current-state ilişki — "user_id şu an word_id'yi kaydetmiş mi" — bir historical
 * event log DEĞİL (video_watch_events/quiz_answer_events'in aksine). Bu ayrım,
 * her iki FK'nin de CASCADE olmasının gerekçesi:
 *
 * - user_id CASCADE: kullanıcı silinirse kendi "kaydettim" ilişkileri de silinsin
 *   (mevcut user_id CASCADE deseniyle tutarlı).
 * - word_id CASCADE: bir kelime küratörlük kararıyla silinirse, ona referans veren
 *   "kaydedilmiş" satırların kalıcı bir tarihsel/analitik değeri yok (quiz cevabının
 *   "o an doğru muydu" gerçeğinin aksine) — dangling bir referansı korumanın hiçbir
 *   faydası yok, üstelik NO ACTION seçilseydi yeterince kullanıcı kaydettikten sonra
 *   bir kelimeyi ASLA silememe gibi istenmeyen bir operasyonel kilide yol açardı.
 *
 * `nextReviewAt`/familiarityScore/reviewCount YOK (Chunk 9 kararı, Chunk 16'da
 * DOĞRULANDI) — bu satırın tahmin ettiği gibi, gerçek review-scheduling
 * geldiğinde bu alanlar BURAYA eklenmedi: ayrı bir append-only event log'da
 * (`word_review_events`, bkz. o dosya) yaşıyor, "due" durumu her seferinde o
 * log'dan hesaplanıyor — hiçbir türetilmiş/cache'lenmiş alan bu tabloya
 * girmedi.
 *
 * Chunk 16 — `sourceSegmentId` (NULLABLE): kelime bir altyazı içindeki vurgulu
 * kelimeye dokunularak kaydedildiyse (bkz. shared-types/save-word-request.ts),
 * o anki GERÇEK segment referansı. `ON DELETE SET NULL` — segment content-ops
 * tarafından silinirse (video/transcript güncellemesi), kaydedilen kelimenin
 * KENDİSİ etkilenmemeli, sadece context linki kaybolmalı (bilinçli: bu,
 * `video_words`'ün "yapısal ilişki" CASCADE kararından FARKLI — orada
 * kelime-video ilişkisinin kendisi anlamsızlaşıyordu, burada sadece bir
 * "nereden geldi" ipucu kayboluyor, saved-word'ün var olma sebebi değil).
 * `quizzes.sourceTranscriptSegmentId`'nin AYNI cross-feature FK precedent'i.
 */
export const userSavedWordsTable = pgTable(
  "user_saved_words",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    wordId: uuid("word_id")
      .notNull()
      .references(() => wordsTable.id, { onDelete: "cascade" }),
    savedAt: timestamp("saved_at", { withTimezone: true }).notNull().defaultNow(),
    sourceSegmentId: uuid("source_segment_id").references(() => videoTranscriptSegmentsTable.id, { onDelete: "set null" }),
  },
  (table) => [primaryKey({ columns: [table.userId, table.wordId] })],
);
