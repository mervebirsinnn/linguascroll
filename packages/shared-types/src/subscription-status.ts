import { z } from "zod";

/**
 * 2026-10-27 — `POST /subscriptions/refresh` (gövdesiz; kimlik doğrulanmış token'dan). Mobile,
 * satın alma/geri yükleme başarıyla bittikten sonra çağırır: backend RevenueCat'i önbelleği
 * atlayarak YENİDEN sorgular. Mobildeki "purchased" sonucu tek başına yetki sayılmaz.
 */

export const subscriptionStatusSchema = z.object({
  active: z.boolean(),
});

export type SubscriptionStatus = z.infer<typeof subscriptionStatusSchema>;
