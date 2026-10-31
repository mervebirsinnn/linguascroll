import { z } from "zod";

/**
 * 2026-10-27 — `GET /me`: giriş yapmış kullanıcının SABİT backend id'si. Mobile bunu RevenueCat
 * App User ID'si olarak kullanır; backend entitlement'ı aynı id ile sorgular. (Eski
 * `AnonymousUser`/`UserExistsResponse` kaldırıldı — anonim kimlik yok.)
 */
export const currentUserSchema = z.object({
  userId: z.string().uuid(),
});

export type CurrentUser = z.infer<typeof currentUserSchema>;
