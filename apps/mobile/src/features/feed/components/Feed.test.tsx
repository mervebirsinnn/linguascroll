import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import type { FeedPage } from "@linguascroll/shared-types";
import { fetchFeed } from "../api/fetch-feed";
import { getSessionSeed } from "../../../shared/session-seed";
import { Feed } from "./Feed";

// 2026-10-27 — kimlik SDK'sı (Firebase/Google Sign-In, native) testte yüklenmez: API dosyalarının
// kullandığı header üreticisi sabit bir test token'ı döner.
jest.mock("../../identity/auth-headers", () => ({ authHeaders: () => Promise.resolve({ Authorization: "Bearer test-id-token" }) }));

/**
 * Üst kategori seçicisinin (Akış | Animasyon | IELTS) davranışı. Gerçek native
 * render (FlatList sanallaştırma, video player) Jest ile DOĞRULANAMAZ — bu testler
 * seçicinin sırasını, seçili durumunu, API'ye giden isteği, kategori değişince
 * eski listenin/cursor'un temizlenmesini ve retry'ın seçili kategoriyi korumasını
 * kanıtlar. Gerçek cihaz kontrolü (üç sekmenin dar ekranda kesilmemesi dahil) ayrıca gerekir.
 */

jest.mock("expo-crypto", () => ({ getRandomValues: (array: Uint8Array) => array.fill(0xcd) }));
jest.mock("../api/fetch-feed", () => {
  const actual = jest.requireActual("../api/fetch-feed");
  return { ...actual, fetchFeed: jest.fn() };
});

// Video/quiz/paywall item'ları bu testin konusu değil: native video player ve satın alma modülleri yerine düz stub.
jest.mock("./VideoFeedItem", () => {
  const { Text } = require("react-native");
  return { VideoFeedItem: ({ video }: { video: { id: string } }) => <Text>{`video:${video.id}`}</Text> };
});
jest.mock("../../subscription/PaywallFeedItem", () => ({ PaywallFeedItem: () => null }));
jest.mock("./QuizFeedItem", () => ({ QuizFeedItem: () => null }));
jest.mock("../hooks/use-saved-word-ids", () => ({
  useSavedWordIds: () => ({ isSaved: () => false, isPending: () => false, toggleSave: () => {} }),
}));
jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

const USER_ID = "00000000-0000-4000-8000-000000000099";
const mockedFetchFeed = fetchFeed as jest.MockedFunction<typeof fetchFeed>;

function videoPage(videoIdSuffix: string, nextCursor: string | null = null): FeedPage {
  return {
    items: [
      {
        type: "video",
        video: {
          id: `00000000-0000-4000-8000-${videoIdSuffix.padStart(12, "0")}`,
          learningLanguage: "en",
          cefrLevel: "C1",
          topic: "travel",
          durationMs: 1000,
          playbackUrl: "https://example.com/v.mp4",
          vocabulary: [],
          segments: [],
        },
      },
    ],
    nextCursor,
  };
}

type TreeNode = NonNullable<typeof screen.root>;

/** RNTL v14 `screen.root` yalnızca props/children sunar (findAll yok) — derinlik öncelikli basit arama. */
function findFirst(node: TreeNode | null, predicate: (node: TreeNode) => boolean): TreeNode | null {
  if (!node) return null;
  if (predicate(node)) return node;
  for (const child of node.children) {
    if (typeof child === "string") continue;
    const found = findFirst(child as TreeNode, predicate);
    if (found) return found;
  }
  return null;
}

async function renderFeed(): Promise<void> {
  await render(<Feed userId={USER_ID} account={{ isAnonymous: true, linking: false, notice: null, onLinkAccount: () => {} }} onOpenMemory={() => {}} />);
  // Feed içerik alanını gerçek layout ölçümünden sonra mount eder.
  // Üretim koduna testID EKLENMEDİ (native view ağacına dokunan prop'lar için bkz. proje notu):
  // `onLayout` handler'ı olan düğümü render ağacından buluyoruz.
  const layoutNode = findFirst(screen.root, (node) => typeof node.props.onLayout === "function");
  if (!layoutNode) throw new Error("Feed layout düğümü bulunamadı");
  await fireEvent(layoutNode, "layout", { nativeEvent: { layout: { height: 800, width: 400 } } });
}

beforeEach(() => {
  mockedFetchFeed.mockReset();
});

// Dosyadaki İLK render RN modüllerinin soğuk yüklenmesini ödüyor (bu makinede ~10 sn, VideoFeedItem.test.tsx ile aynı bulgu).
jest.setTimeout(60_000);

