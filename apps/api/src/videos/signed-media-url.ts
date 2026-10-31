import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * 2026-10-27 — kısa ömürlü, imzalı medya URL'leri. Ücretsiz hak oynatma erişiminde
 * tüketildiği için, feed/erişim endpoint'inin döndürdüğü URL'in SONSUZA kadar ve herkes
 * tarafından kullanılabilir olması kontrolü etkisiz bırakırdı (eskiden URL'ler kalıcı
 * public path'lerdi). Yeni bir servis/CDN kurulmadı: aynı HMAC, iki mevcut teslim
 * noktasında doğrulanıyor — Cloudflare media worker (apps/media-worker, R2 videoları)
 * ve API'nin kendi `/media/*` static sunumu (main.ts, yerel videolar).
 *
 * İmza girdisi `${pathname}:${exp}` — pathname URL'in HAM (percent-encoded) path'i;
 * worker da `new URL(request.url).pathname`'i decode ETMEDEN doğruluyor, ikisi birebir
 * aynı string'i görüyor. Query string imzaya dahil değil (sadece exp/sig var).
 *
 * Bilinçli sınır: imza kullanıcıya bağlı DEĞİL — geçerlilik süresi içinde URL'i ele geçiren
 * biri o TEK videoyu izleyebilir. Kullanıcı-bağlı token, medya katmanının kimlik bilmesini
 * gerektirirdi (kapsam dışı); kısa TTL bu riski bir videoyla ve bir süreyle sınırlıyor.
 *
 * ÖNEMLİ: algoritma media-worker/src/index.ts'te (WebCrypto ile) BİREBİR tekrar ediliyor —
 * ayrı deploy birimi olduğu için ortak paket yok; birini değiştiren diğerini de değiştirmeli.
 */
export const MEDIA_URL_EXPIRES_PARAM = "exp";
export const MEDIA_URL_SIGNATURE_PARAM = "sig";

function computeSignature(pathname: string, expiresAtSeconds: number, secret: string): string {
  return createHmac("sha256", secret).update(`${pathname}:${expiresAtSeconds}`).digest("base64url");
}

export function signMediaUrl(url: string, secret: string, ttlSeconds: number, nowMs: number): string {
  const parsed = new URL(url);
  const expiresAtSeconds = Math.floor(nowMs / 1000) + ttlSeconds;
  parsed.searchParams.set(MEDIA_URL_EXPIRES_PARAM, String(expiresAtSeconds));
  parsed.searchParams.set(MEDIA_URL_SIGNATURE_PARAM, computeSignature(parsed.pathname, expiresAtSeconds, secret));
  return parsed.toString();
}

/** `exp`/`sig` eksik, bozuk, süresi geçmiş ya da imza tutmuyorsa false. */
export function isValidMediaSignature(
  pathname: string,
  expiresParam: string | undefined,
  signatureParam: string | undefined,
  secret: string,
  nowMs: number,
): boolean {
  if (!expiresParam || !signatureParam || !/^\d+$/.test(expiresParam)) {
    return false;
  }
  const expiresAtSeconds = Number(expiresParam);
  if (expiresAtSeconds * 1000 <= nowMs) {
    return false;
  }
  const expected = Buffer.from(computeSignature(pathname, expiresAtSeconds, secret));
  const actual = Buffer.from(signatureParam);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}
