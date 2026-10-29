import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import type { AccountLinkControl } from "../identity/auth-state";
import { PaywallFeedItem } from "./PaywallFeedItem";
import type { PaywallPackage } from "./paywall-model";

/* SDK adaptörü ve Sentry mock'lanıyor — burada doğrulanan: ekranın durumlara göre doğru metinleri
   gösterdiği, seçimin/CTA'nın doğru paketle çalıştığı ve başarılı satın almada feed'in yenilendiği.
   Gerçek ödeme akışı sadece gerçek cihazda/Play test kanalında doğrulanabilir. */

jest.mock("@sentry/react-native", () => ({ captureException: jest.fn(), addBreadcrumb: jest.fn() }));

const USER_ID = "00000000-0000-4000-8000-000000000001";

// 2026-10-27 — backend doğrulaması (POST /subscriptions/refresh) mock'lanıyor: erişim SDK sonucuyla
// değil, backend'in `active: true` yanıtıyla açılmalı.
const mockRefreshSubscription = jest.fn();
jest.mock("./api/refresh-subscription", () => ({
  refreshSubscription: (...args: unknown[]) => mockRefreshSubscription(...args),
}));

const mockFetchPackages = jest.fn();
const mockPurchase = jest.fn();
const mockRestore = jest.fn();
jest.mock("./purchases-gateway", () => ({
  initializePurchases: jest.fn().mockResolvedValue(true),
  fetchPaywallPackages: (...args: unknown[]) => mockFetchPackages(...args),
  purchasePackageById: (...args: unknown[]) => mockPurchase(...args),
  restoreAndCheck: (...args: unknown[]) => mockRestore(...args),
}));

const annual: PaywallPackage = { id: "annual", kind: "annual", title: "Yıllık", priceString: "₺600", periodLabel: "yıl", trialLabel: "7 gün ücretsiz", trialPeriod: "7 gün", savingsPercent: 50 };
const monthly: PaywallPackage = { id: "monthly", kind: "monthly", title: "Aylık", priceString: "₺100", periodLabel: "ay", trialLabel: null, trialPeriod: null, savingsPercent: null };

// Google hesabı bağlı kullanıcı (mevcut satın alma testleri) ve 2026-10-28 misafir kullanıcı.
const LINKED: AccountLinkControl = { isAnonymous: false, linking: false, notice: null, onLinkAccount: () => {} };
function guestAccount(overrides: Partial<AccountLinkControl> = {}): AccountLinkControl {
  return { isAnonymous: true, linking: false, notice: null, onLinkAccount: jest.fn(), ...overrides };
}

// Dosyadaki İLK render RN modüllerinin soğuk yüklenmesini ödüyor (Feed.test.tsx ile aynı bulgu):
// tam suite yük altında ilk test 5 sn varsayılanı aştı, tek başına 8 sn'de 13/13 geçti.
jest.setTimeout(60_000);

beforeEach(() => {
  jest.clearAllMocks();
  mockRefreshSubscription.mockResolvedValue({ active: true });
});

