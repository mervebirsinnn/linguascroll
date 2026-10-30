import type { FeedItem } from "@linguascroll/shared-types";
import { getFeedOccurrenceKey } from "./get-feed-item-key";
it("tekrar gelen video için her görünüm ayrı key taşır", () => {
  const item = {type:"video", video:{id:"same-video"}} as FeedItem;
  expect(getFeedOccurrenceKey(item, 0)).not.toBe(getFeedOccurrenceKey(item, 27));
  expect(getFeedOccurrenceKey(item, 27)).toBe(getFeedOccurrenceKey(item, 27));
});
