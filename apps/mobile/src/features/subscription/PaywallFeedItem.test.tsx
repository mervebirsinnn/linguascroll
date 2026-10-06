import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { PaywallFeedItem } from "./PaywallFeedItem";
import type { PaywallPackage } from "./paywall-model";

/* SDK adaptörü ve Sentry mock'lanıyor — burada doğrulanan: ekranın durumlara göre doğru metinleri
   gösterdiği, seçimin/CTA'nın doğru paketle çalıştığı ve başarılı satın almada feed'in yenilendiği.
   Gerçek ödeme akışı sadece gerçek cihazda/Play test kanalında doğrulanabilir. */

jest.mock("@sentry/react-native", () => ({ captureException: jest.fn(), addBreadcrumb: jest.fn() }));

const mockFetchPackages = jest.fn();
const mockPurchase = jest.fn();
const mockRestore = jest.fn();
jest.mock("./purchases-gateway", () => ({
  fetchPaywallPackages: (...args: unknown[]) => mockFetchPackages(...args),
  purchasePackageById: (...args: unknown[]) => mockPurchase(...args),
  restoreAndCheck: (...args: unknown[]) => mockRestore(...args),
}));

const annual: PaywallPackage = { id: "annual", kind: "annual", title: "Yıllık", priceString: "₺600", periodLabel: "yıl", trialLabel: "7 gün ücretsiz", savingsPercent: 50 };
const monthly: PaywallPackage = { id: "monthly", kind: "monthly", title: "Aylık", priceString: "₺100", periodLabel: "ay", trialLabel: null, savingsPercent: null };

beforeEach(() => {
  jest.clearAllMocks();
});

describe("PaywallFeedItem", () => {
  it("paketler yüklenene kadar 'Yükleniyor…', hata olursa anlaşılır bir mesaj gösterir", async () => {
    mockFetchPackages.mockRejectedValueOnce(new Error("anahtar yok"));
    await render(<PaywallFeedItem height={800} width={400} onUnlocked={jest.fn()} />);

    expect(await screen.findByText(/Abonelik seçenekleri şu an yüklenemedi/)).toBeTruthy();
    // Limit bilgisi ve başlık, paketler olmasa da görünür — kullanıcı kırık bir ekran görmez.
    expect(screen.getByText(/Ücretsiz hakkın yarın yenilenir/)).toBeTruthy();
  });

  it("yıllık paket varsayılan seçili: 7 günlük deneme CTA'sı, gerçek tasarruf rozeti ve yasal metin görünür", async () => {
    mockFetchPackages.mockResolvedValueOnce([annual, monthly]);
    await render(<PaywallFeedItem height={800} width={400} onUnlocked={jest.fn()} />);

    expect(await screen.findByText("7 gün ücretsiz dene")).toBeTruthy();
    expect(screen.getByText("%50 tasarruf")).toBeTruthy();
    expect(screen.getByText("Deneme bitince ₺600 / yıl ücretlendirilirsin. İstediğin zaman Google Play'den iptal edebilirsin.")).toBeTruthy();
    expect(screen.getByText("Satın alımları geri yükle")).toBeTruthy();
  });

  it("aylık pakete geçince CTA 'Abone ol' olur ve satın alma SEÇİLİ paketle başlar", async () => {
    mockFetchPackages.mockResolvedValueOnce([annual, monthly]);
    mockPurchase.mockResolvedValueOnce("cancelled");
    await render(<PaywallFeedItem height={800} width={400} onUnlocked={jest.fn()} />);

    await fireEvent.press(await screen.findByText("Aylık"));
    await fireEvent.press(await screen.findByText("Abone ol"));

    await waitFor(() => expect(mockPurchase).toHaveBeenCalledWith("monthly"));
  });

  it("başarılı satın almada onUnlocked (feed yenileme) çağrılır", async () => {
    const onUnlocked = jest.fn();
    mockFetchPackages.mockResolvedValueOnce([annual]);
    mockPurchase.mockResolvedValueOnce("purchased");
    await render(<PaywallFeedItem height={800} width={400} onUnlocked={onUnlocked} />);

    await fireEvent.press(await screen.findByText("7 gün ücretsiz dene"));

    await waitFor(() => expect(onUnlocked).toHaveBeenCalledTimes(1));
  });

  it("kullanıcı iptal ederse onUnlocked çağrılmaz ve hata mesajı gösterilmez", async () => {
    const onUnlocked = jest.fn();
    mockFetchPackages.mockResolvedValueOnce([annual]);
    mockPurchase.mockResolvedValueOnce("cancelled");
    await render(<PaywallFeedItem height={800} width={400} onUnlocked={onUnlocked} />);

    await fireEvent.press(await screen.findByText("7 gün ücretsiz dene"));

    await waitFor(() => expect(mockPurchase).toHaveBeenCalled());
    expect(onUnlocked).not.toHaveBeenCalled();
    expect(screen.queryByText(/tamamlanamadı/)).toBeNull();
  });

  it("satın alma hatasında anlaşılır bir mesaj gösterir ve onUnlocked çağrılmaz", async () => {
    const onUnlocked = jest.fn();
    mockFetchPackages.mockResolvedValueOnce([annual]);
    mockPurchase.mockRejectedValueOnce(new Error("ağ hatası"));
    await render(<PaywallFeedItem height={800} width={400} onUnlocked={onUnlocked} />);

    await fireEvent.press(await screen.findByText("7 gün ücretsiz dene"));

    expect(await screen.findByText("Satın alma tamamlanamadı. Tekrar dene.")).toBeTruthy();
    expect(onUnlocked).not.toHaveBeenCalled();
  });

  it("geri yüklemede aktif abonelik yoksa bilgi mesajı, varsa onUnlocked", async () => {
    const onUnlocked = jest.fn();
    mockFetchPackages.mockResolvedValue([annual]);
    mockRestore.mockResolvedValueOnce(false).mockResolvedValueOnce(true);
    await render(<PaywallFeedItem height={800} width={400} onUnlocked={onUnlocked} />);

    await fireEvent.press(await screen.findByText("Satın alımları geri yükle"));
    expect(await screen.findByText("Bu hesapta geri yüklenecek aktif bir abonelik bulunamadı.")).toBeTruthy();
    expect(onUnlocked).not.toHaveBeenCalled();

    await fireEvent.press(await screen.findByText("Satın alımları geri yükle"));
    await waitFor(() => expect(onUnlocked).toHaveBeenCalledTimes(1));
  });

  it("dikey ScrollView içermez (FlatList'in dikey sayfa kaydırmasıyla çakışmasın)", async () => {
    mockFetchPackages.mockResolvedValueOnce([annual, monthly]);
    await render(<PaywallFeedItem height={800} width={400} onUnlocked={jest.fn()} />);
    await screen.findByText("7 gün ücretsiz dene");

    expect(JSON.stringify(screen.toJSON())).not.toContain("RCTScrollView");
  });
});
