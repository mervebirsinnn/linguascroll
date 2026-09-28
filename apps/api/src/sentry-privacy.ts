import type { ErrorEvent, EventHint } from "@sentry/nestjs";

/**
 * Sentry'ye event gönderilmeden hemen önce çalışan son filtre (instrument.ts'teki
 * Sentry.init()'in beforeSend'i). Authorization/Cookie header'ları ve structured
 * `cookies` alanı, taşıdıkları secret/session bilgisi nedeniyle event'ten TAMAMEN
 * çıkarılıyor — request-logging.middleware.ts'teki AYNI "Authorization/cookie/body/
 * query/secret/PII'ye hiç dokunma" kuralı burada da geçerli; body/query gibi başka
 * kullanıcı verisi zaten hiçbir yerde event'e BİLİNÇLİ olarak eklenmiyor.
 *
 * Saf fonksiyon olarak instrument.ts'ten AYRI bir dosyada duruyor: instrument.ts'i
 * import etmek Sentry.init()'i (modül yüklenirken, side effect olarak) çalıştırıp
 * process'e gerçek global error handler'lar ekler — bu yüzden testler SADECE bu
 * saf fonksiyonu import ediyor (bkz. sentry-privacy.spec.ts), instrument.ts'e hiç
 * dokunmadan.
 */
const SENSITIVE_HEADER_NAMES = new Set(["authorization", "cookie"]);

export function scrubSensitiveRequestData(event: ErrorEvent, _hint: EventHint): ErrorEvent {
  const { request } = event;
  if (!request) {
    return event;
  }

  if (request.headers) {
    const scrubbedHeaders: Record<string, string> = {};
    for (const [name, value] of Object.entries(request.headers)) {
      if (!SENSITIVE_HEADER_NAMES.has(name.toLowerCase())) {
        scrubbedHeaders[name] = value;
      }
    }
    request.headers = scrubbedHeaders;
  }

  delete request.cookies;

  return event;
}
