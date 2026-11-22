import { clientPlatformSchema, type ClientPlatform } from "@linguascroll/shared-types";

/**
 * 2026-11-22 — iOS yayını: abonelik kapısının hangi isteklere uygulanacağı. Saf fonksiyonlar (Nest'siz test edilir).
 *
 * Kural: kapı açık = SUBSCRIPTION_GATE_ENABLED="true" (bugünkü global şalter, tüm platformlar) VEYA istemcinin bildirdiği platform
 * SUBSCRIPTION_GATE_PLATFORMS listesinde. Platformu bilinmeyen istek (başlık yok/geçersiz: yayındaki eski Android sürümleri,
 * TestFlight build 1) yalnız global şalter açıksa kapıya girer. Bilinçli tercih: Android'in bugünkü ücretsiz davranışı ve eski
 * istemciler korunur. Başlığın güvenlik etkisi için bkz. shared-types client-platform.ts.
 */
export type GatePolicy = {
  readonly allPlatforms: boolean;
  readonly platforms: ReadonlySet<ClientPlatform>;
};

/** Env değeri biçimi: virgülle ayrılmış ios/android (ör. "ios" ya da "ios,android"). app.module.ts env şeması da bunu kullanır. */
export const GATE_PLATFORMS_PATTERN = /^(ios|android)(,(ios|android))*$/;

export function gatePolicyFromEnv(enabled: string | undefined, platforms: string | undefined): GatePolicy {
  const listed = platforms && platforms.length > 0 ? platforms.split(",").map((value) => clientPlatformSchema.parse(value)) : [];
  return { allPlatforms: enabled === "true", platforms: new Set(listed) };
}

export function isGateActive(policy: GatePolicy, platform: ClientPlatform | null): boolean {
  return policy.allPlatforms || (platform !== null && policy.platforms.has(platform));
}

/** Başlık değeri → platform. Dizi (tekrarlı başlık), boş, bilinmeyen değer → null (bilinmeyen platform). */
export function parseClientPlatform(value: unknown): ClientPlatform | null {
  const result = clientPlatformSchema.safeParse(typeof value === "string" ? value.trim().toLowerCase() : value);
  return result.success ? result.data : null;
}
