import { act, renderHook, waitFor } from "@testing-library/react-native";
import { useAccountSubscription } from "./use-account-subscription";
const mockRefresh = jest.fn();
const mockRestore = jest.fn();
const mockInitialize = jest.fn();
const mockManage = jest.fn();
jest.mock("@sentry/react-native", () => ({ captureException: jest.fn() }));
jest.mock("../subscription/api/fetch-subscription-overview", () => ({ fetchSubscriptionOverview: () => mockRefresh() }));
jest.mock("../subscription/purchases-gateway", () => ({ initializePurchases: (...args: unknown[]) => mockInitialize(...args), restoreAndCheck: () => mockRestore(), openSubscriptionManagement: () => mockManage() }));
beforeEach(() => {
  jest.clearAllMocks();
  mockRefresh.mockResolvedValue({ verification: "verified", subscription: { active: false } });
  mockInitialize.mockResolvedValue(true);
  mockRestore.mockResolvedValue(true);
  mockManage.mockResolvedValue(undefined);
});
it("SDK aktif dese bile backend reddedince Premium göstermez", async () => {
  const { result } = await renderHook(() => useAccountSubscription("one", false));
  await waitFor(() => expect(result.current.status).toBe("inactive"));
  await act(async () => { await result.current.restore(); });
  expect(mockInitialize).toHaveBeenCalledWith("one");
  expect(mockRestore).toHaveBeenCalledTimes(1);
  expect(result.current.status).toBe("inactive");
});
it("eski hesabın geciken yanıtı yeni hesabın durumunu değiştirmez", async () => {
  let finish!: (value: { verification: string; subscription: { active: boolean } }) => void;
  mockRefresh.mockReturnValueOnce(new Promise((resolve) => { finish = resolve; }));
  const { result, rerender } = await renderHook<ReturnType<typeof useAccountSubscription>, { userId: string }>(({ userId }) => useAccountSubscription(userId, false), { initialProps: { userId: "one" } });
  await rerender({ userId: "two" });
  await waitFor(() => expect(result.current.status).toBe("inactive"));
  await act(async () => { finish({ verification: "verified", subscription: { active: true } }); });
  expect(result.current.status).toBe("inactive");
});
it("geri yükleme sürerken ikinci istek başlatılmaz", async () => {
  let finish!: (value: boolean) => void;
  mockRestore.mockReturnValueOnce(new Promise((resolve) => { finish = resolve; }));
  const { result } = await renderHook(() => useAccountSubscription("one", false));
  await waitFor(() => expect(result.current.status).toBe("inactive"));
  let pending!: Promise<void>;
  await act(async () => { pending = result.current.restore(); await result.current.restore(); });
  expect(mockRestore).toHaveBeenCalledTimes(1);
  await act(async () => { finish(true); await pending; });
});
it("başlangıç kontrolü sürerken mağazayı açmak durum yanıtını kaybettirmez", async () => {
  let finish!: (value: { verification: string; subscription: { active: boolean } }) => void;
  mockRefresh.mockReturnValueOnce(new Promise((resolve) => { finish = resolve; }));
  const { result } = await renderHook(() => useAccountSubscription("one", false));
  await act(async () => { await result.current.manage(); });
  await act(async () => { finish({ verification: "verified", subscription: { active: true } }); });
  expect(result.current.status).toBe("active");
});
