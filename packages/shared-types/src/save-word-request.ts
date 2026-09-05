import { z } from "zod";

/**
 * PUT /words/:wordId/saved body contract'ı. Auth henüz yok — anonymous identity,
 * mevcut answerQuizRequestSchema/recordVideoWatchEventRequestSchema deseniyle
 * aynı: mobile kendi taşıdığı userId'yi body'de gönderiyor.
 */
export const saveWordRequestSchema = z.object({
  userId: z.string().uuid(),
});

export type SaveWordRequest = z.infer<typeof saveWordRequestSchema>;
