import { z } from "zod";

/**
 * GET /users/:userId/exists'in response contract'ı. Mobile'ın, AsyncStorage'da
 * SAKLI (format olarak geçerli ama backend'de artık var olmayabilecek) bir
 * anonymousUserId'yi güvenle yeniden kullanıp kullanamayacağına karar vermesi
 * için — bir DB reset'i (dev/test) sonrası "hayalet" bir id'yi sessizce
 * kullanmaya çalışıp her istekte 400 almak yerine.
 */
export const userExistsResponseSchema = z.object({
  exists: z.boolean(),
});

export type UserExistsResponse = z.infer<typeof userExistsResponseSchema>;
