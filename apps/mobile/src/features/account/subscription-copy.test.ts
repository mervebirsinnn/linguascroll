import type { SubscriptionOverview } from "@linguascroll/shared-types";
import { subscriptionDescription } from "./subscription-copy";
const base: SubscriptionOverview = { gateEnabled: true, freeVideoLimit: 10, consumedFreeVideos: 9, remainingFreeVideos: 1, verification: "verified", subscription: { active: true, expiresAt: "2099-01-01T00:00:00.000Z", renewal: "renews", period: "normal", productId: "monthly" } };
it("iptal edilmiş ama bitmemiş abonelikte erişim bitişini açıklar", () => {
  expect(subscriptionDescription({ ...base, subscription: { ...base.subscription!, renewal: "cancelled" } }, "Google Play")).toContain("Yenileme kapalı");
});
it("hata ücretsiz abonelik değildir", () => {
  expect(subscriptionDescription({ ...base, verification: "unavailable", subscription: null }, "Google Play")).toContain("doğrulanamıyor");
});
it("kalan hak gösterilir; kapı kapalıyken yanlış 10 video vaadi gösterilmez", () => {
  expect(subscriptionDescription({ ...base, subscription: { ...base.subscription!, active: false } }, "Google Play")).toContain("Her akışta 10 ücretsiz videoyu tekrar");
  expect(subscriptionDescription({ ...base, gateEnabled: false, subscription: { ...base.subscription!, active: false } }, "Google Play")).toContain("erişimin şu anda açık");
});
// 2026-11-20 — iOS yayını: yönlendirmeler platformun mağazasını adlandırır (ek ünlü uyumuyla: "Google Play'den" / "App Store'dan").
it("mağaza yönlendirmeleri verilen mağazayı doğru ekle adlandırır; iOS metninde Google Play geçmez", () => {
  const unverified: SubscriptionOverview = { ...base, verification: "unavailable", subscription: null };
  const billing: SubscriptionOverview = { ...base, subscription: { ...base.subscription!, renewal: "billing_issue" } };
  const trial: SubscriptionOverview = { ...base, subscription: { ...base.subscription!, period: "trial" } };
  expect(subscriptionDescription(unverified, "Google Play")).toContain("Google Play'den kontrol edebilirsin");
  expect(subscriptionDescription(unverified, "App Store")).toContain("App Store'dan kontrol edebilirsin");
  expect(subscriptionDescription(billing, "App Store")).toContain("App Store'dan kontrol et");
  expect(subscriptionDescription(trial, "App Store")).toContain("yenileme bilgileri App Store'da.");
  expect(subscriptionDescription(trial, "Google Play")).toContain("yenileme bilgileri Google Play'de.");
  for (const overview of [unverified, billing, trial]) expect(subscriptionDescription(overview, "App Store")).not.toContain("Google");
});
