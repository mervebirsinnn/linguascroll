import { z } from "zod";

/**
 * `POST /content-admin/videos/:contentId/publish`'in body'si BOŞ olmalı. needsReview kabulü artık HTTP isteğiyle
 * verilmez (global/istek-bazlı bypass yok): içerik bazlı, gerekçeli acknowledgement approved artifact'in
 * içindedir (promote-content). `.strict()`: eski `acknowledgeNeedsReview` gibi bilinmeyen anahtarlar sessizce
 * yok sayılmak yerine 400 ile reddedilir — istemci davranışının değiştiği açıkça görülsün.
 */
export const publishContentRequestSchema = z.object({}).strict();
export type PublishContentRequest = z.infer<typeof publishContentRequestSchema>;

export const publishContentResponseSchema = z.object({
  videoId: z.string().uuid(),
  muxAssetId: z.string(),
});
export type PublishContentResponse = z.infer<typeof publishContentResponseSchema>;
