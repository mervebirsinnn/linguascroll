import { Linking, Platform } from "react-native";
import Purchases, { type PurchasesPackage } from "react-native-purchases";
import { REVENUECAT_ANDROID_API_KEY, REVENUECAT_ENTITLEMENT_ID } from "../../shared/revenuecat-config";
import { buildPaywallPackages, type PaywallPackage } from "./paywall-model";

/**
 * react-native-purchases'a dokunan TEK dosya — geri kalanı (model, state, hook, UI) SDK'yı
 * hiç bilmiyor. SDK hataları burada "iptal / onay bekliyor / gerçek hata" olarak
 * sınıflanıyor; gerçek hatalar fırlatılıyor (hook Sentry'ye bildirip kullanıcıya genel mesaj
 * gösteriyor).
 *
 * Kimlik: `appUserID` = backend'in doğrulanmış hesaptan çözdüğü SABİT kullanıcı id'si (GET /me,
 * 2026-10-27 — eskiden anonim UUID'ydi). Backend entitlement'ı RevenueCat REST'ten aynı id ile
 * sorguluyor (bkz. apps/api RevenueCatClient). Backend ve mobil aynı yapılandırılmış entitlement kimliğini kontrol eder.
 *
 * Hesap değişimi: farklı bir kullanıcıyla `initializePurchases` çağrılırsa `Purchases.logIn`
 * ile RevenueCat kimliği değiştirilir; çıkışta `logOutPurchases`. Bir Google Play hesabındaki
 * aboneliğin "geri yükle" ile BAŞKA bir uygulama hesabına taşınmasını engellemek RevenueCat
 * panelindeki "Restore behavior" ayarına bağlı (bkz. rapor: "Keep with original App User ID").
 */

export type PurchaseOutcome = "purchased" | "cancelled" | "pending";

let configured = false;
let identityQueue: Promise<unknown> = Promise.resolve();
let currentUserId: string | null = null;
function serializeIdentity<T>(operation: () => Promise<T>): Promise<T> {
  const next = identityQueue.then(operation);
  identityQueue = next.catch(() => {});
  return next;
}
let packageCache = new Map<string, PurchasesPackage>();

export function hasActiveEntitlement(customerInfo: { entitlements: { active: Record<string, unknown> } }): boolean {
  return customerInfo.entitlements.active[REVENUECAT_ENTITLEMENT_ID ?? "premium"] !== undefined;
}

/** Satın alma bu build/platformda kullanılabilir mi (anahtar tanımlı + Android)? */
export function isPurchasingAvailable(): boolean {
  return Platform.OS === "android" && REVENUECAT_ANDROID_API_KEY !== undefined;
}

/**
 * İlk çağrıda yapılandırır; sonraki çağrılarda kullanıcı değiştiyse RevenueCat kimliğini
 * değiştirir (aynı kullanıcı için idempotent). Anahtar yoksa/Android değilse false döner.
 */
export function initializePurchases(userId: string): Promise<boolean> {
  return serializeIdentity(() => configureIdentity(userId));
}

async function configureIdentity(userId: string): Promise<boolean> {
  if (!isPurchasingAvailable() || REVENUECAT_ANDROID_API_KEY === undefined) {
    return false;
  }
  if (!configured) {
    Purchases.configure({ apiKey: REVENUECAT_ANDROID_API_KEY, appUserID: userId });
    configured = true;
    currentUserId = userId;
    return true;
  }
  if ((await Purchases.getAppUserID()) !== userId) {
    packageCache = new Map();
    await Purchases.logIn(userId);
  }
  currentUserId = userId;
  return true;
}

/**
 * Çıkışta çağrılır: RevenueCat önbelleğindeki müşteri bilgisi (abonelik) bir sonraki hesaba
 * görünmesin. RevenueCat anonim bir kullanıcı için logOut'ta hata verdiği için o durum atlanır.
 */
export function logOutPurchases(): Promise<void> {
  return serializeIdentity(clearIdentity);
}
async function clearIdentity(): Promise<void> {
  currentUserId = null;
  if (!configured) {
    return;
  }
  packageCache = new Map();
  if (await Purchases.isAnonymous()) {
    return;
  }
  await Purchases.logOut();
}

