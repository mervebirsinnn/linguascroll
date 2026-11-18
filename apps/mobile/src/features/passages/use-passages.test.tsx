import { act, renderHook, waitFor } from "@testing-library/react-native";
import type { PassageLevel, PassagePage } from "@linguascroll/shared-types";
import { publishAccessVerified, resetAccessEventsForTests } from "./access-events";
import type { PassagesDeps } from "./passages-controller";
import { deferred, makeLockedPassage, makeOpenPassage, makePage, uuid } from "./passages-test-helpers";
import { usePassages } from "./use-passages";

jest.mock("../identity/auth-headers", () => ({ authHeaders: () => Promise.resolve({}) }));

function makeDeps() {
  const fetchPassages = jest.fn<Promise<PassagePage>, [PassageLevel, string?]>();
  const deps: PassagesDeps = {
    fetchPassages,
    answerPassageQuestion: jest.fn(),
    savePassageWord: jest.fn().mockResolvedValue({}),
    unsaveWord: jest.fn().mockResolvedValue(undefined),
    sleep: () => Promise.resolve(),
  };
  return { deps, fetchPassages };
}

beforeEach(resetAccessEventsForTests);

const firstId = (state: ReturnType<typeof usePassages>["state"]) => (state.status === "success" ? state.items[0]!.id : null);
const accesses = (state: ReturnType<typeof usePassages>["state"]) => (state.status === "success" ? state.items.map((item) => item.access) : null);

describe("usePassages", () => {
  it("seviye değişince yeni seviyeyi çeker; eski seviye yuvası korunur (geri dönünce yeniden çekmez)", async () => {
    const { deps, fetchPassages } = makeDeps();
    fetchPassages.mockImplementation((level) => Promise.resolve(makePage([makeOpenPassage(level === "B1" ? 1 : 2, { level })])));
    const { result, rerender } = await renderHook<ReturnType<typeof usePassages>, { level: PassageLevel }>(({ level }) => usePassages("u1", level, deps), { initialProps: { level: "B1" } });

    await waitFor(() => expect(result.current.state.status).toBe("success"));
    await rerender({ level: "C1" });
    await waitFor(() => expect(firstId(result.current.state)).toBe(uuid(2)));
    await rerender({ level: "B1" });
    expect(firstId(result.current.state)).toBe(uuid(1));
    expect(fetchPassages).toHaveBeenCalledTimes(2);
  });

  it("HESAP DEĞİŞİMİ: eski hesabın geciken yanıtı yeni hesabın durumunu değiştirmez; yeni hesap kendi verisini çeker", async () => {
    const { deps, fetchPassages } = makeDeps();
    const slowOld = deferred<PassagePage>();
    fetchPassages.mockReturnValueOnce(slowOld.promise).mockResolvedValueOnce(makePage([makeOpenPassage(2)]));
    const { result, rerender } = await renderHook<ReturnType<typeof usePassages>, { userId: string }>(({ userId }) => usePassages(userId, "B2", deps), { initialProps: { userId: "old" } });

    await rerender({ userId: "new" });
    await waitFor(() => expect(firstId(result.current.state)).toBe(uuid(2)));
    await act(async () => {
      slowOld.resolve(makePage([makeOpenPassage(1)]));
    });

    expect(result.current.state.status === "success" && result.current.state.items.map((item) => item.id)).toEqual([uuid(2)]);
  });

  it("SATIN ALMA / RESTORE: sunucunun doğruladığı erişim olayı kilitli listeyi açık veriyle yeniden çeker", async () => {
    const { deps, fetchPassages } = makeDeps();
    fetchPassages.mockResolvedValueOnce(makePage([makeLockedPassage(1)])).mockResolvedValueOnce(makePage([makeOpenPassage(1)]));
    const { result } = await renderHook(() => usePassages("u1", "B2", deps));
    await waitFor(() => expect(accesses(result.current.state)).toEqual(["locked"]));

    await act(async () => {
      publishAccessVerified("u1", true);
    });

    await waitFor(() => expect(accesses(result.current.state)).toEqual(["open"]));
    expect(fetchPassages).toHaveBeenCalledTimes(2);
  });

  it("ABONELİK KAYBI: yeniden çekimde ücretsiz örnek açık kalır, ücretliler kilitlenir", async () => {
    const { deps, fetchPassages } = makeDeps();
    fetchPassages
      .mockResolvedValueOnce(makePage([makeOpenPassage(1), makeOpenPassage(2)]))
      .mockResolvedValueOnce(makePage([makeOpenPassage(1), makeOpenPassage(2)]))
      .mockResolvedValueOnce(makePage([makeOpenPassage(1), makeLockedPassage(2)]));
    const { result } = await renderHook(() => usePassages("u1", "B2", deps));
    await waitFor(() => expect(accesses(result.current.state)).toEqual(["open", "open"]));
    await act(async () => {
      publishAccessVerified("u1", true); // ilk bilinen değer (abone) → bir yeniden çekim
    });
    await waitFor(() => expect(fetchPassages).toHaveBeenCalledTimes(2));

    await act(async () => {
      publishAccessVerified("u1", false); // abonelik kaybı doğrulandı
    });

    await waitFor(() => expect(accesses(result.current.state)).toEqual(["open", "locked"]));
  });

  it("başka kullanıcının erişim olayı bu hesabın listesini yeniden çekmez", async () => {
    const { deps, fetchPassages } = makeDeps();
    fetchPassages.mockResolvedValue(makePage([makeLockedPassage(1)]));
    const { result } = await renderHook(() => usePassages("u1", "B2", deps));
    await waitFor(() => expect(result.current.state.status).toBe("success"));

    await act(async () => {
      publishAccessVerified("someone-else", true);
    });

    expect(fetchPassages).toHaveBeenCalledTimes(1);
  });

  it("çıkışta (unmount) abonelik ve istekler bırakılır: sonradan gelen yanıt durum yazmaz, olay istek atmaz", async () => {
    const { deps, fetchPassages } = makeDeps();
    const d = deferred<PassagePage>();
    fetchPassages.mockReturnValueOnce(d.promise);
    const { unmount } = await renderHook(() => usePassages("u1", "B2", deps));
    await unmount();

    await act(async () => {
      d.resolve(makePage([makeOpenPassage(1)]));
      publishAccessVerified("u1", true);
    });

    expect(fetchPassages).toHaveBeenCalledTimes(1);
  });
});
