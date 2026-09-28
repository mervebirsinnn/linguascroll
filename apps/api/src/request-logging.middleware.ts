import { randomUUID } from "node:crypto";
import { Injectable, Logger, NestMiddleware } from "@nestjs/common";

/**
 * content-admin-secret.guard.ts'teki AYNI gerekçe: `express`'in kendi Request/Response
 * tiplerini import ETMİYORUZ — express/@types/express bu repo'da DOĞRUDAN bir dependency
 * değil (sadece @nestjs/platform-express'in transitive'i). İhtiyacımız olan alanlar
 * sınırlı, burada minimal olarak tanımlıyoruz. `req.path` express'in eklediği bir
 * getter — query string'i İÇERMEZ (istekli: query değerlerini asla loglamıyoruz).
 */
interface IncomingRequestLike {
  method: string;
  path: string;
  headers: Record<string, string | string[] | undefined>;
}

interface OutgoingResponseLike {
  statusCode: number;
  setHeader(name: string, value: string): void;
  on(event: "finish", listener: () => void): void;
}

// Gelen X-Request-Id'ye körlemesine güvenilmiyor: trim + maksimum uzunluk + güvenli
// karakter allowlist'i. Bunlardan biri sağlanmazsa randomUUID() üretilir — istemcinin
// log injection'a (satır sonu/kontrol karakteri) ya da aşırı uzun bir header'a sebep
// olmasının önüne geçiyor.
const SAFE_REQUEST_ID_PATTERN = /^[A-Za-z0-9-]+$/;
const MAX_REQUEST_ID_LENGTH = 128;

function resolveRequestId(headerValue: string | string[] | undefined): string {
  const raw = Array.isArray(headerValue) ? headerValue[0] : headerValue;
  const trimmed = raw?.trim();
  if (trimmed && trimmed.length <= MAX_REQUEST_ID_LENGTH && SAFE_REQUEST_ID_PATTERN.test(trimmed)) {
    return trimmed;
  }
  return randomUUID();
}

/**
 * Minimal production request logging — her istek için requestId/method/path/statusCode/
 * durationMs. Interceptor değil MIDDLEWARE: interceptor'lar sadece bir controller
 * handler'ına GERÇEKTEN eşleşen istekleri sarar, route eşleşmeyen istekler (404) hiç
 * interceptor'a ulaşmaz — middleware routing'den ÖNCE çalıştığı için 404'ler dahil HER
 * isteği yakalar. `res.on("finish")` response GERÇEKTEN client'a yazıldıktan sonra
 * (başarı/exception farketmeksizin) tetiklenir, bu yüzden gerçek nihai statusCode'u tek
 * bir yerden okuyabiliyoruz.
 *
 * Authorization/cookie/body/query/secret/PII'ye hiç dokunulmuyor (okunmuyor bile) —
 * sadece method/path/status/duration.
 */
@Injectable()
export class RequestLoggingMiddleware implements NestMiddleware<IncomingRequestLike, OutgoingResponseLike> {
  private readonly logger = new Logger("HTTP");

  use(req: IncomingRequestLike, res: OutgoingResponseLike, next: () => void): void {
    const requestId = resolveRequestId(req.headers["x-request-id"]);
    res.setHeader("X-Request-Id", requestId);

    const startedAt = process.hrtime.bigint();

    res.on("finish", () => {
      const durationMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;
      const statusCode = res.statusCode;
      const message = `[requestId=${requestId}] ${req.method} ${req.path} -> ${statusCode} (${durationMs.toFixed(0)}ms)`;

      if (statusCode >= 500) {
        this.logger.error(message);
      } else if (statusCode >= 400) {
        this.logger.warn(message);
      } else {
        this.logger.log(message);
      }
    });

    next();
  }
}
