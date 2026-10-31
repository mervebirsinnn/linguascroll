import { z } from "zod";

// 2026-10-27 — `POST /videos/:videoId/playback-access` (gövdesiz; kimlik doğrulanmış token'dan).
// Ücretsiz hakkın TEK tüketildiği yer: backend erişim verirken (abone değilse) hakkı aynı
// transaction'da kaydeder. Aynı videoya tekrar istek hak tüketmez (idempotent).

/**
 * `granted` → kısa ömürlü imzalı URL. `paywall` → ücretsiz hak bitti ve aktif abonelik yok;
 * bir hata DEĞİL, beklenen bir iş sonucu (bu yüzden 200 + discriminated union, 402/403 değil).
 */
export const playbackAccessResponseSchema = z.discriminatedUnion("status", [
  z.object({ status: z.literal("granted"), playbackUrl: z.string().url() }),
  z.object({ status: z.literal("paywall") }),
]);

export type PlaybackAccessResponse = z.infer<typeof playbackAccessResponseSchema>;
