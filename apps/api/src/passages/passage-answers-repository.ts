import { Inject, Injectable } from "@nestjs/common";
import { and, eq } from "drizzle-orm";
import { DRIZZLE_DB, type Database } from "../database/database.module";
import { passageAnswersTable } from "./passage-answers.schema";
import { passageOptionsTable } from "./passages.schema";

export type StoredPassageAnswer = {
  questionId: string;
  optionId: string;
  isCorrect: boolean;
  answeredAt: Date;
};

export type RecordPassageAnswerResult =
  | { status: "recorded"; answer: StoredPassageAnswer }
  // Bu kullanıcı bu soruyu daha önce cevaplamıştı: ilk cevap kazanır, gelen şık YOK sayılır ve saklanan satır döner.
  | { status: "existing"; answer: StoredPassageAnswer }
  // `optionId`, `questionId`'ye ait bir şık değil (servis bunu 400'e çevirir).
  | { status: "invalid-option" };

/**
 * passages içerik aggregate'inden ayrı bir aggregate (QuizAnswerEventsRepository ile aynı ayrım).
 *
 * Eşzamanlılık: doğruluk burada, cevap anında şıktan okunur (client göndermez) ve `(user_id, question_id)`
 * UNIQUE'ine karşı `ON CONFLICT DO NOTHING` ile yazılır. Çakışmada Postgres diğer işlemin commit'ini bekler,
 * sonra insert'i atlar; ardından yapılan SELECT o commit edilmiş satırı görür. Bu yüzden eşzamanlı iki
 * gönderim de, ağ hatasıyla tekrarlanan istek de aynı tek satırı döndürür — ayrı bir transaction'a gerek yok.
 */
@Injectable()
export class PassageAnswersRepository {
  constructor(@Inject(DRIZZLE_DB) private readonly db: Database) {}

  async record(params: { userId: string; questionId: string; optionId: string }): Promise<RecordPassageAnswerResult> {
    const { userId, questionId, optionId } = params;

    const [option] = await this.db
      .select({ isCorrect: passageOptionsTable.isCorrect })
      .from(passageOptionsTable)
      .where(and(eq(passageOptionsTable.id, optionId), eq(passageOptionsTable.questionId, questionId)))
      .limit(1);
    if (!option) {
      return { status: "invalid-option" };
    }

    const [inserted] = await this.db
      .insert(passageAnswersTable)
      .values({ userId, questionId, optionId, isCorrect: option.isCorrect })
      .onConflictDoNothing({ target: [passageAnswersTable.userId, passageAnswersTable.questionId] })
      .returning();
    if (inserted) {
      return { status: "recorded", answer: toStoredAnswer(inserted) };
    }

    const [existing] = await this.db
      .select()
      .from(passageAnswersTable)
      .where(and(eq(passageAnswersTable.userId, userId), eq(passageAnswersTable.questionId, questionId)))
      .limit(1);
    if (!existing) {
      // Çakışma vardı ama satır yok: arada hesap silinmiş olabilir. Sessizce başarı dönmek yerine açıkça patlıyoruz.
      throw new Error(`Cevap çakışması çözümlenemedi: user "${userId}", soru "${questionId}"`);
    }
    return { status: "existing", answer: toStoredAnswer(existing) };
  }
}

function toStoredAnswer(row: typeof passageAnswersTable.$inferSelect): StoredPassageAnswer {
  return { questionId: row.questionId, optionId: row.optionId, isCorrect: row.isCorrect, answeredAt: row.answeredAt };
}
