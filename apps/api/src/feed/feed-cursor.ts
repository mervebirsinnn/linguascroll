import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { feedScopeSchema, sessionSeedSchema, feedPreferencesSchema, topicSchema } from "@linguascroll/shared-types";

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

/**
 * v3: payload'a `sessionSeed` eklendi (session-scoped shuffle'ın seed'i). Yeni session'lar DAİMA v3 cursor üretir.
 * Seed tüm payload gibi HMAC imzası altındadır.
 *
 * v2 (@deprecated, rollout uyumluluğu): seed'siz cursor'lar GEÇİCİ olarak hâlâ decode edilir, çünkü eski mobile
 * build'ler 400 alınca cursor'ı kendiliğinden sıfırlamaz (use-feed.ts: loadMore hatası `nextCursor`'ı korur,
 * footer aynı cursor'la tekrar dener; yeni session yalnızca kullanıcının explicit refresh'iyle başlar). v2 yalnızca
 * İÇİNDEKİ frozen planı devam ettirebilir; v2 ile yeni ranking/session başlatılamaz (FeedService). v2 desteği,
 * minimum desteklenen mobile build yükseltildikten sonra kaldırılacaktır (tarihe bağlı değildir).
 *
 * v2: payload artık persist edilen category'yi DEĞİL feed `scope`'unu taşır (all | animation | ielts).
 * Cursor kısa ömürlü bir session token'ıdır (sunucuda saklanmaz); v1 cursor'ları BİLEREK geçersiz
 * sayılır: `v: z.literal(2)` Zod kontrolü reddeder -> InvalidFeedCursorError -> FeedService 400
 * "Geçersiz veya bozulmuş feed cursor'ı". Client'ın doğru tepkisi zaten aynı (cursor'ı at, yeni session başlat).
 */
export const FEED_CURSOR_VERSION = 3;

/** @deprecated Seed'siz v2 cursor'lar; bkz. yukarıdaki not. Minimum desteklenen mobile build yükseltilince kaldırılacak. */
export const LEGACY_FEED_CURSOR_VERSION = 2;

/**
 * Frozen plan'ın taşıyabileceği maksimum FeedItem sayısı. FeedService'teki
 * MAX_SESSION_VIDEOS (video-ranking bound) ile KARIŞTIRILMAMALI: bu, cursor'ın
 * kendi başına — FeedService'in video/quiz-cadence sabitlerinden habersiz —
 * uyguladığı ayrı bir invariant. Amaç: forged/oversized bir cursor'ın server'a
 * devasa bir plan dizisi (ve dolayısıyla devasa bir batch-resolve sorgusu)
 * enjekte etmesini önlemek (Chunk 8 review düzeltmesi #1).
 *
 * Chunk 14: FeedService'teki MAX_SESSION_VIDEOS=27 + VIDEOS_PER_QUIZ=4 (4:1
 * cadence, eskiden 2:1) ile üretilebilecek GERÇEK teorik maksimum plan uzunluğu
 * 27 + floor(27/4) = 33 — eski 40 (2:1 cadence'in üst sınırı) artık bunu
 * yansıtmıyordu. Keyfi bir "güvenlik payı" EKLENMEDİ: 33, cadence
 * değiştirilmediği sürece interleaveFeed'in üretebileceği MUTLAK üst sınır
 * (assertFitsSessionBound bunu her session'da runtime'da doğrular).
 */
export const MAX_SESSION_FEED_ITEMS = 33;

const feedPlanItemRefSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("video"), id: z.string().uuid() }),
  z.object({ type: z.literal("quiz"), id: z.string().uuid() }),
]);
export type FeedPlanItemRef = z.infer<typeof feedPlanItemRefSchema>;

const feedCursorBaseShape = {
  userId: z.string().uuid(),
  // Zorunlu (v1'deki gibi opsiyonel DEĞİL): her cursor, üretildiği scope'a imzayla bağlıdır.
  scope: feedScopeSchema,
  plan: z.array(feedPlanItemRefSchema).max(MAX_SESSION_FEED_ITEMS),
  position: z.number().int().nonnegative(),
};
const positionWithinPlan = (payload: { position: number; plan: unknown[] }): boolean => payload.position <= payload.plan.length;
const positionWithinPlanIssue = { message: "position, plan uzunluğunu aşamaz" };

const feedCursorV3Schema = z
  .object({ v: z.literal(FEED_CURSOR_VERSION), ...feedCursorBaseShape, sessionSeed: sessionSeedSchema, continuous: z.boolean().optional(), scopedCount: z.number().int().nonnegative().optional(), preferences: feedPreferencesSchema.extend({topics: feedPreferencesSchema.shape.topics.max(topicSchema.options.length)}).optional() })
  .refine(positionWithinPlan, positionWithinPlanIssue);
export type FeedCursorPayloadV3 = z.infer<typeof feedCursorV3Schema>;

/** @deprecated v2: seed'siz frozen plan. Yalnızca continuation için decode edilir. */
const feedCursorV2Schema = z
  .object({ v: z.literal(LEGACY_FEED_CURSOR_VERSION), ...feedCursorBaseShape })
  .strict()
  .refine(positionWithinPlan, positionWithinPlanIssue);
export type FeedCursorPayloadV2 = z.infer<typeof feedCursorV2Schema>;

export type FeedCursorPayload = FeedCursorPayloadV3 | FeedCursorPayloadV2;

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

  const result = z.union([feedCursorV3Schema, feedCursorV2Schema]).safeParse(parsedJson);
  if (!result.success) {
    throw new InvalidFeedCursorError("Cursor payload'ı geçersiz");
  }
  return result.data;
}
