import { z } from "zod";

/** POST /words/:wordId/review body contract'ı — `answerQuizRequestSchema` ile AYNI desen. */
export const recordWordReviewRequestSchema = z.object({
  // 2026-10-27 — `userId` KALDIRILDI: kimlik istemcinin gönderdiği bir alan değil, backend'in
  // doğruladığı Firebase token'ından çözülüyor (bkz. apps/api auth/firebase-auth.guard.ts).
  correct: z.boolean(),
});

export type RecordWordReviewRequest = z.infer<typeof recordWordReviewRequestSchema>;
