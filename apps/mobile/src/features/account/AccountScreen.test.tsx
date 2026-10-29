import { Alert } from "react-native";
import { fireEvent, render, screen } from "@testing-library/react-native";
import { AccountScreen } from "./AccountScreen";
import { useAccountSubscription } from "./use-account-subscription";

jest.mock("react-native-safe-area-context", () => ({ useSafeAreaInsets: () => ({ top: 24, bottom: 24, left: 0, right: 0 }) }));
jest.mock("./use-account-subscription", () => ({ useAccountSubscription: jest.fn() }));
const mockSubscription = jest.mocked(useAccountSubscription);
const account = { isAnonymous: false, linking: false, notice: null, onLinkAccount: jest.fn() };

beforeEach(() => {
  jest.clearAllMocks();
  mockSubscription.mockReturnValue({ status: "active", action: "idle", notice: null, refresh: jest.fn(), restore: jest.fn(), manage: jest.fn() });
});

it("misafir yalnızca hesap bağlayabilir; çıkış ve mağaza eylemleri sunulmaz", async () => {
  await render(<AccountScreen userId="guest" account={{ ...account, isAnonymous: true }} onBack={jest.fn()} onSignOut={jest.fn()} />);
  await fireEvent.press(screen.getByText("Google ile devam et"));
  expect(account.onLinkAccount).toHaveBeenCalledTimes(1);
  expect(screen.queryByText("Çıkış yap")).toBeNull();
  expect(screen.queryByText("Aboneliği yönet")).toBeNull();
  expect(screen.getByText("Hesap bağlamak abonelik başlatmaz.")).toBeTruthy();
});

it("abonelik yönetimi ve geri yükleme doğru eylemlere bağlıdır", async () => {
  await render(<AccountScreen userId="linked" account={account} onBack={jest.fn()} onSignOut={jest.fn()} />);
  await fireEvent.press(screen.getByText("Aboneliği yönet"));
  expect(mockSubscription.mock.results[0]!.value.manage).toHaveBeenCalledTimes(1);
  await fireEvent.press(screen.getByText("Satın alımları geri yükle"));
  expect(mockSubscription.mock.results[0]!.value.restore).toHaveBeenCalledTimes(1);
  expect(screen.queryByText("Aboneliği yönet / iptal et")).toBeNull();
});

it("doğrulama hatasını ücretsiz veya Premium olarak sunmaz", async () => {
  mockSubscription.mockReturnValue({ status: "unknown", action: "idle", notice: null, refresh: jest.fn(), restore: jest.fn(), manage: jest.fn() });
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
