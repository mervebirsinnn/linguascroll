import { z } from "zod";

export const answerQuizRequestSchema = z.object({
  optionId: z.string().uuid(),
  // Auth henüz yok — anonymous identity, mobile'ın body'de taşıdığı bu alan.
  // isCorrect BİLEREK burada yok: server, doğruluğu kendi hesaplıyor (bkz.
  // QuizzesService.answerQuiz), client'tan asla kabul etmiyor.
  userId: z.string().uuid(),
});
export type AnswerQuizRequest = z.infer<typeof answerQuizRequestSchema>;

export const answerQuizResponseSchema = z.object({
  correct: z.boolean(),
  correctOptionId: z.string().uuid(),
});
export type AnswerQuizResponse = z.infer<typeof answerQuizResponseSchema>;
