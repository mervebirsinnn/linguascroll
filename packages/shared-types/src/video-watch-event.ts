import { z } from "zod";

/**
 * POST /videos/:videoId/watch-events'in request contract'ı. watchedMs, mobile'ın
 * bu exposure boyunca player'ın GERÇEKTEN oynattığı süre (buffering/pause hariç) —
 * "completed"/"skipped" gibi yorumlanmış bir etiket DEĞİL. Bu yorum (threshold
 * policy) bilinçli olarak burada yok — Chunk 7'nin read-side'ına ait.
 */
export const recordVideoWatchEventRequestSchema = z.object({
  // 2026-10-27 — `userId` KALDIRILDI: kimlik istemcinin gönderdiği bir alan değil, backend'in
  // doğruladığı Firebase token'ından çözülüyor (bkz. apps/api auth/firebase-auth.guard.ts).
  watchedMs: z.number().int().nonnegative(),
});

export type RecordVideoWatchEventRequest = z.infer<typeof recordVideoWatchEventRequestSchema>;
