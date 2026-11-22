import type { SubscriptionOverview } from "@linguascroll/shared-types";
import type { STORE_NAME } from "../subscription/store-name";

/*
 * 2026-11-20 — iOS yayını: kullanıcıyı yönlendirdiğimiz mağaza adı (App Store / Google Play) PARAMETRE — bu saf
 * metin modülü react-native'e (store-name.ts → Platform) bağlanmasın, Node'daki mantık testi native modül yüklemesin.
 * Ek ünlü uyumuna uyar ("Google Play'den" ama "App Store'dan"); bu yüzden ad + ek birlikte üretiliyor,
 * `${ad}'den` gibi sabit ek kullanılmıyor.
 */
export function inStore(storeName: typeof STORE_NAME): string {
  return storeName === "App Store" ? "App Store'da" : "Google Play'de";
}
export function fromStore(storeName: typeof STORE_NAME): string {
  return storeName === "App Store" ? "App Store'dan" : "Google Play'den";
}

export function subscriptionDescription(overview: SubscriptionOverview | null, storeName: typeof STORE_NAME): string {
  if (!overview) return "Üyelik bilgilerine şu an ulaşılamıyor. Durumunu yeniden kontrol edebilirsin.";
  const sub = overview.subscription;
  if (overview.verification !== "verified") return `Aboneliğin şu an doğrulanamıyor. Durumunu yenileyebilir veya ${fromStore(storeName)} kontrol edebilirsin.`;
  if (!sub?.active) return overview.gateEnabled ? `Her akışta ${overview.freeVideoLimit} ücretsiz videoyu tekrar izleyebilirsin. Premium ile tüm videoları aç.` : "Videolara erişimin şu anda açık. Premium planlarını buradan inceleyebilirsin.";
  const date = sub.expiresAt ? new Date(sub.expiresAt).toLocaleDateString("tr-TR", { year: "numeric", month: "long", day: "numeric" }) : null;
  if (sub.renewal === "billing_issue") return `Ödemeyle ilgili bir sorun var. Erişim durumunu ve ödeme yöntemini ${fromStore(storeName)} kontrol et.`;
  if (sub.renewal === "cancelled") return date ? `Yenileme kapalı. Premium erişimin ${date} tarihine kadar devam eder.` : `Yenileme kapalı. Güncel erişim süreni ${fromStore(storeName)} kontrol et.`;
  if (sub.period === "trial") return date ? `Ücretsiz denemen ${date} tarihinde sona erer. Sonraki ücret ve yenileme bilgileri ${inStore(storeName)}.` : `Ücretsiz denemen aktif. Bitiş ve ücret bilgilerini ${fromStore(storeName)} görebilirsin.`;
  return date ? `${sub.renewal === "renews" ? "Sonraki yenileme" : "Erişim bitişi"}: ${date}. Sınırsız video ve quiz erişimin açık.` : "Premium erişimin açık. Sınırsız video ve quiz ile devam et.";
}
