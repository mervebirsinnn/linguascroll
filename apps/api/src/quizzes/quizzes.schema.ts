import { sql } from "drizzle-orm";
import { boolean, check, integer, pgTable, text, timestamp, unique, uniqueIndex, uuid } from "drizzle-orm/pg-core";

export const quizzesTable = pgTable("quizzes", {
  id: uuid("id").primaryKey().defaultRandom(),
  question: text("question").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/**
 * quiz_id → quizzes.id FK'si CASCADE ile: bir quiz silinirse sahipsiz option
 * kalması gerçek bir bütünlük bozukluğu olurdu, bunun için meşru bir sebep yok.
 *
 * UNIQUE(quiz_id, position): iki option'ın aynı pozisyonu paylaşması tanımsız
 * bir sıralama demek — "imkansız durum" kategorisinde, DB'nin işi.
 *
 * Partial unique index (quiz_id WHERE is_correct=true): DB seviyesinde "EN FAZLA
 * bir doğru cevap" garantisi. "TAM OLARAK bir" değil — "en az bir" kısmı,
 * geçici olarak sıfır doğru cevaplı bir quiz'in (örn. içerik düzenleme sırasında)
 * meşru bir ara-hal olabilmesi yüzünden bilinçli olarak DB'de zorlanmıyor;
 * "tam olarak bir" invariant'ı apps/api/src/quizzes/quiz.ts'te runtime'da
 * doğrulanıyor.
 */
export const quizOptionsTable = pgTable(
  "quiz_options",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    quizId: uuid("quiz_id")
      .notNull()
      .references(() => quizzesTable.id, { onDelete: "cascade" }),
    text: text("text").notNull(),
    isCorrect: boolean("is_correct").notNull(),
    position: integer("position").notNull(),
  },
  (table) => [
    unique("quiz_options_position_unique").on(table.quizId, table.position),
    check("quiz_options_position_non_negative_check", sql`${table.position} >= 0`),
    uniqueIndex("quiz_options_one_correct_per_quiz").on(table.quizId).where(sql`${table.isCorrect} = true`),
  ],
);
