import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";

/**
 * Chunk 8 — bounded frozen feed-plan pagination.
 *
 * Cursor, server'ın hiçbir yerde saklamadığı bir "feed session"ı taşıyan opaque,
 * imzalı bir string: `{payloadBase64}.{signatureBase64}`. Payload SADECE
 * `{type, id}` referansları taşır — playbackUrl gibi expire olabilecek hiçbir
 * değer burada YOK (bkz. FeedService, her sayfada taze resolve ediyor).
 *
 * Bu modül DB/Nest/HTTP bilmiyor — saf encode/decode/verify. Geçersiz bir
 * cursor'da HTTP exception ATMIYOR, InvalidFeedCursorError fırlatıyor;
 * bunu BadRequestException'a çevirmek FeedService'in işi (personalization/HTTP
 * ayrımıyla aynı desen).
 */

export const FEED_CURSOR_VERSION = 1;

/**
 * Frozen plan'ın taşıyabileceği maksimum FeedItem sayısı. FeedService'teki
 * MAX_SESSION_VIDEOS (video-ranking bound) ile KARIŞTIRILMAMALI: bu, cursor'ın
 * kendi başına — FeedService'in video/quiz-cadence sabitlerinden habersiz —
 * uyguladığı ayrı bir invariant. Amaç: forged/oversized bir cursor'ın server'a
 * devasa bir plan dizisi (ve dolayısıyla devasa bir batch-resolve sorgusu)
 * enjekte etmesini önlemek (Chunk 8 review düzeltmesi #1).
 *
 * Chunk 10: FeedService'teki MAX_SESSION_VIDEOS=27 + VIDEOS_PER_QUIZ=2 (2:1
 * cadence) ile üretilebilecek GERÇEK teorik maksimum plan uzunluğu
 * 27 + floor(27/2) = 40 — 36 (eski 3:1 cadence'in üst sınırı) artık bunu
 * karşılamıyordu. Keyfi bir "güvenlik payı" EKLENMEDİ: 40, cadence
 * değiştirilmediği sürece interleaveFeed'in üretebileceği MUTLAK üst sınır
 * (assertFitsSessionBound bunu her session'da runtime'da doğrular).
 */
export const MAX_SESSION_FEED_ITEMS = 40;

const feedPlanItemRefSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("video"), id: z.string().uuid() }),
  z.object({ type: z.literal("quiz"), id: z.string().uuid() }),
]);
export type FeedPlanItemRef = z.infer<typeof feedPlanItemRefSchema>;

const feedCursorPayloadSchema = z
  .object({
    v: z.literal(FEED_CURSOR_VERSION),
    userId: z.string().uuid(),
    plan: z.array(feedPlanItemRefSchema).max(MAX_SESSION_FEED_ITEMS),
    position: z.number().int().nonnegative(),
  })
  .refine((payload) => payload.position <= payload.plan.length, {
    message: "position, plan uzunluğunu aşamaz",
  });
export type FeedCursorPayload = z.infer<typeof feedCursorPayloadSchema>;

/**
 * Tek bir hata sınıfı — sebep (imza/format/version/bounds) client için anlamlı
 * bir aksiyon farkı yaratmıyor: hepsinde tek doğru davranış aynı — cursor'ı at,
 * yeni bir session başlat. Ayrı bir exception hiyerarşisi kurmuyoruz.
 */
export class InvalidFeedCursorError extends Error {}

function sign(payloadB64: string, secret: string): string {
  return createHmac("sha256", secret).update(payloadB64).digest("base64url");
}

export function encodeFeedCursor(payload: FeedCursorPayload, secret: string): string {
  const payloadB64 = Buffer.from(JSON.stringify(payload), "utf-8").toString("base64url");
  const signature = sign(payloadB64, secret);
  return `${payloadB64}.${signature}`;
}

/**
 * Sırayla: (1) format (iki parça var mı), (2) imza (constant-time karşılaştırma —
 * timingSafeEqual eşit uzunlukta buffer istiyor, bu yüzden önce uzunluk kontrolü),
 * (3) JSON parse, (4) Zod (version/shape/bounds). İmza doğrulanmadan payload'ın
 * içeriğine hiç güvenilmiyor — sıra bilinçli.
 */
export function decodeFeedCursor(cursor: string, secret: string): FeedCursorPayload {
  const [payloadB64, signature] = cursor.split(".");
  if (!payloadB64 || !signature) {
    throw new InvalidFeedCursorError("Cursor formatı geçersiz");
  }

  const expectedSignature = sign(payloadB64, secret);
  const providedBuffer = Buffer.from(signature, "base64url");
  const expectedBuffer = Buffer.from(expectedSignature, "base64url");
  if (providedBuffer.length !== expectedBuffer.length || !timingSafeEqual(providedBuffer, expectedBuffer)) {
    throw new InvalidFeedCursorError("Cursor imzası doğrulanamadı");
  }

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(Buffer.from(payloadB64, "base64url").toString("utf-8"));
  } catch {
    throw new InvalidFeedCursorError("Cursor payload'ı çözülemedi");
  }

  const result = feedCursorPayloadSchema.safeParse(parsedJson);
  if (!result.success) {
    throw new InvalidFeedCursorError("Cursor payload'ı geçersiz");
  }
  return result.data;
}
