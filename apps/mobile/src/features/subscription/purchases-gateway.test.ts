/* RevenueCat SDK'sı native modül ister — testte tamamen mock'lanıyor; gerçek satın alma ancak
   gerçek cihazda/Play test kanalında doğrulanabilir. Burada doğrulanan: hata sınıflaması ve
   anahtarsız build'in güvenli davranışı. */

const mockConfig: { key: string | undefined; os: string } = { key: "goog_test_key", os: "android" };

const mockPurchases = {
  configure: jest.fn(),
  getAppUserID: jest.fn(),
  logIn: jest.fn(),
  logOut: jest.fn(),
  isAnonymous: jest.fn(),
  getOfferings: jest.fn(),
  purchasePackage: jest.fn(),
  restorePurchases: jest.fn(),
  invalidateCustomerInfoCache: jest.fn(),
  getCustomerInfo: jest.fn(),
  PURCHASES_ERROR_CODE: { PURCHASE_CANCELLED_ERROR: "1", PAYMENT_PENDING_ERROR: "20", PRODUCT_ALREADY_PURCHASED_ERROR: "6" },
};

jest.mock("react-native", () => ({
  Platform: {
    get OS() {
      return mockConfig.os;
    },
  },
}));
jest.mock("../../shared/revenuecat-config", () => ({
  get REVENUECAT_ANDROID_API_KEY() {
    return mockConfig.key;
  },
}));
jest.mock("react-native-purchases", () => ({ __esModule: true, default: mockPurchases }));

type Gateway = typeof import("./purchases-gateway");

function loadGateway(): Gateway {
  let gateway!: Gateway;
  jest.isolateModules(() => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    gateway = require("./purchases-gateway") as Gateway;
  });
  return gateway;
}

const ANNUAL = {
  identifier: "$rc_annual",
  packageType: "ANNUAL",
  product: { price: 600, priceString: "₺600", introPrice: { price: 0, periodUnit: "DAY", periodNumberOfUnits: 7 } },
};

function offeringsWith(...packages: unknown[]) {
  return { current: { availablePackages: packages } };
}

const ACTIVE = { entitlements: { active: { premium: {} } } };
const INACTIVE = { entitlements: { active: {} } };

beforeEach(() => {
  jest.clearAllMocks();
  mockConfig.key = "goog_test_key";
  mockConfig.os = "android";
});

describe("hasActiveEntitlement", () => {
  it("herhangi bir aktif entitlement varsa true, yoksa false", () => {
    const { hasActiveEntitlement } = loadGateway();
    expect(hasActiveEntitlement(ACTIVE)).toBe(true);
    expect(hasActiveEntitlement(INACTIVE)).toBe(false);
  });
});

describe("initializePurchases", () => {
  it("anahtar tanımsızsa SDK'yı hiç yapılandırmaz ve false döner (satın alma kapalı)", async () => {
    mockConfig.key = undefined;
    const { initializePurchases, isPurchasingAvailable } = loadGateway();

    expect(isPurchasingAvailable()).toBe(false);
    expect(await initializePurchases("user-1")).toBe(false);
    expect(mockPurchases.configure).not.toHaveBeenCalled();
  });

  it("Android dışında yapılandırmaz", async () => {
    mockConfig.os = "ios";
    const { initializePurchases } = loadGateway();
    expect(await initializePurchases("user-1")).toBe(false);
    expect(mockPurchases.configure).not.toHaveBeenCalled();
  });

  it("backend kullanıcı id'sini appUserID olarak verir; aynı kullanıcı için tekrar çağrı idempotent", async () => {
    const { initializePurchases } = loadGateway();
    mockPurchases.getAppUserID.mockResolvedValue("user-1");

    expect(await initializePurchases("user-1")).toBe(true);
    expect(await initializePurchases("user-1")).toBe(true);

    expect(mockPurchases.configure).toHaveBeenCalledTimes(1);
    expect(mockPurchases.configure).toHaveBeenCalledWith({ apiKey: "goog_test_key", appUserID: "user-1" });
    expect(mockPurchases.logIn).not.toHaveBeenCalled();
  });

  it("başka hesapla girişte RevenueCat kimliği yeni kullanıcıya değiştirilir (logIn) — abonelik eski hesapta kalır", async () => {
    const { initializePurchases } = loadGateway();
    await initializePurchases("user-1");
    mockPurchases.getAppUserID.mockResolvedValue("user-1");

    await initializePurchases("user-2");

    expect(mockPurchases.configure).toHaveBeenCalledTimes(1);
    expect(mockPurchases.logIn).toHaveBeenCalledWith("user-2");
  });
});

