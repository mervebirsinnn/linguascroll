import { boolean, foreignKey, pgTable, timestamp, unique, uuid } from "drizzle-orm/pg-core";
import { usersTable } from "../users/users.schema";
import { passageOptionsTable } from "./passages.schema";

/**
 * Bir kullanıcının bir paragraf sorusuna VERDİĞİ TEK cevap (MVP: ilk cevap sabit, tekrar çözme yok).
 * quiz_answer_events'in bilinçli tersi: orada UNIQUE yok (aynı quiz tekrar cevaplanabiliyor), burada
 * `UNIQUE(user_id, question_id)` var — "ilk kabul edilen cevap kazanır" kuralı istemcide değil DB'de
 * zorlanır; ağ hatasıyla tekrarlanan istek ve eşzamanlı iki gönderim aynı tek satırla sonuçlanır.
 * Bu yüzden question_id şık üzerinden türetilmek yerine satırda DOĞRUDAN tutuluyor (UNIQUE için şart).
 *
 * Bileşik FK (question_id, option_id) → passage_options(question_id, id): "bu şık bu soruya ait"
 * garantisi DB'de. ON DELETE varsayılanı (NO ACTION) BİLİNÇLİ: cevaplanmış bir şık silinemez; esaslı
 * içerik düzeltmesi silme değil emeklilik + yeni id'lerle yeniden yayındır (quiz_answer_events kararıyla aynı).
 *
 * `is_correct` ANLIK GÖRÜNTÜ (server cevap anında hesaplar, client göndermez): şık sonradan düzeltilse bile
 * tarihsel sonuç bozulmaz; skorun tek doğruluk kaynağı budur.
 *
 * user_id CASCADE: hesap silinirse kişisel cevaplar da silinir.
 */
export const passageAnswersTable = pgTable(
  "passage_answers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    questionId: uuid("question_id").notNull(),
    optionId: uuid("option_id").notNull(),
    isCorrect: boolean("is_correct").notNull(),
    answeredAt: timestamp("answered_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    unique("passage_answers_user_question_unique").on(table.userId, table.questionId),
    foreignKey({
      name: "passage_answers_question_option_fk",
      columns: [table.questionId, table.optionId],
      foreignColumns: [passageOptionsTable.questionId, passageOptionsTable.id],
    }),
  ],
);
