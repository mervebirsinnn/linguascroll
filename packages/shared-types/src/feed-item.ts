import { z } from "zod";
import { feedPlayableVideoSchema } from "./feed-playable-video";
import { feedQuizSchema } from "./feed-quiz";

/**
 * Nested discriminated union (`{type, video}` / `{type, quiz}`), flat DEĞİL:
 * FeedPlayableVideo/FeedQuiz'i oldukları gibi, hiç değiştirmeden yeniden kullanır;
 * iki tipin gelecekte aynı isimli ama farklı anlamlı bir alanı olsa bile
 * (örn. ikisi de bir gün "topic" isterse) çakışma riski yaratmaz.
 *
 * `video` alanı BİLİNÇLİ OLARAK `FeedPlayableVideo` (PlayableVideo + vocabulary),
 * base `PlayableVideo` DEĞİL — bir feed item'daki video her zaman FeedService'in
 * enrichment'ından geçmiş olmalı (Chunk 9 review düzeltmesi).
 */
export const feedItemSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("video"), video: feedPlayableVideoSchema }),
  z.object({ type: z.literal("quiz"), quiz: feedQuizSchema }),
  // 2026-10-01 — ücretsiz video hakkı dolunca `FeedService` bu item'ı döner
  // (2026-10-27: günlük değil, hesap başına toplam 10 — sayfada kalan hak kadar
  // yeni videodan SONRA eklenir, bkz. feed.service.ts). Payload YOK: mobile kendi statik paywall
  // UI'ını RevenueCat'in getOfferings() çağrısından besler, backend fiyat
  // verisi taşımaz — sadece "burada dur" sinyali.
  z.object({ type: z.literal("paywall") }),
]);

export type FeedItem = z.infer<typeof feedItemSchema>;
