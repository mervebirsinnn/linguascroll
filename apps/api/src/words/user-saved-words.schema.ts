import { pgTable, primaryKey, timestamp, uuid } from "drizzle-orm/pg-core";
import { usersTable } from "../users/users.schema";
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
 * `nextReviewAt`/familiarityScore/reviewCount YOK (Chunk 9 kararı) — henüz bir
 * spaced-repetition/scheduling davranışı yokken bu alanları eklemek "önce state
 * model'i yaz, davranışı sonra uydur" hatası olurdu. Gerçek review-scheduling
 * geldiğinde ayrı bir domain concept (ör. user_word_progress) olarak, kendi
 * migration'ıyla yeniden tasarlanacak.
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
  },
  (table) => [primaryKey({ columns: [table.userId, table.wordId] })],
);
