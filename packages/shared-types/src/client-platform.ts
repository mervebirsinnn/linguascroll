import { z } from "zod";

/**
 * 2026-11-22 — iOS yayını, platforma göre abonelik kapısı. Mobil, kullanıcıya ait her istekte hangi platformda çalıştığını bu
 * başlıkla bildirir; backend ücretsiz hak kapısını yalnız SUBSCRIPTION_GATE_PLATFORMS'taki platformlara uygular.
 *
 * Bu bir YETKİ değil, SINIFLANDIRMA: değer istemci kontrolündedir ve sahte gönderilebilir. Premium yetkisi her zaman backend'in
 * RevenueCat doğrulamasından, kimlik Firebase token'ından gelir; bu başlık ikisini de etkilemez. Taklitle elde edilebilecek en
 * fazla şey, kapının uygulanmadığı platformun (bugün Android) zaten herkese verdiği ücretsiz erişimdir.
 */
export const CLIENT_PLATFORM_HEADER = "X-Client-Platform";

export const clientPlatformSchema = z.enum(["ios", "android"]);
export type ClientPlatform = z.infer<typeof clientPlatformSchema>;