describe("logOutPurchases", () => {
  it("yapılandırılmamışsa hiçbir şey yapmaz", async () => {
    const { logOutPurchases } = loadGateway();
    await logOutPurchases();
    expect(mockPurchases.logOut).not.toHaveBeenCalled();
  });

  it("giriş yapılmış (anonim olmayan) RevenueCat kullanıcısını çıkarır", async () => {
    const { initializePurchases, logOutPurchases } = loadGateway();
    await initializePurchases("user-1");
    mockPurchases.isAnonymous.mockResolvedValue(false);

    await logOutPurchases();

    expect(mockPurchases.logOut).toHaveBeenCalledTimes(1);
  });

  it("RevenueCat zaten anonimse logOut çağrılmaz (SDK bu durumda hata verir)", async () => {
    const { initializePurchases, logOutPurchases } = loadGateway();
    await initializePurchases("user-1");
    mockPurchases.isAnonymous.mockResolvedValue(true);

    await logOutPurchases();

    expect(mockPurchases.logOut).not.toHaveBeenCalled();
  });
});

describe("fetchPaywallPackages", () => {
  it("yapılandırılmadan çağrılırsa hata fırlatır", async () => {
    const { fetchPaywallPackages } = loadGateway();
    await expect(fetchPaywallPackages()).rejects.toThrow();
  });

  it("current offering'in paketlerini paywall paketlerine çevirir; offering yoksa boş döner", async () => {
    const { initializePurchases, fetchPaywallPackages } = loadGateway();
    await initializePurchases("user-1");

    mockPurchases.getOfferings.mockResolvedValueOnce(offeringsWith(ANNUAL));
    expect(await fetchPaywallPackages()).toMatchObject([{ id: "$rc_annual", kind: "annual", trialLabel: "7 gün ücretsiz" }]);

    mockPurchases.getOfferings.mockResolvedValueOnce({ current: null });
    expect(await fetchPaywallPackages()).toEqual([]);
  });
});

describe("purchasePackageById", () => {
  async function setup() {
    const gateway = loadGateway();
    await gateway.initializePurchases("user-1");
    mockPurchases.getOfferings.mockResolvedValueOnce(offeringsWith(ANNUAL));
    await gateway.fetchPaywallPackages();
    return gateway;
  }

  it("aktif entitlement dönerse 'purchased'", async () => {
    const { purchasePackageById } = await setup();
    mockPurchases.purchasePackage.mockResolvedValueOnce({ customerInfo: ACTIVE });
    expect(await purchasePackageById("$rc_annual")).toBe("purchased");
  });

  it("kullanıcı iptal ederse 'cancelled' (hata fırlatılmaz)", async () => {
    const { purchasePackageById } = await setup();
    mockPurchases.purchasePackage.mockRejectedValueOnce({ code: "1", userCancelled: true });
    expect(await purchasePackageById("$rc_annual")).toBe("cancelled");
  });

  it("ödeme onay bekliyorsa 'pending'", async () => {
    const { purchasePackageById } = await setup();
    mockPurchases.purchasePackage.mockRejectedValueOnce({ code: "20" });
    expect(await purchasePackageById("$rc_annual")).toBe("pending");
  });

  it("gerçek bir SDK hatasını yutmaz, fırlatır", async () => {
    const { purchasePackageById } = await setup();
    const sdkError = { code: "10", message: "network" };
    mockPurchases.purchasePackage.mockRejectedValueOnce(sdkError);
    await expect(purchasePackageById("$rc_annual")).rejects.toBe(sdkError);
  });

  it("mağaza tamamlandıysa erişimi backend doğrular; tekrar satın almaya yönlendirilmez", async () => {
    const { purchasePackageById } = await setup();
    mockPurchases.purchasePackage.mockResolvedValueOnce({ customerInfo: INACTIVE });
    await expect(purchasePackageById("$rc_annual")).resolves.toBe("purchased");
  });

  it("bilinmeyen paket id'si SDK'ya hiç gitmeden hata verir", async () => {
    const { purchasePackageById } = await setup();
    await expect(purchasePackageById("yok")).rejects.toThrow();
    expect(mockPurchases.purchasePackage).not.toHaveBeenCalled();
  });
});

