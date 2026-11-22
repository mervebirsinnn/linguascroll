import { Alert } from "react-native";
import { fireEvent, render, screen } from "@testing-library/react-native";
import { AccountScreen } from "./AccountScreen";
import { useAccountSubscription } from "./use-account-subscription";

jest.mock("react-native-safe-area-context", () => ({ useSafeAreaInsets: () => ({ top: 24, bottom: 24, left: 0, right: 0 }) }));
jest.mock("../subscription/PaywallFeedItem", () => ({ PaywallFeedItem: () => null }));
jest.mock("./use-account-subscription", () => ({ useAccountSubscription: jest.fn() }));
// 2026-11-20 — iOS yayını: mağaza adı testte değiştirilebilir (jest-expo varsayılan platformu iOS); Apple butonunun
// native görünümü Jest'te yok, aynı props sözleşmesini taşıyan test dublörü kullanılıyor.
let mockStoreName: "App Store" | "Google Play" = "Google Play";
jest.mock("../subscription/store-name", () => ({
  get STORE_NAME() {
    return mockStoreName;
  },
}));
jest.mock("../identity/AppleSignInButton", () => {
  const { Pressable, Text } = jest.requireActual<typeof import("react-native")>("react-native");
  return {
    AppleSignInButton: ({ onPress, disabled }: { onPress: () => void; disabled: boolean }) => (
      <Pressable onPress={onPress} disabled={disabled} accessibilityRole="button" accessibilityState={{ disabled }}><Text>Apple ile devam et</Text></Pressable>
    ),
  };
});
const mockSubscription = jest.mocked(useAccountSubscription);
const account = { isAnonymous: false, linking: false, notice: null, onLinkAccount: jest.fn() };

beforeEach(() => {
  jest.clearAllMocks();
  mockStoreName = "Google Play";
  mockSubscription.mockReturnValue({ overview: null, status: "active", action: "idle", notice: null, refresh: jest.fn(), restore: jest.fn(), manage: jest.fn() });
});

// Windows/soğuk RN render ölçümü 11,7 sn; diğer testlerin zaman sınırı değişmez.
it("misafir yalnızca hesap bağlayabilir; çıkış ve mağaza eylemleri sunulmaz", async () => {
  await render(<AccountScreen userId="guest" account={{ ...account, isAnonymous: true }} onBack={jest.fn()} onSignOut={jest.fn()} />);
  await fireEvent.press(screen.getByText("Google ile devam et"));
  expect(account.onLinkAccount).toHaveBeenCalledTimes(1);
  expect(screen.queryByText("Apple ile devam et")).toBeNull(); // Android: onLinkAppleAccount yok → Apple butonu yok
  expect(screen.queryByText("Çıkış yap")).toBeNull();
  expect(screen.queryByText("Aboneliği yönet")).toBeNull();
  expect(screen.getByText("Hesap bağlamak abonelik başlatmaz.")).toBeTruthy();
}, 30000);

it("abonelik yönetimi ve geri yükleme doğru eylemlere bağlıdır", async () => {
  await render(<AccountScreen userId="linked" account={account} onBack={jest.fn()} onSignOut={jest.fn()} />);
  await fireEvent.press(screen.getByText("Aboneliği yönet"));
  await fireEvent.press(screen.getByText("Google Play’de yönet / iptal et".replace("’", "'")));
  expect(mockSubscription.mock.results[0]!.value.manage).toHaveBeenCalledTimes(1);
  await fireEvent.press(screen.getByText("Satın alımları geri yükle"));
  expect(mockSubscription.mock.results[0]!.value.restore).toHaveBeenCalledTimes(1);
  expect(screen.queryByText("Aboneliği yönet / iptal et")).toBeNull();
});

it("doğrulama hatasını ücretsiz veya Premium olarak sunmaz", async () => {
  mockSubscription.mockReturnValue({ overview: null, status: "unknown", action: "idle", notice: null, refresh: jest.fn(), restore: jest.fn(), manage: jest.fn() });
  await render(<AccountScreen userId="linked" account={account} onBack={jest.fn()} onSignOut={jest.fn()} />);
  expect(screen.getByText("Abonelik durumu")).toBeTruthy();
  expect(screen.queryByText("Premium")).toBeNull();
  expect(screen.queryByText("Ücretsiz erişim")).toBeNull();
});

it("çıkış hemen yapılmaz: açıklamalı onaydan sonra çalışır", async () => {
  const alert = jest.spyOn(Alert, "alert").mockImplementation(() => {});
  const onSignOut = jest.fn();
  await render(<AccountScreen userId="linked" account={account} onBack={jest.fn()} onSignOut={onSignOut} />);
  await fireEvent.press(screen.getByText("Çıkış yap"));
  expect(onSignOut).not.toHaveBeenCalled();
  expect(alert).toHaveBeenCalled();
  const buttons = alert.mock.calls[0]![2]!;
  buttons.find((button) => button.text === "Çıkış yap")!.onPress!();
  expect(onSignOut).toHaveBeenCalledTimes(1);
  alert.mockRestore();
});

