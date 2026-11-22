import { Linking, Platform } from "react-native";
import Purchases, { type IntroEligibility, type PurchasesPackage } from "react-native-purchases";
import { REVENUECAT_ANDROID_API_KEY, REVENUECAT_ENTITLEMENT_ID, REVENUECAT_IOS_API_KEY } from "../../shared/revenuecat-config";
import { buildPaywallPackages, type PaywallPackage, type RawPackage } from "./paywall-model";

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
 *
 * 2026-11-20 — iOS yayını: satın alma artık iOS'ta da açık (App Store, RevenueCat iOS anahtarı).
 * Platform → anahtar seçimi ve mağazaya özgü ürün alanlarının (Google Play `defaultOption` /
 * StoreKit `introPrice`) ortak `RawPackage` şekline çevrilmesi BURADA kalıyor — SDK'yı bilen tek dosya
 * kuralı bozulmasın, model/UI hangi mağazada çalıştığını bilmesin.
 */

export type PurchaseOutcome = "purchased" | "cancelled" | "pending" | "already-owned";

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

/**
 * 2026-11-20 — iOS yayını: platforma göre RevenueCat PUBLIC anahtarı. iOS ve Android'in anahtarları
 * ayrı (RevenueCat'te her mağaza ayrı "app"); web vb. platformlarda satın alma bilinçli olarak yok.
 */
function platformApiKey(): string | undefined {
  if (Platform.OS === "ios") return REVENUECAT_IOS_API_KEY;
  if (Platform.OS === "android") return REVENUECAT_ANDROID_API_KEY;
  return undefined;
}

/** Satın alma bu build/platformda kullanılabilir mi (iOS/Android + o platformun anahtarı tanımlı)? */
export function isPurchasingAvailable(): boolean {
  return platformApiKey() !== undefined;
}

/**
 * İlk çağrıda yapılandırır; sonraki çağrılarda kullanıcı değiştiyse RevenueCat kimliğini
 * değiştirir (aynı kullanıcı için idempotent). Platformun anahtarı yoksa (ya da iOS/Android değilse) false döner.
 */
export function initializePurchases(userId: string): Promise<boolean> {
  return serializeIdentity(() => configureIdentity(userId));
}

async function configureIdentity(userId: string): Promise<boolean> {
  const apiKey = platformApiKey();
  if (apiKey === undefined) {
    return false;
  }
  if (!configured) {
    Purchases.configure({ apiKey, appUserID: userId });
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
  const packages = offerings.current?.availablePackages ?? [];
  // 2026-11-20 — iOS yayını: `defaultOption` yalnız Google Play'de dolu (iOS'ta null) — Android filtresi
  // iOS'ta TÜM paketleri eliyordu (boş paywall). Bu yüzden mağazaya göre iki ayrı çeviri yolu var;
  // ön ödemeli/taksitli teklif kavramı Google Play'e özgü, iOS'ta filtre yok.
  const available = Platform.OS === "ios" ? packages : packages.filter((pkg) => {
    const option = pkg.product.defaultOption;
    return option !== null && !option?.isPrepaid && !option?.installmentsInfo;
  });
  packageCache = new Map(available.map((p) => [p.identifier, p]));
  return buildPaywallPackages(Platform.OS === "ios" ? await toAppStorePackages(available) : available.map(toGooglePlayPackage));
  });
}

/** "İlk 3 dönem, her 1 ay için ₺49,99" — indirimli (ücretsiz OLMAYAN) tanıtım dönemi metni; iki mağaza aynı cümleyi kullanır. */
function introductoryLabel(cycles: number, units: number, unit: string, price: string): string {
  return `İlk ${cycles} dönem, her ${units} ${unit === "MONTH" ? "ay" : unit === "WEEK" ? "hafta" : unit === "YEAR" ? "yıl" : "gün"} için ${price}`;
}