describe("restoreAndCheck", () => {
  it("geri yüklenen müşteride aktif abonelik varsa true, yoksa false", async () => {
    const { restoreAndCheck } = loadGateway();
    mockPurchases.restorePurchases.mockResolvedValueOnce(ACTIVE);
    expect(await restoreAndCheck()).toBe(true);
    mockPurchases.restorePurchases.mockResolvedValueOnce(INACTIVE);
    expect(await restoreAndCheck()).toBe(false);
  });
});

it("başka entitlement Premium erişim sağlamaz", () => {
  const { hasActiveEntitlement } = loadGateway();
  expect(hasActiveEntitlement({ entitlements: { active: { unrelated: {} } } })).toBe(false);
});

it("Android'de uygun defaultOption denemesi esas alınır; eski introPrice kullanılmaz", async () => {
  const gateway = loadGateway();
  await gateway.initializePurchases("one");
  mockPurchases.getOfferings.mockResolvedValueOnce(offeringsWith({ ...ANNUAL, product: { ...ANNUAL.product, defaultOption: { freePhase: null, introPhase: null, fullPricePhase: { price: { amountMicros: 700000000, formatted: "₺700" } } } } }));
  expect(await gateway.fetchPaywallPackages("one")).toMatchObject([{ priceString: "₺700", trialLabel: null }]);
});

it("hesap değiştiğinde eski hesabın satın alması SDK'ya gönderilmez", async () => {
  const gateway = loadGateway();
  await gateway.initializePurchases("one");
  mockPurchases.getOfferings.mockResolvedValueOnce(offeringsWith(ANNUAL));
  await gateway.fetchPaywallPackages("one");
  await gateway.initializePurchases("two");
  await expect(gateway.purchasePackageById("$rc_annual", "one")).rejects.toThrow("hesabı değişti");
  expect(mockPurchases.purchasePackage).not.toHaveBeenCalled();
});

it("zaten sahip olunan üründe yeni satın alma yerine kurtarma sonucu döner", async () => {
  const gateway = loadGateway();
  await gateway.initializePurchases("one");
  mockPurchases.getOfferings.mockResolvedValueOnce(offeringsWith(ANNUAL));
  await gateway.fetchPaywallPackages("one");
  mockPurchases.purchasePackage.mockRejectedValueOnce({ code: "6" });
  await expect(gateway.purchasePackageById("$rc_annual", "one")).resolves.toBe("already-owned");
});
it("mevcut aboneliği güncel müşteri bilgisinden kontrol eder; yanlış hesabı sorgulamaz", async () => {
  const gateway = loadGateway(); await gateway.initializePurchases("one");
  mockPurchases.getCustomerInfo.mockResolvedValueOnce(ACTIVE);
  await expect(gateway.hasCurrentSubscription("one")).resolves.toBe(true);
  expect(mockPurchases.invalidateCustomerInfoCache).toHaveBeenCalledTimes(1);
  await expect(gateway.hasCurrentSubscription("two")).rejects.toThrow();
  expect(mockPurchases.getCustomerInfo).toHaveBeenCalledTimes(1);
});