describe("PaywallFeedItem", () => {
  it("paketler yüklenene kadar 'Yükleniyor…', hata olursa anlaşılır bir mesaj gösterir", async () => {
    mockFetchPackages.mockRejectedValueOnce(new Error("anahtar yok"));
    await render(<PaywallFeedItem height={800} width={400} userId={USER_ID} account={LINKED} onUnlocked={jest.fn()} />);

    expect(await screen.findByText(/Abonelik seçenekleri şu an yüklenemedi/)).toBeTruthy();
    // Limit bilgisi ve başlık, paketler olmasa da görünür — kullanıcı kırık bir ekran görmez.
    expect(screen.getByText(/10 ücretsiz videonu izledin/)).toBeTruthy();
  });

  it("yükleme başarısız olursa kullanıcı seçenekleri yeniden yükleyebilir", async () => {
    mockFetchPackages.mockRejectedValueOnce(new Error("ağ")).mockResolvedValueOnce([annual]);
    await render(<PaywallFeedItem height={800} width={400} userId={USER_ID} account={LINKED} onUnlocked={jest.fn()} />);
    await fireEvent.press(await screen.findByText("Seçenekleri yeniden yükle"));
    expect(await screen.findByText("7 gün ücretsiz dene")).toBeTruthy();
    expect(mockFetchPackages).toHaveBeenCalledTimes(2);
  });

  it("yıllık paket varsayılan seçili: 7 günlük deneme CTA'sı, gerçek tasarruf rozeti ve yasal metin görünür", async () => {
    mockFetchPackages.mockResolvedValueOnce([annual, monthly]);
    await render(<PaywallFeedItem height={800} width={400} userId={USER_ID} account={LINKED} onUnlocked={jest.fn()} />);

    expect(await screen.findByText("7 gün ücretsiz dene")).toBeTruthy();
    expect(screen.getByText("%50 tasarruf")).toBeTruthy();
    expect(screen.getByText(/^İlk 7 gün ücretsiz\. 7 gün içinde iptal edersen hiçbir ücret ödemezsin\. İptal etmezsen deneme bitince ₺600 \/ yıl/)).toBeTruthy();
    expect(screen.getByText("Satın alımları geri yükle")).toBeTruthy();
  });

  describe("misafir (girişsiz) kullanıcı — 2026-10-28", () => {
    it("fiyat ve 7 gün iptal metni girişten ÖNCE görünür; ana buton 'Google ile devam et', satın alma başlatılamaz", async () => {
      const account = guestAccount();
      mockFetchPackages.mockResolvedValueOnce([annual, monthly]);
      await render(<PaywallFeedItem height={800} width={400} userId={USER_ID} account={account} onUnlocked={jest.fn()} />);

      expect(await screen.findByText("₺600 / yıl")).toBeTruthy();
      expect(screen.getByText(/7 gün içinde iptal edersen hiçbir ücret ödemezsin/)).toBeTruthy();
      expect(screen.queryByText("7 gün ücretsiz dene")).toBeNull();
      expect(screen.queryByText("Satın alımları geri yükle")).toBeNull();

      await fireEvent.press(screen.getByText("Google ile devam et"));
      expect(account.onLinkAccount).toHaveBeenCalledTimes(1);
      expect(mockPurchase).not.toHaveBeenCalled();
    });

    it("bağlama sürerken buton pasif; bağlama hatası bildirimi gösterilir", async () => {
      mockFetchPackages.mockResolvedValue([annual]);
      await render(<PaywallFeedItem height={800} width={400} userId={USER_ID} account={guestAccount({ linking: true })} onUnlocked={jest.fn()} />);
      expect(await screen.findByText("₺600 / yıl")).toBeTruthy();
      expect(screen.queryByText("Google ile devam et")).toBeNull(); // yerinde bekleme göstergesi (ActivityIndicator)

      await render(
        <PaywallFeedItem height={800} width={400} userId={USER_ID} account={guestAccount({ notice: "Google ile giriş yapılamadı." })} onUnlocked={jest.fn()} />,
      );
      expect(await screen.findByText("Google ile giriş yapılamadı.")).toBeTruthy();
    });

    it("hesap bağlanınca (account değişir) aynı ekranda buton satın almaya döner", async () => {
      mockFetchPackages.mockResolvedValueOnce([annual]);
      mockPurchase.mockResolvedValueOnce("cancelled");
      const view = await render(<PaywallFeedItem height={800} width={400} userId={USER_ID} account={guestAccount()} onUnlocked={jest.fn()} />);
      expect(await screen.findByText("Google ile devam et")).toBeTruthy();

      await view.rerender(<PaywallFeedItem height={800} width={400} userId={USER_ID} account={LINKED} onUnlocked={jest.fn()} />);
      await fireEvent.press(await screen.findByText("7 gün ücretsiz dene"));
      await waitFor(() => expect(mockPurchase).toHaveBeenCalledWith("annual"));
    });
  });

  it("aylık pakete geçince CTA 'Abone ol' olur ve satın alma SEÇİLİ paketle başlar", async () => {
    mockFetchPackages.mockResolvedValueOnce([annual, monthly]);
    mockPurchase.mockResolvedValueOnce("cancelled");
    await render(<PaywallFeedItem height={800} width={400} userId={USER_ID} account={LINKED} onUnlocked={jest.fn()} />);

    await fireEvent.press(await screen.findByText("Aylık"));
    await fireEvent.press(await screen.findByText("Abone ol"));

    await waitFor(() => expect(mockPurchase).toHaveBeenCalledWith("monthly"));
  });

  it("satın alma başarılı ama backend aboneliği doğrulayamazsa erişim açılmaz; 'Tekrar dene' doğrulayınca açılır", async () => {
    const onUnlocked = jest.fn();
    mockFetchPackages.mockResolvedValueOnce([annual]);
    mockPurchase.mockResolvedValueOnce("purchased");
    mockRefreshSubscription.mockResolvedValueOnce({ active: false }).mockResolvedValueOnce({ active: true });
    await render(<PaywallFeedItem height={800} width={400} userId={USER_ID} account={LINKED} onUnlocked={onUnlocked} />);

    await fireEvent.press(await screen.findByText("7 gün ücretsiz dene"));
    expect(await screen.findByText(/aboneliğin henüz doğrulanamadı/)).toBeTruthy();
    expect(onUnlocked).not.toHaveBeenCalled();

    await fireEvent.press(screen.getByText("Tekrar dene"));
    await waitFor(() => expect(onUnlocked).toHaveBeenCalledTimes(1));
    expect(mockRefreshSubscription).toHaveBeenCalledTimes(2); // kimlik token'da — userId gönderilmez
  });

  it("doğrulama isteği ağ hatası verirse de erişim açılmaz ve yeniden deneme sunulur", async () => {
    const onUnlocked = jest.fn();
    mockFetchPackages.mockResolvedValueOnce([annual]);
    mockPurchase.mockResolvedValueOnce("purchased");
    mockRefreshSubscription.mockRejectedValueOnce(new Error("ağ"));
    await render(<PaywallFeedItem height={800} width={400} userId={USER_ID} account={LINKED} onUnlocked={onUnlocked} />);

    await fireEvent.press(await screen.findByText("7 gün ücretsiz dene"));
    expect(await screen.findByText("Tekrar dene")).toBeTruthy();
    expect(onUnlocked).not.toHaveBeenCalled();
  });

  it("başarılı satın alma backend'de doğrulanınca onUnlocked (feed yenileme) çağrılır", async () => {
    const onUnlocked = jest.fn();
    mockFetchPackages.mockResolvedValueOnce([annual]);
    mockPurchase.mockResolvedValueOnce("purchased");
    await render(<PaywallFeedItem height={800} width={400} userId={USER_ID} account={LINKED} onUnlocked={onUnlocked} />);

    await fireEvent.press(await screen.findByText("7 gün ücretsiz dene"));

    await waitFor(() => expect(onUnlocked).toHaveBeenCalledTimes(1));
  });

  it("kullanıcı iptal ederse onUnlocked çağrılmaz ve hata mesajı gösterilmez", async () => {
    const onUnlocked = jest.fn();
    mockFetchPackages.mockResolvedValueOnce([annual]);
    mockPurchase.mockResolvedValueOnce("cancelled");
    await render(<PaywallFeedItem height={800} width={400} userId={USER_ID} account={LINKED} onUnlocked={onUnlocked} />);

    await fireEvent.press(await screen.findByText("7 gün ücretsiz dene"));

    await waitFor(() => expect(mockPurchase).toHaveBeenCalled());
    expect(onUnlocked).not.toHaveBeenCalled();
    expect(mockRefreshSubscription).not.toHaveBeenCalled();
    expect(screen.queryByText(/tamamlanamadı/)).toBeNull();
  });

  it("satın alma hatasında anlaşılır bir mesaj gösterir ve onUnlocked çağrılmaz", async () => {
    const onUnlocked = jest.fn();
    mockFetchPackages.mockResolvedValueOnce([annual]);
    mockPurchase.mockRejectedValueOnce(new Error("ağ hatası"));
    await render(<PaywallFeedItem height={800} width={400} userId={USER_ID} account={LINKED} onUnlocked={onUnlocked} />);

    await fireEvent.press(await screen.findByText("7 gün ücretsiz dene"));

    expect(await screen.findByText("Satın alma tamamlanamadı. Tekrar dene.")).toBeTruthy();
    expect(onUnlocked).not.toHaveBeenCalled();
  });

  it("geri yüklemede aktif abonelik yoksa bilgi mesajı, varsa onUnlocked", async () => {
    const onUnlocked = jest.fn();
    mockFetchPackages.mockResolvedValue([annual]);
    mockRestore.mockResolvedValueOnce(false).mockResolvedValueOnce(true);
    await render(<PaywallFeedItem height={800} width={400} userId={USER_ID} account={LINKED} onUnlocked={onUnlocked} />);

    await fireEvent.press(await screen.findByText("Satın alımları geri yükle"));
    expect(await screen.findByText("Bu hesapta geri yüklenecek aktif bir abonelik bulunamadı.")).toBeTruthy();
    expect(onUnlocked).not.toHaveBeenCalled();

    await fireEvent.press(await screen.findByText("Satın alımları geri yükle"));
    await waitFor(() => expect(onUnlocked).toHaveBeenCalledTimes(1));
  });

  it("dikey ScrollView içermez (FlatList'in dikey sayfa kaydırmasıyla çakışmasın)", async () => {
    mockFetchPackages.mockResolvedValueOnce([annual, monthly]);
    await render(<PaywallFeedItem height={800} width={400} userId={USER_ID} account={LINKED} onUnlocked={jest.fn()} />);
    await screen.findByText("7 gün ücretsiz dene");

    expect(JSON.stringify(screen.toJSON())).not.toContain("RCTScrollView");
  });
});
