import { Linking, Platform } from "react-native";
import Purchases, { type PurchasesPackage } from "react-native-purchases";
import { REVENUECAT_ANDROID_API_KEY } from "../../shared/revenuecat-config";
import { buildPaywallPackages, type PaywallPackage } from "./paywall-model";

/**
 * react-native-purchases'a dokunan TEK dosya — geri kalanı (model, state, hook, UI) SDK'yı
 * hiç bilmiyor. SDK hataları burada "iptal / onay bekliyor / gerçek hata" olarak
 * sınıflanıyor; gerçek hatalar fırlatılıyor (hook Sentry'ye bildirip kullanıcıya genel mesaj
 * gösteriyor).
 *
 * Kimlik: `appUserID` = backend'in doğrulanmış hesaptan çözdüğü SABİT kullanıcı id'si (GET /me,
 * 2026-10-27 — eskiden anonim UUID'ydi). Backend entitlement'ı RevenueCat REST'ten aynı id ile
 * sorguluyor (bkz. apps/api RevenueCatClient). Backend "herhangi bir aktif entitlement"a
 * bakıyor, o yüzden burada da entitlement ADINA bağlanmıyoruz.
 *
 * Hesap değişimi: farklı bir kullanıcıyla `initializePurchases` çağrılırsa `Purchases.logIn`
 * ile RevenueCat kimliği değiştirilir; çıkışta `logOutPurchases`. Bir Google Play hesabındaki
 * aboneliğin "geri yükle" ile BAŞKA bir uygulama hesabına taşınmasını engellemek RevenueCat
 * panelindeki "Restore behavior" ayarına bağlı (bkz. rapor: "Keep with original App User ID").
 */

export type PurchaseOutcome = "purchased" | "cancelled" | "pending";

let configured = false;
let packageCache = new Map<string, PurchasesPackage>();

export function hasActiveEntitlement(customerInfo: { entitlements: { active: Record<string, unknown> } }): boolean {
  return Object.keys(customerInfo.entitlements.active).length > 0;
}

/** Satın alma bu build/platformda kullanılabilir mi (anahtar tanımlı + Android)? */
export function isPurchasingAvailable(): boolean {
  return Platform.OS === "android" && REVENUECAT_ANDROID_API_KEY !== undefined;
}

/**
 * İlk çağrıda yapılandırır; sonraki çağrılarda kullanıcı değiştiyse RevenueCat kimliğini
 * değiştirir (aynı kullanıcı için idempotent). Anahtar yoksa/Android değilse false döner.
 */
export async function initializePurchases(userId: string): Promise<boolean> {
  if (!isPurchasingAvailable() || REVENUECAT_ANDROID_API_KEY === undefined) {
    return false;
  }
  if (!configured) {
    Purchases.configure({ apiKey: REVENUECAT_ANDROID_API_KEY, appUserID: userId });
    configured = true;
    return true;
  }
  if ((await Purchases.getAppUserID()) !== userId) {
    packageCache = new Map();
    await Purchases.logIn(userId);
  }
  return true;
}

/**
 * Çıkışta çağrılır: RevenueCat önbelleğindeki müşteri bilgisi (abonelik) bir sonraki hesaba
 * görünmesin. RevenueCat anonim bir kullanıcı için logOut'ta hata verdiği için o durum atlanır.
 */
export async function logOutPurchases(): Promise<void> {
  if (!configured) {
    return;
  }
  packageCache = new Map();
  if (await Purchases.isAnonymous()) {
    return;
  }
  await Purchases.logOut();
}

export async function fetchPaywallPackages(): Promise<PaywallPackage[]> {
  if (!configured) {
    throw new Error("Purchases yapılandırılmadı (anahtar tanımsız ya da henüz başlatılmadı).");
  }
  const offerings = await Purchases.getOfferings();
  const available = offerings.current?.availablePackages ?? [];
  packageCache = new Map(available.map((p) => [p.identifier, p]));
  return buildPaywallPackages(available);
}

function errorCodeOf(error: unknown): string | undefined {
  return typeof error === "object" && error !== null && "code" in error ? String((error as { code: unknown }).code) : undefined;
}

export async function purchasePackageById(id: string): Promise<PurchaseOutcome> {
  const pkg = packageCache.get(id);
  if (!pkg) {
    throw new Error(`Bilinmeyen paket: ${id}`);
  }
  try {
    const { customerInfo } = await Purchases.purchasePackage(pkg);
    if (!hasActiveEntitlement(customerInfo)) {
      // Satın alma tamamlandı ama RevenueCat'te ürün bir entitlement'a bağlı değil — bu bir
      // yapılandırma hatası, kullanıcıya "başarılı" demek yanlış olur.
      throw new Error("Satın alma tamamlandı ama aktif entitlement yok (RevenueCat ürün/entitlement bağlantısını kontrol et).");
    }
    return "purchased";
  } catch (error) {
    const code = errorCodeOf(error);
    if (code === Purchases.PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR) {
      return "cancelled";
    }
    if (code === Purchases.PURCHASES_ERROR_CODE.PAYMENT_PENDING_ERROR) {
      return "pending";
    }
    throw error;
  }
}

/** Geri yükleme sonrası aktif abonelik var mı? */
export async function restoreAndCheck(): Promise<boolean> {
  const customerInfo = await Purchases.restorePurchases();
  return hasActiveEntitlement(customerInfo);
}

/**
 * 2026-10-28 — "Aboneliği yönet / iptal et". Play politikası gereği uygulama aboneliği kendisi
 * iptal etmez; kullanıcı Google Play'in abonelik sayfasına yönlendirilir (iptal orada tek
 * dokunuşla yapılır, deneme süresindeyse hiç ücret alınmaz). Önce RevenueCat'in bu kullanıcı
 * için verdiği yönetim URL'i (doğrudan ilgili aboneliğe gider), yoksa genel Play sayfası.
 * Paket adı app.json'daki android.package ile aynı (bkz. 2026-10-27 paket kararı).
 */
const PLAY_SUBSCRIPTIONS_URL = "https://play.google.com/store/account/subscriptions?package=app.looplish.mobile";

export async function openSubscriptionManagement(): Promise<void> {
  let url = PLAY_SUBSCRIPTIONS_URL;
  if (configured) {
    try {
      url = (await Purchases.getCustomerInfo()).managementURL ?? PLAY_SUBSCRIPTIONS_URL;
    } catch {
      // Ağ hatasında da kullanıcı iptal yolunu kaybetmemeli: genel Play sayfası açılır.
    }
  }
  await Linking.openURL(url);
}
