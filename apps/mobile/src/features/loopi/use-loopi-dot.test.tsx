import { act, render, screen } from "@testing-library/react-native";
import { Text } from "react-native";
import { fetchWordsProgress } from "../memory/api/fetch-words-progress";
import { loopiStore } from "./loopi-store-instance";
import { useLoopiDot } from "./use-loopi-dot";

/**
 * 2026-11-17 — Feed'deki lime noktanın hook'u: 1 sn birleştirme, başka kullanıcının bildirimini yok sayma,
 * sökülme sonrası hiçbir şey yapmama ve kart açılışından sonra sönme. Depo gerçek mantıkla (createLoopiStore)
 * ama bellekte; ağ isteği mock.
 */
jest.mock("../memory/api/fetch-words-progress", () => ({ fetchWordsProgress: jest.fn() }));
jest.mock("./loopi-store-instance", () => {
  const { createLoopiStore } = jest.requireActual("./loopi-store");
  const data = new Map<string, string>();
  return {
    mockData: data,
    loopiStore: createLoopiStore({
      getItem: async (key: string) => data.get(key) ?? null,
      setItem: async (key: string, value: string) => void data.set(key, value),
      removeItem: async (key: string) => void data.delete(key),
    }),
  };
});
const { mockData } = jest.requireMock("./loopi-store-instance") as { mockData: Map<string, string> };
const mockedFetch = jest.mocked(fetchWordsProgress);

const USER = "user-1";
const KEY = `looplish.loopi.v1.${USER}`;

function progress(savedCount: number) {
  return { savedCount, reviewedCount: 0, rememberedCorrectlyCount: 0, savedThisWeek: 0, reviewedThisWeek: 0, rememberedCorrectlyThisWeek: 0 };
}

function Probe({ userId }: { userId: string }) {
  return <Text>{useLoopiDot(userId) ? "dot" : "no-dot"}</Text>;
}

/** Bekleyen promise zincirlerini (sahte depo + mock fetch) boşaltır. */
async function flush(): Promise<void> {
  await act(async () => {
    for (let i = 0; i < 10; i++) await Promise.resolve();
  });
}

beforeEach(() => {
  jest.useFakeTimers();
  mockData.clear();
  mockedFetch.mockReset();
});
afterEach(() => {
  jest.useRealTimers();
});

jest.setTimeout(60_000);

it("art arda bildirimler 1 sn içinde TEK /words/progress isteğine birleşir", async () => {
  mockedFetch.mockResolvedValue(progress(0));
  await render(<Probe userId={USER} />);
  await flush();
  expect(mockedFetch).toHaveBeenCalledTimes(1); // açılış

  await act(async () => {
    await loopiStore.recordWordCreated(USER, "A");
    await loopiStore.recordWordCreated(USER, "B");
    await loopiStore.recordWordCreated(USER, "C");
  });
  await act(async () => {
    jest.advanceTimersByTime(999);
  });
  expect(mockedFetch).toHaveBeenCalledTimes(1);
  await act(async () => {
    jest.advanceTimersByTime(1);
  });
  await flush();
  expect(mockedFetch).toHaveBeenCalledTimes(2);
});

it("başka kullanıcının bildirimi yok sayılır", async () => {
  mockedFetch.mockResolvedValue(progress(0));
  await render(<Probe userId={USER} />);
  await flush();

  await act(async () => {
    await loopiStore.recordWordCreated("someone-else", "A");
    jest.advanceTimersByTime(2000);
  });
  await flush();
  expect(mockedFetch).toHaveBeenCalledTimes(1);
});

it("sökülme sonrası: bekleyen zamanlayıcı iptal, abonelik kapalı, yolda olan cevap depoya yazılmaz", async () => {
  let resolveFetch: (value: ReturnType<typeof progress>) => void = () => {};
  mockedFetch.mockImplementationOnce(() => new Promise((resolve) => (resolveFetch = resolve)));
  const view = await render(<Probe userId={USER} />);

  await view.unmount();
  resolveFetch(progress(5));
  await flush();
  expect(mockData.has(KEY)).toBe(false); // init yazılmadı → sökülmüş hook state/depo güncellemedi

  mockedFetch.mockResolvedValue(progress(5));
  await act(async () => {
    await loopiStore.recordWordCreated(USER, "A");
    jest.advanceTimersByTime(2000);
  });
  await flush();
  expect(mockedFetch).toHaveBeenCalledTimes(1); // yalnız açılış isteği
});

it("eşik geçilince nokta yanar; kart açılınca (openCard bildirimi) Feed sökülmeden de söner", async () => {
  mockData.set(KEY, JSON.stringify({ version: 1, seenStage: 1, pending: ["A"] }));
  mockedFetch.mockResolvedValue(progress(3)); // 3 kelime = stage 2 > görülen 1
  await render(<Probe userId={USER} />);
  await flush();
  expect(screen.getByText("dot")).toBeTruthy();

  const words = ["o1", "o2", "A"].map((id) => ({ word: { id, lemma: id }, savedAt: "2026-11-17T09:00:00.000Z" }));
  await act(async () => {
    await loopiStore.openCard(USER, words);
    jest.advanceTimersByTime(1000);
  });
  await flush();
  expect(screen.getByText("no-dot")).toBeTruthy();
});

it("yeni cihaz (durum yok), mevcut kelimeler: nokta yok ve sessiz başlatma yazılır", async () => {
  mockedFetch.mockResolvedValue(progress(20));
  await render(<Probe userId={USER} />);
  await flush();
  expect(screen.getByText("no-dot")).toBeTruthy();
  expect(JSON.parse(mockData.get(KEY)!)).toEqual({ version: 1, seenStage: 4, pending: [] });
});