export function fetchPaywallPackages(expectedUserId?: string): Promise<PaywallPackage[]> {
  return serializeIdentity(async () => {
  if (expectedUserId && expectedUserId !== currentUserId) throw new Error("Satın alma hesabı değişti.");
  if (!configured) {
    throw new Error("Purchases yapılandırılmadı (anahtar tanımsız ya da henüz başlatılmadı).");
  }
  const offerings = await Purchases.getOfferings();
  const available = (offerings.current?.availablePackages ?? []).filter((pkg) => {
    const option = pkg.product.defaultOption;
    return option !== null && !option?.isPrepaid && !option?.installmentsInfo;
  });
  packageCache = new Map(available.map((p) => [p.identifier, p]));
  // Android'de uygun teklif defaultOption'dır; introPrice tek başına eski denemeyi gösterebilir.
  return buildPaywallPackages(available.map((pkg) => {
    const option = pkg.product.defaultOption;
    if (option === undefined) return pkg;
    const free = option?.freePhase;
    const full = option?.fullPricePhase;
    const intro = option?.introPhase;
    return { ...pkg, product: { ...pkg.product,
      price: full ? full.price.amountMicros / 1_000_000 : pkg.product.price,
      priceString: full?.price.formatted ?? pkg.product.priceString,
      introductoryPriceLabel: intro ? `İlk ${intro.billingCycleCount ?? 1} dönem, her ${intro.billingPeriod.value} ${intro.billingPeriod.unit === "MONTH" ? "ay" : intro.billingPeriod.unit === "WEEK" ? "hafta" : intro.billingPeriod.unit === "YEAR" ? "yıl" : "gün"} için ${intro.price.formatted}` : null,
      introPrice: free ? { price: 0, periodUnit: free.billingPeriod.unit, periodNumberOfUnits: free.billingPeriod.value * (free.billingCycleCount ?? 1) } : null,
    } };
  }));
  });
}

function errorCodeOf(error: unknown): string | undefined {
  return typeof error === "object" && error !== null && "code" in error ? String((error as { code: unknown }).code) : undefined;
}

export function purchasePackageById(id: string, expectedUserId?: string): Promise<PurchaseOutcome> {
  return serializeIdentity(async () => {
  if (expectedUserId && expectedUserId !== currentUserId) throw new Error("Satın alma hesabı değişti.");
  const pkg = packageCache.get(id);
  if (!pkg) {
    throw new Error(`Bilinmeyen paket: ${id}`);
  }
  try {
    await Purchases.purchasePackage(pkg);
    // Mağaza işlemi tamamlandıysa yeniden satın almaya yönlendirmeyiz; erişimi backend doğrular.
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
  });
}

/** Geri yükleme sonrası aktif abonelik var mı? */
export function restoreAndCheck(expectedUserId?: string): Promise<boolean> {
  return serializeIdentity(async () => {
  if (expectedUserId && expectedUserId !== currentUserId) throw new Error("Geri yükleme hesabı değişti.");
  const customerInfo = await Purchases.restorePurchases();
  return hasActiveEntitlement(customerInfo);
  });
}

/**
 * 2026-10-28 — "Aboneliği yönet / iptal et". Play politikası gereği uygulama aboneliği kendisi
 * iptal etmez; kullanıcı Google Play'in abonelik sayfasına yönlendirilir (iptal Google Play onay adımlarıyla yapılır, uygun deneme süresi içinde iptal edilirse ücret alınmaz). Önce RevenueCat'in bu kullanıcı
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

/** SDK güncellemesi erişim vermez; sadece backend doğrulamasını tetikler. */
export function subscribeToPurchaseUpdates(onChanged: () => void): () => void {
  if (!configured) return () => {};
  const listener = () => onChanged();
  Purchases.addCustomerInfoUpdateListener(listener);
  return () => Purchases.removeCustomerInfoUpdateListener(listener);
}
