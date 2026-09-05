import { z } from "zod";

/**
 * FeedQuiz = client'ın (mobile) feed'de bir quiz'i render etmek için ihtiyaç
 * duyduğu public contract. `isCorrect` BİLEREK burada YOK — bu alan sadece
 * apps/api/src/quizzes/quiz.ts'teki server-internal Quiz representation'ında
 * yaşar ve hiçbir zaman bu şemaya/HTTP response'una sızmaz.
 */
const feedQuizOptionSchema = z.object({
  id: z.string().uuid(),
  text: z.string(),
});

export const feedQuizSchema = z.object({
  id: z.string().uuid(),
  question: z.string(),
  options: z.array(feedQuizOptionSchema),
});

export type FeedQuiz = z.infer<typeof feedQuizSchema>;
