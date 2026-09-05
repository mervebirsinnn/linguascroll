import { z } from "zod";

/**
 * POST /users/anonymous'un response contract'ı. Auth henüz yok — bu, gerçek bir
 * hesap değil, sadece learning-event'leri bir kimliğe bağlamak için DB'nin
 * ürettiği opak bir id. Gelecekte gerçek auth geldiğinde bu id, kullanıcının
 * "claim" edeceği kalıcı kimlik olarak kalacak (bkz. apps/api/src/users).
 */
export const anonymousUserSchema = z.object({
  id: z.string().uuid(),
});

export type AnonymousUser = z.infer<typeof anonymousUserSchema>;
