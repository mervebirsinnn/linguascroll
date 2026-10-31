import { isValidMediaSignature, MEDIA_URL_EXPIRES_PARAM, MEDIA_URL_SIGNATURE_PARAM } from "./signed-media-url";

/**
 * request-logging.middleware.ts ile AYNI gerekçe: express tipleri doğrudan dependency
 * değil, ihtiyaç duyulan alanlar minimal tanımlanıyor. `originalUrl` = mount prefix'i
 * ("/media") DAHİL ham path + query — imza, API'nin ürettiği URL'in pathname'i
 * ("/media/<slug>.mp4") üzerinden atıldığı için doğrulama da onu kullanmalı.
 */
interface MediaRequestLike {
  originalUrl: string;
}

interface MediaResponseLike {
  status(code: number): MediaResponseLike;
  end(): void;
}

/**
 * 2026-10-27 — API'nin kendi `/media/*` static sunumunun (main.ts; production'da R2'ye
 * taşınmamış genel videolar buradan servis ediliyor) önüne konan imza kontrolü. Media
 * worker'daki kontrolle AYNI algoritma (bkz. signed-media-url.ts). Geçersiz/süresi dolmuş
 * URL → 403, gövdesiz (hangi kontrolün başarısız olduğu sızdırılmaz).
 */
export function requireSignedMediaUrl(secret: string, now: () => number = Date.now) {
  return (req: MediaRequestLike, res: MediaResponseLike, next: () => void): void => {
    const url = new URL(req.originalUrl, "http://media.local");
    const valid = isValidMediaSignature(
      url.pathname,
      url.searchParams.get(MEDIA_URL_EXPIRES_PARAM) ?? undefined,
      url.searchParams.get(MEDIA_URL_SIGNATURE_PARAM) ?? undefined,
      secret,
      now(),
    );
    if (!valid) {
      res.status(403).end();
      return;
    }
    next();
  };
}
