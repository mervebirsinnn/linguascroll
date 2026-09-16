import { z } from "zod";

/** POST /words/:wordId/review body contract'ı — `answerQuizRequestSchema` ile AYNI desen. */
export const recordWordReviewRequestSchema = z.object({
  userId: z.string().uuid(),
  correct: z.boolean(),
});

export type RecordWordReviewRequest = z.infer<typeof recordWordReviewRequestSchema>;
