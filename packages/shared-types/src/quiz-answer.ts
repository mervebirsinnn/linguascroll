import { z } from "zod";

export const answerQuizRequestSchema = z.object({
  optionId: z.string().uuid(),
  // 2026-10-27 — `userId` KALDIRILDI: kimlik istemcinin gönderdiği bir alan değil, backend'in
  // doğruladığı Firebase token'ından çözülüyor (bkz. apps/api auth/firebase-auth.guard.ts).
  // isCorrect BİLEREK burada yok: server, doğruluğu kendi hesaplıyor (bkz.
  // QuizzesService.answerQuiz), client'tan asla kabul etmiyor.
});
export type AnswerQuizRequest = z.infer<typeof answerQuizRequestSchema>;

export const answerQuizResponseSchema = z.object({
  correct: z.boolean(),
  correctOptionId: z.string().uuid(),
});
export type AnswerQuizResponse = z.infer<typeof answerQuizResponseSchema>;
