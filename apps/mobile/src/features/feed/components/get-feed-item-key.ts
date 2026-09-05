import type { FeedItem } from "@linguascroll/shared-types";

/**
 * FeedItem nested olduğu için (`item.id` diye bir şey yok — video item'ın kimliği
 * `item.video.id`'de, quiz item'ınki `item.quiz.id`'de). Ayrıca video ve quiz id'leri
 * farklı tablolardan geldiği için teorik olarak çakışabilir; type önekini key'e
 * katmak bunu da önlüyor.
 */
export function getFeedItemKey(item: FeedItem): string {
  return item.type === "video" ? `video:${item.video.id}` : `quiz:${item.quiz.id}`;
}
