import { passageLevelSchema, type PassageLevel } from "@linguascroll/shared-types";
import { z } from "zod";

/**
 * GET /passages cursor'u: opak base64url JSON `{v, level, sortOrder, id}` — SADECE bir konum (keyset) ve hangi seviyeye
 * ait olduğunu taşır. Feed cursor'unun aksine imzasız (bkz. feed-cursor.ts): dondurulmuş bir plan taşımıyor, kurcalamanın
 * tek etkisi kullanıcının kendi listesinde konumu oynatmak. Doğrulama Zod ile; bozuk her girdi `InvalidPassageCursorError`
 * (servis bunu 400'e çevirir).
 */
const INT4_MIN = -2147483648;
const INT4_MAX = 2147483647;

const cursorPayloadSchema = z.object({
  v: z.literal(1),
  level: passageLevelSchema,
  // DB `integer` (int4) aralığıyla sınırlı: aralık dışı bir değer Postgres'te hataya (500) yol açardı; burada 400 olur.
  sortOrder: z.number().int().min(INT4_MIN).max(INT4_MAX),
  id: z.string().uuid(),
});

export type PassageCursor = { level: PassageLevel; sortOrder: number; id: string };

export class InvalidPassageCursorError extends Error {}

export function encodePassageCursor(cursor: PassageCursor): string {
  return Buffer.from(JSON.stringify({ v: 1, level: cursor.level, sortOrder: cursor.sortOrder, id: cursor.id }), "utf8").toString("base64url");
}

export function decodePassageCursor(raw: string): PassageCursor {
  let json: unknown;
  try {
    json = JSON.parse(Buffer.from(raw, "base64url").toString("utf8"));
  } catch {
    throw new InvalidPassageCursorError("Cursor çözülemedi");
  }
  const parsed = cursorPayloadSchema.safeParse(json);
  if (!parsed.success) {
    throw new InvalidPassageCursorError("Cursor biçimi geçersiz");
  }
  return { level: parsed.data.level, sortOrder: parsed.data.sortOrder, id: parsed.data.id };
}
