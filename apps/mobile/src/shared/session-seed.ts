import { getRandomValues } from "expo-crypto";
import { sessionSeedSchema } from "@linguascroll/shared-types";

/**
 * Feed session shuffle seed'i: JS process'inin ömrü boyunca TEK bir 128-bit değer (32 küçük harf hex).
 *
 *  - Bellekte (modül düzeyi) tutulur, ASLA AsyncStorage'a yazılmaz: OS process'i öldürülüp uygulama yeniden
 *    açılınca modül yeniden değerlendirilir ve yeni seed oluşur ("yeni cold start → yeni sıra").
 *  - Aynı process içinde rerender, component remount, retry, pagination ve Akış/Animasyon/IELTS geçişleri aynı
 *    modül örneğini görür → aynı seed. (Fast Refresh yalnızca DEĞİŞEN modülü yeniden çalıştırır.)
 *  - Lazy: ilk istekte üretilir, yine de process başına BİR kez.
 *  - Rastgelelik kaynağı resmî `expo-crypto` (`getRandomValues`, native CSPRNG). Hermes'te `globalThis.crypto`
 *    garantisi yoktur, bu yüzden ona GÜVENİLMEZ. Math.random fallback'i YOKTUR: üretim başarısız olursa sessizce
 *    zayıf bir seed'e düşmek yerine `SessionSeedError` fırlatılır.
 */

export class SessionSeedError extends Error {
  constructor(cause: unknown) {
    super("Session seed üretilemedi (expo-crypto getRandomValues başarısız)", { cause });
    this.name = "SessionSeedError";
  }
}

export function generateSessionSeed(): string {
  try {
    const bytes = getRandomValues(new Uint8Array(16));
    const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
    return sessionSeedSchema.parse(hex);
  } catch (error) {
    throw new SessionSeedError(error);
  }
}

let processSeed: string | undefined;

/** Bu JS process'inin seed'i; ilk çağrıda üretilir, sonraki tüm çağrılarda aynı değeri döner. */
export function getSessionSeed(): string {
  processSeed ??= generateSessionSeed();
  return processSeed;
}
