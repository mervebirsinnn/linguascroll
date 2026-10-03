import type { FeedItem } from "@linguascroll/shared-types";

/**
 * FeedItem nested olduğu için (`item.id` diye bir şey yok — video item'ın kimliği
 * `item.video.id`'de, quiz item'ınki `item.quiz.id`'de). Ayrıca video ve quiz id'leri
 * farklı tablolardan geldiği için teorik olarak çakışabilir; type önekini key'e
 * katmak bunu da önlüyor.
 */
export function getFeedItemKey(item: FeedItem): string {
  if (item.type === "video") {
    return `video:${item.video.id}`;
  }
  if (item.type === "quiz") {
    return `quiz:${item.quiz.id}`;
  }
  // 2026-10-01 — paywall item'ının payload'ı yok (id'si bile), ama bir
  // session'da en fazla bir kez görünür (feed'in son item'ı, bkz.
  // feed.service.ts) — sabit bir key yeterli, çakışma riski yok.
  return "paywall";
}
