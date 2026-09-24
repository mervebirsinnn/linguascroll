import { z } from "zod";

/**
 * Chunk 17D — `POST /content-admin/videos/:contentId/publish`'in body'si. CLI'daki
 * (publish-content.ts, parseArgs) `--acknowledge-needs-review` flag'inin BİREBİR HTTP
 * karşılığı — aynı iki durumu (reject: hep engelli; needsReview: flag yoksa engelli/
 * varsa geçer) taşır. Yeni bir review-state/workflow modellenmiyor, sadece mevcut
 * `assertPassesQualityGate` semantics'inin HTTP'ye taşınması.
 */
export const publishContentRequestSchema = z.object({
  acknowledgeNeedsReview: z.boolean().optional().default(false),
});
export type PublishContentRequest = z.infer<typeof publishContentRequestSchema>;

export const publishContentResponseSchema = z.object({
  videoId: z.string().uuid(),
  muxAssetId: z.string(),
});
export type PublishContentResponse = z.infer<typeof publishContentResponseSchema>;