// Android'de uygun teklif defaultOption'dır; introPrice tek başına eski denemeyi gösterebilir.
function toGooglePlayPackage(pkg: PurchasesPackage): RawPackage {
  const option = pkg.product.defaultOption;
  if (option === undefined) return pkg;
  const free = option?.freePhase;
  const full = option?.fullPricePhase;
  const intro = option?.introPhase;
  return { ...pkg, product: { ...pkg.product,
    price: full ? full.price.amountMicros / 1_000_000 : pkg.product.price,
    priceString: full?.price.formatted ?? pkg.product.priceString,
    introductoryPriceLabel: intro ? introductoryLabel(intro.billingCycleCount ?? 1, intro.billingPeriod.value, intro.billingPeriod.unit, intro.price.formatted) : null,
    introPrice: free ? { price: 0, periodUnit: free.billingPeriod.unit, periodNumberOfUnits: free.billingPeriod.value * (free.billingCycleCount ?? 1) } : null,
  } };
}

/**
 * 2026-11-20 — iOS yayını: StoreKit ürünü. `introPrice`, kullanıcı denemeyi daha önce kullanmış olsa bile
 * döner (Apple'da uygunluk ürüne değil kullanıcıya bağlı; Android'de bunu defaultOption zaten çözüyor).
 * Bu yüzden teklif yalnız RevenueCat uygunluğu açıkça ELIGIBLE derse gösterilir; UNKNOWN/INELIGIBLE ya da
 * sorgu hatası "uygun değil" sayılır — doğrulayamadığımız bir ücretsiz denemeyi asla vaat etmeyiz (Apple 3.1.2:
 * ödeme ekranında yanlış "ücretsiz" sözü, kullanıcının beklemediği bir ücret demek). Süre = birim × dönem sayısı.
 */
async function toAppStorePackages(packages: readonly PurchasesPackage[]): Promise<RawPackage[]> {
  const withIntro = packages.filter((pkg) => pkg.product.introPrice !== null).map((pkg) => pkg.product.identifier);
  let eligibility: Record<string, IntroEligibility> = {};
  if (withIntro.length > 0) {
    try {
      eligibility = await Purchases.checkTrialOrIntroductoryPriceEligibility(withIntro);
    } catch {
      // Uygunluk bilinmiyorsa paywall yine açılır, yalnız tanıtım teklifi olmadan (tam fiyat).
    }
  }
  return packages.map((pkg) => {
    const intro = eligibility[pkg.product.identifier]?.status === Purchases.INTRO_ELIGIBILITY_STATUS.INTRO_ELIGIBILITY_STATUS_ELIGIBLE ? pkg.product.introPrice : null;
    const free = intro !== null && intro.price === 0;
    return { ...pkg, product: { ...pkg.product,
      introductoryPriceLabel: intro !== null && !free ? introductoryLabel(intro.cycles, intro.periodNumberOfUnits, intro.periodUnit, intro.priceString) : null,
      introPrice: intro !== null && free ? { price: 0, periodUnit: intro.periodUnit, periodNumberOfUnits: intro.periodNumberOfUnits * intro.cycles } : null,
    } };
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
    if (code === Purchases.PURCHASES_ERROR_CODE.PRODUCT_ALREADY_PURCHASED_ERROR) {
      return "already-owned";
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
/** 2026-11-20 — iOS yayını: managementURL yoksa Apple'ın genel abonelik yönetimi sayfası (iOS'ta abonelik ayarlarını açar). */
const APP_STORE_SUBSCRIPTIONS_URL = "https://apps.apple.com/account/subscriptions";

export async function openSubscriptionManagement(): Promise<void> {
  const fallback = Platform.OS === "ios" ? APP_STORE_SUBSCRIPTIONS_URL : PLAY_SUBSCRIPTIONS_URL;
  let url = fallback;
  if (configured) {
    try {
      url = (await Purchases.getCustomerInfo()).managementURL ?? fallback;
    } catch {
      // Ağ hatasında da kullanıcı iptal yolunu kaybetmemeli: mağazanın genel abonelik sayfası açılır.
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

/** Ekran yeniden açıldığında SDK önbelleği değil güncel müşteri durumu kontrol edilir.
 * Bu yalnızca backend doğrulamasını başlatır; tek başına erişim vermez. */
export function hasCurrentSubscription(expectedUserId: string): Promise<boolean> {
  return serializeIdentity(async () => {
    if (!configured || currentUserId !== expectedUserId) throw new Error("Abonelik hesabı değişti.");
    await Purchases.invalidateCustomerInfoCache();
    return hasActiveEntitlement(await Purchases.getCustomerInfo());
  });
}
