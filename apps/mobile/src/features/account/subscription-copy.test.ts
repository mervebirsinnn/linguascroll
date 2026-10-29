import type { SubscriptionOverview } from "@linguascroll/shared-types";
import { subscriptionDescription } from "./subscription-copy";
const base: SubscriptionOverview = { gateEnabled: true, freeVideoLimit: 10, consumedFreeVideos: 9, remainingFreeVideos: 1, verification: "verified", subscription: { active: true, expiresAt: "2099-01-01T00:00:00.000Z", renewal: "renews", period: "normal", productId: "monthly" } };
it("iptal edilmiş ama bitmemiş abonelikte erişim bitişini açıklar", () => {
  expect(subscriptionDescription({ ...base, subscription: { ...base.subscription!, renewal: "cancelled" } })).toContain("Yenileme kapalı");
});
it("hata ücretsiz abonelik değildir", () => {
  expect(subscriptionDescription({ ...base, verification: "unavailable", subscription: null })).toContain("doğrulanamıyor");
});
it("kalan hak gösterilir; kapı kapalıyken yanlış 10 video vaadi gösterilmez", () => {
  expect(subscriptionDescription({ ...base, subscription: { ...base.subscription!, active: false } })).toContain("Her akışta 10 ücretsiz videoyu tekrar");
  expect(subscriptionDescription({ ...base, gateEnabled: false, subscription: { ...base.subscription!, active: false } })).toContain("erişimin şu anda açık");
});
