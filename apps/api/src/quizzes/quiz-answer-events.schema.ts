import { boolean, pgTable, timestamp, uuid } from "drizzle-orm/pg-core";
import { usersTable } from "../users/users.schema";
import { quizOptionsTable } from "./quizzes.schema";

/**
 * quiz_id BİLEREK burada YOK — redundant: quiz_options.quiz_id üzerinden zaten
 * türetilebilir (quiz_answer_events → quiz_options → quizzes). isCorrect ise
 * redundant DEĞİL — bu, cevap anında server'ın hesapladığı historical bir sonuç
 * (bkz. QuizzesService.answerQuiz): quiz_options.is_correct ileride değişirse
 * (örn. içerik düzeltmesi) bu satırın o anki gerçeği bozulmamalı.
 *
 * UNIQUE(user_id, ...) BİLİNÇLİ OLARAK YOK: FeedService şu an quiz'leri
 * per-user exclusion olmadan seçiyor (bkz. feed.service.ts), yani aynı
 * kullanıcının aynı quiz'i farklı bir session'da tekrar cevaplaması normal bir
 * durum — bunu "duplicate" sayıp engellemek yanlış olurdu.
 *
 * user_id → ON DELETE CASCADE: kullanıcı silinirse kendi event'leri de silinsin
 * (doğru davranış). selected_option_id → ON DELETE CASCADE DEĞİL (Chunk 7
 * düzeltmesi): bir quiz_option silinirse, "isCorrect'in o anki tarihsel gerçeği
 * bozulmamalı" yorumu CASCADE ile çelişirdi — option silinirken bu satırların da
 * sessizce silinmesi tam olarak korumak istediğimiz veriyi yok ederdi. Varsayılan
 * (NO ACTION): cevaplanmış bir option, kendisine event'i varken silinemez.
 */
export const quizAnswerEventsTable = pgTable("quiz_answer_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  selectedOptionId: uuid("selected_option_id")
    .notNull()
    .references(() => quizOptionsTable.id),
  isCorrect: boolean("is_correct").notNull(),
  answeredAt: timestamp("answered_at", { withTimezone: true }).notNull().defaultNow(),
});
