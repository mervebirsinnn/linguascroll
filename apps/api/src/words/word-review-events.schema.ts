import { boolean, index, pgTable, timestamp, uuid } from "drizzle-orm/pg-core";
import { usersTable } from "../users/users.schema";
import { wordsTable } from "./words.schema";

/**
 * Chunk 16 — append-only, dar amaçlı review-recall log. `quiz_answer_events`/
 * `video_watch_events` ile AYNI konvansiyon (bkz. o dosyaların yorumları):
 * exposure/attempt başına BİR satır, "current state" alanı YOK. Generic bir
 * "learning_events" tablosu DEĞİL — bu, review'a ÖZEL, üçüncü dar-amaçlı
 * event tablosu.
 *
 * `quiz_answer_events` ile KARIŞTIRILMAMALI: o içerik-comprehension'ı (bir
 * quiz_option seçimi) ölçüyor, bu ise saf memory-recall'ı (bir kelime/phrase'i
 * hatırlayıp hatırlamadığını, self-assessment ile) — kullanıcı kararı gereği
 * BİLİNÇLİ OLARAK ayrı tablolar, aynı event/table'a zorlanmadı.
 *
 * `nextReviewAt`/`intervalDays`/`consecutiveCorrect` gibi HİÇBİR türetilmiş/
 * cache'lenmiş alan YOK — "due" durumu HER SEFERİNDE bu event log'undan
 * hesaplanıyor (bkz. review-scheduling.ts), `PersonalizationRepository`'nin
 * affinity'yi `video_watch_events`'ten her seferinde hesaplamasıyla AYNI felsefe.
 *
 * `wordId` → CASCADE: kelime (curation kararıyla) silinirse, o kelimeye dair
 * review geçmişinin artık hiçbir anlamı kalmaz — `user_saved_words.word_id`
 * CASCADE kararıyla AYNI gerekçe (quiz_answer_events'in `selectedOptionId`
 * NO ACTION kararıyla KARIŞTIRILMAMALI: o, "cevap anındaki tarihsel gerçeği"
 * korumak için bilinçli olarak farklıydı — burada korunacak "tarihsel bir
 * gerçek" yok, sadece artık var olmayan bir kelimeye dair bir sayaç).
 */
export const wordReviewEventsTable = pgTable(
  "word_review_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    wordId: uuid("word_id")
      .notNull()
      .references(() => wordsTable.id, { onDelete: "cascade" }),
    isCorrect: boolean("is_correct").notNull(),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    // review-scheduling/selection'ın gerçek query pattern'i: WHERE user_id = ?
    // (bkz. WordReviewEventsRepository.findEventsForUser) — video_watch_events'teki
    // AYNI gerekçe (index'siz platform genelinde sequential scan).
    index("word_review_events_user_id_idx").on(table.userId),
  ],
);
