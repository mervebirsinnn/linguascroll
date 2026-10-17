import { createHash } from "node:crypto";

/**
 * Session-scoped shuffle'ın TEK kaynağı: eşit öncelikli adayların sırasını belirleyen anahtar.
 *
 * SAF: stateful PRNG / çağrı sırasına bağlı global state YOK — sonuç yalnızca dört girdinin fonksiyonu,
 * bu yüzden aynı (seed, scope, userId, videoId) her çağrıda, her process'te aynı anahtarı üretir.
 * Anahtar sha256 hex'idir (sabit uzunluk → string karşılaştırması leksikografik = sayısal sıra).
 * Alanlar NUL ile ayrılır; böylece ("ab","c") ile ("a","bc") çakışmaz.
 */
export function deterministicTieBreak(seed: string, scope: string, userId: string, videoId: string): string {
  return createHash("sha256").update(`${seed}\0${scope}\0${userId}\0${videoId}`).digest("hex");
}
