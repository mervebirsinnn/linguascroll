import type { SubscriptionOverview } from "@linguascroll/shared-types";
export function subscriptionDescription(overview: SubscriptionOverview | null): string {
  if (!overview) return "Üyelik bilgilerine şu an ulaşılamıyor. Durumunu yeniden kontrol edebilirsin.";
  const sub = overview.subscription;
  if (overview.verification !== "verified") return "Aboneliğin şu an doğrulanamıyor. Durumunu yenileyebilir veya Google Play'den kontrol edebilirsin.";
  if (!sub?.active) return overview.gateEnabled ? `Her akışta ${overview.freeVideoLimit} ücretsiz videoyu tekrar izleyebilirsin. Premium ile tüm videoları aç.` : "Videolara erişimin şu anda açık. Premium planlarını buradan inceleyebilirsin.";
  const date = sub.expiresAt ? new Date(sub.expiresAt).toLocaleDateString("tr-TR", { year: "numeric", month: "long", day: "numeric" }) : null;
  if (sub.renewal === "billing_issue") return "Ödemeyle ilgili bir sorun var. Erişim durumunu ve ödeme yöntemini Google Play'den kontrol et.";
  if (sub.renewal === "cancelled") return date ? `Yenileme kapalı. Premium erişimin ${date} tarihine kadar devam eder.` : "Yenileme kapalı. Güncel erişim süreni Google Play'den kontrol et.";
  if (sub.period === "trial") return date ? `Ücretsiz denemen ${date} tarihinde sona erer. Sonraki ücret ve yenileme bilgileri Google Play'de.` : "Ücretsiz denemen aktif. Bitiş ve ücret bilgilerini Google Play'den görebilirsin.";
  return date ? `${sub.renewal === "renews" ? "Sonraki yenileme" : "Erişim bitişi"}: ${date}. Sınırsız video ve quiz erişimin açık.` : "Premium erişimin açık. Sınırsız video ve quiz ile devam et.";
}
