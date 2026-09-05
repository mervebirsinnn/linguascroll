import { z } from "zod";

/**
 * Quiz = server-internal domain representation, isCorrect DAHİL. Bu tip
 * shared-types'a KONMUYOR — mobile'ın hiçbir zaman ihtiyacı olmayan, sadece
 * API'nin kendi answer-evaluation mantığının bildiği bir gerçek. Public/API
 * sınırını geçen her şey QuizzesService'te FeedQuiz'e (shared-types) çevrilir.
 *
 * DB'nin partial unique index'i sadece "en fazla bir doğru cevap" garantisi
 * veriyor (bkz. quizzes.schema.ts) — "tam olarak bir" invariant'ı burada,
 * runtime'da doğrulanıyor. Bu, QuizzesRepository'nin DB row'ları Quiz'e map
 * ettiği an (quizSchema.parse) otomatik olarak çalışır.
 */
const quizOptionSchema = z.object({
  id: z.string().uuid(),
  text: z.string(),
  isCorrect: z.boolean(),
});

export const quizSchema = z
  .object({
    id: z.string().uuid(),
    question: z.string(),
    options: z.array(quizOptionSchema),
  })
  .refine((quiz) => quiz.options.filter((option) => option.isCorrect).length === 1, {
    message: "Bir quiz'in tam olarak bir doğru cevabı olmalı",
  });

export type Quiz = z.infer<typeof quizSchema>;
