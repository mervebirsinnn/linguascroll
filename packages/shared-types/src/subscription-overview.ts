import { z } from "zod";

/** Mağaza durumu ile ücretsiz haklar ayrı: doğrulama kesintisi abonelik yok anlamına gelmez. */
export const subscriptionDetailsSchema = z.object({
  active: z.boolean(),
  expiresAt: z.string().datetime().nullable(),
  renewal: z.enum(["renews", "cancelled", "billing_issue", "unknown"]),
  period: z.enum(["trial", "normal", "intro", "unknown"]),
  productId: z.string().nullable(),
});
export type SubscriptionDetails = z.infer<typeof subscriptionDetailsSchema>;
export const subscriptionOverviewSchema = z.object({
  gateEnabled: z.boolean(),
  freeVideoLimit: z.number().int().nonnegative(),
  consumedFreeVideos: z.number().int().nonnegative(),
  remainingFreeVideos: z.number().int().nonnegative(),
  verification: z.enum(["verified", "unavailable"]),
  subscription: subscriptionDetailsSchema.nullable(),
});
export type SubscriptionOverview = z.infer<typeof subscriptionOverviewSchema>;
