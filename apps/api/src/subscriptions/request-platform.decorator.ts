import { createParamDecorator, type ExecutionContext } from "@nestjs/common";
import { CLIENT_PLATFORM_HEADER, type ClientPlatform } from "@linguascroll/shared-types";
import { parseClientPlatform } from "./gate-policy";

/** request-logging.middleware.ts ile aynı gerekçe: express tipleri doğrudan dependency değil. */
type RequestWithHeaders = { headers: Record<string, string | string[] | undefined> };

/**
 * 2026-11-22 — istemcinin bildirdiği platform (X-Client-Platform). HTTP katmanında kalır: controller okur, servise düz değer olarak
 * geçirir. Geçersiz/eksik başlık 400 DEĞİL → null (bilinmeyen platform): eski istemciler bozulmasın (bkz. gate-policy.ts).
 */
export const RequestPlatform = createParamDecorator((_data: unknown, context: ExecutionContext): ClientPlatform | null => {
  const { headers } = context.switchToHttp().getRequest<RequestWithHeaders>();
  return parseClientPlatform(headers[CLIENT_PLATFORM_HEADER.toLowerCase()]);
});