describe("Feed — kategori seçici", () => {
  it("üç kategoriyi Akış | Animasyon | IELTS sırasıyla gösterir; varsayılan seçim Akış", async () => {
    mockedFetchFeed.mockResolvedValue(videoPage("1"));
    await renderFeed();

    const tabs = screen.getAllByRole("tab");
    expect(tabs.map((tab) => tab.props.accessibilityState?.selected)).toEqual([true, false, false]);
    expect(screen.getAllByText(/^(Akış|Animasyon|IELTS)$/).map((node) => node.props.children)).toEqual(["Akış", "Animasyon", "IELTS"]);
  });

  it("ilk istek Akış (scope=all) ile, cursor'suz gider", async () => {
    mockedFetchFeed.mockResolvedValue(videoPage("1"));
    await renderFeed();
    await waitFor(() => expect(mockedFetchFeed).toHaveBeenCalledTimes(1));
    expect(mockedFetchFeed).toHaveBeenLastCalledWith(undefined, undefined, "all");
  });

  it("IELTS'e basınca scope=ielts ve cursor'suz ilk sayfa istenir; seçili durum IELTS'e geçer; önceki kategorinin videosu ekrandan kalkar", async () => {
    mockedFetchFeed.mockImplementation((_cursor, _pref, scope) =>
      Promise.resolve(scope === "ielts" ? videoPage("2") : videoPage("1", "general-cursor")),
    );
    await renderFeed();
    await waitFor(() => expect(screen.getByText("video:00000000-0000-4000-8000-000000000001")).toBeTruthy());

    await fireEvent.press(screen.getByText("IELTS"));

    await waitFor(() => expect(screen.getByText("video:00000000-0000-4000-8000-000000000002")).toBeTruthy());
    expect(mockedFetchFeed).toHaveBeenLastCalledWith(undefined, undefined, "ielts");
    expect(screen.queryByText("video:00000000-0000-4000-8000-000000000001")).toBeNull();
    expect(screen.getAllByRole("tab").map((tab) => tab.props.accessibilityState?.selected)).toEqual([false, false, true]);
  });

  it("Animasyon scope=animation, Akış'a geri dönüş scope=all gönderir; 'general' hiçbir istekte yoktur (Akış bütün kategorilerdir)", async () => {
    mockedFetchFeed.mockResolvedValue(videoPage("1"));
    await renderFeed();
    await waitFor(() => expect(mockedFetchFeed).toHaveBeenCalledTimes(1));

    await fireEvent.press(screen.getByText("Animasyon"));
    await waitFor(() => expect(mockedFetchFeed).toHaveBeenCalledTimes(2));
    expect(mockedFetchFeed).toHaveBeenLastCalledWith(undefined, undefined, "animation");
    expect(screen.getAllByRole("tab").map((tab) => tab.props.accessibilityState?.selected)).toEqual([false, true, false]);

    await fireEvent.press(screen.getByText("Akış"));
    await waitFor(() => expect(mockedFetchFeed).toHaveBeenCalledTimes(3));
    expect(mockedFetchFeed).toHaveBeenLastCalledWith(undefined, undefined, "all");
    expect(mockedFetchFeed.mock.calls.map((call) => call[2])).toEqual(["all", "animation", "all"]);
  });

  it("kategori değişince eski kategorinin cursor'u yeni isteğe taşınmaz (her fetch cursor'suz fresh session)", async () => {
    mockedFetchFeed.mockResolvedValue(videoPage("1", "stale-general-cursor"));
    await renderFeed();
    await waitFor(() => expect(mockedFetchFeed).toHaveBeenCalledTimes(1));

    await fireEvent.press(screen.getByText("IELTS"));
    await waitFor(() => expect(mockedFetchFeed).toHaveBeenCalledTimes(2));

    for (const call of mockedFetchFeed.mock.calls) {
      expect(call[0]).toBeUndefined(); // cursor (2026-10-27: userId argümanı kalktı, cursor ilk argüman)
    }
  });

  it("IELTS boş döndüğünde IELTS'e özel mesaj gösterilir ve 'Tekrar dene' seçili IELTS kategorisini korur", async () => {
    mockedFetchFeed.mockImplementation((_cursor, _pref, scope) =>
      Promise.resolve(scope === "ielts" ? { items: [], nextCursor: null } : videoPage("1")),
    );
    await renderFeed();
    await fireEvent.press(screen.getByText("IELTS"));
    await waitFor(() => expect(screen.getByText("IELTS içerikleri henüz yayımlanmadı.")).toBeTruthy());

    mockedFetchFeed.mockClear();
    await fireEvent.press(screen.getByText("Tekrar dene"));

    await waitFor(() => expect(mockedFetchFeed).toHaveBeenCalled());
    expect(mockedFetchFeed).toHaveBeenLastCalledWith(undefined, undefined, "ielts");
    expect(screen.getAllByRole("tab").map((tab) => tab.props.accessibilityState?.selected)).toEqual([false, false, true]);
  });
});

describe("Feed — session seed", () => {
  const actualFetchFeed = jest.requireActual("../api/fetch-feed").fetchFeed as typeof fetchFeed;
  const originalFetch = global.fetch;
  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("sekme değişimi, remount (layout key'i) ve rerender aynı sessionSeed'i kullanır; her scope kendi cursor'suz isteğini atar", async () => {
    const fetchSpy = jest.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({ items: [], nextCursor: null }) });
    global.fetch = fetchSpy as unknown as typeof fetch;
    // Gerçek fetchFeed (URL'yi gerçekten kuran) çalışsın; ağ çağrısı yukarıdaki spy'a düşer.
    mockedFetchFeed.mockImplementation((...args) => actualFetchFeed(...args));

    await renderFeed();
    await waitFor(() => expect(fetchSpy).toHaveBeenCalledTimes(1));
    await fireEvent.press(screen.getByText("IELTS"));
    await waitFor(() => expect(fetchSpy).toHaveBeenCalledTimes(2));
    await fireEvent.press(screen.getByText("Animasyon"));
    await waitFor(() => expect(fetchSpy).toHaveBeenCalledTimes(3));
    await fireEvent.press(screen.getByText("Akış")); // sekme remount'u (key değişir) → yeni session isteği
    await waitFor(() => expect(fetchSpy).toHaveBeenCalledTimes(4));

    const urls = fetchSpy.mock.calls.map(([url]) => new URL(url));
    expect(urls.map((url) => url.searchParams.get("scope"))).toEqual(["all", "ielts", "animation", "all"]);
    expect(urls.every((url) => !url.searchParams.has("category"))).toBe(true);
    const seeds = urls.map((url) => url.searchParams.get("sessionSeed"));
    expect(seeds[0]).toBe("cd".repeat(16));
    expect(new Set(seeds).size).toBe(1);
    expect(seeds[0]).toBe(getSessionSeed());
  });
});