describe("iOS yayını — 2026-11-20", () => {
  it("misafirde onLinkAppleAccount tanımlıysa Apple butonu Google'ın üstünde, aynı meşgul koşuluyla", async () => {
    const onLinkAppleAccount = jest.fn();
    const view = await render(<AccountScreen userId="guest" account={{ ...account, isAnonymous: true, onLinkAppleAccount }} onBack={jest.fn()} onSignOut={jest.fn()} />);
    const tree = JSON.stringify(screen.toJSON());
    expect(tree.indexOf("Apple ile devam et")).toBeGreaterThan(-1);
    expect(tree.indexOf("Apple ile devam et")).toBeLessThan(tree.indexOf("Google ile devam et"));
    await fireEvent.press(screen.getByText("Apple ile devam et"));
    expect(onLinkAppleAccount).toHaveBeenCalledTimes(1);
    expect(account.onLinkAccount).not.toHaveBeenCalled();

    await view.rerender(<AccountScreen userId="guest" account={{ ...account, isAnonymous: true, linking: true, onLinkAppleAccount }} onBack={jest.fn()} onSignOut={jest.fn()} />);
    await fireEvent.press(screen.getByText("Apple ile devam et"));
    expect(onLinkAppleAccount).toHaveBeenCalledTimes(1);
  }, 30000);

  it("Apple ile girmiş hesapta kimlik metinleri Apple'ı gösterir; varsayılan Google", async () => {
    const view = await render(<AccountScreen userId="linked" account={{ ...account, provider: "apple" }} onBack={jest.fn()} onSignOut={jest.fn()} />);
    expect(screen.getByText("Apple hesabın bağlı")).toBeTruthy();
    expect(screen.getByText("Apple ile giriş yapıldı")).toBeTruthy();
    expect(screen.getByText("A")).toBeTruthy();
    expect(screen.queryByText("Google hesabın bağlı")).toBeNull();

    await view.rerender(<AccountScreen userId="linked" account={account} onBack={jest.fn()} onSignOut={jest.fn()} />);
    expect(screen.getByText("Google hesabın bağlı")).toBeTruthy();
    expect(screen.getByText("Google ile giriş yapıldı")).toBeTruthy();
    expect(screen.getByText("G")).toBeTruthy();
  });

  it("App Store'da yönetim metinleri ve silme onayı App Store'u ve Apple yeniden doğrulamasını adlandırır", async () => {
    mockStoreName = "App Store";
    const alert = jest.spyOn(Alert, "alert").mockImplementation(() => {});
    await render(<AccountScreen userId="linked" account={{ ...account, provider: "apple", onDeleteAccount: jest.fn().mockResolvedValue(true) }} onBack={jest.fn()} onSignOut={jest.fn()} />);
    expect(screen.getByText("Plan, yenileme ve iptal işlemleri App Store'da.")).toBeTruthy();
    await fireEvent.press(screen.getByText("Aboneliği yönet"));
    expect(screen.getByText("App Store'da yönet / iptal et")).toBeTruthy();
    expect(screen.getByText(/Plan değişikliği ve iptal App Store'da tamamlanır/)).toBeTruthy();
    expect(JSON.stringify(screen.toJSON())).not.toContain("Google Play");

    await fireEvent.press(screen.getByText("Hesabımı sil"));
    const message = alert.mock.calls[0]![1]!;
    expect(message).toContain("App Store aboneliğin otomatik iptal olmaz");
    expect(message).toContain("Apple hesabını yeniden doğrulayacağız");
    expect(message).not.toContain("Google");
    alert.mockRestore();
  });

  it("Google ile girişte silme onayı Google'ı ve Google Play'i adlandırır (Android metni aynı)", async () => {
    const alert = jest.spyOn(Alert, "alert").mockImplementation(() => {});
    await render(<AccountScreen userId="linked" account={{ ...account, onDeleteAccount: jest.fn().mockResolvedValue(true) }} onBack={jest.fn()} onSignOut={jest.fn()} />);
    await fireEvent.press(screen.getByText("Hesabımı sil"));
    expect(alert.mock.calls[0]![1]).toBe("Kaydettiğin kelimeler, ilerlemen ve izleme geçmişin silinir. Bu işlem geri alınamaz. Google Play aboneliğin otomatik iptal olmaz; önce Aboneliği yönet bölümünden iptal edebilirsin. Devam edersen Google hesabını yeniden doğrulayacağız.");
    alert.mockRestore();
  });
});
