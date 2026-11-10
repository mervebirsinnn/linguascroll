import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import type { FeedPage } from "@linguascroll/shared-types";
import { fetchFeed } from "../api/fetch-feed";
import { getSessionSeed } from "../../../shared/session-seed";
import { Feed } from "./Feed";

// 2026-10-27 — kimlik SDK'sı (Firebase/Google Sign-In, native) testte yüklenmez: API dosyalarının
// kullandığı header üreticisi sabit bir test token'ı döner.
jest.mock("../../identity/auth-headers", () => ({ authHeaders: () => Promise.resolve({ Authorization: "Bearer test-id-token" }) }));

/**
 * Tek akış davranışı (2026-11-10: Akış | Animasyon | IELTS sekmeleri kaldırıldı). Gerçek native
 * render (FlatList sanallaştırma, video player) Jest ile DOĞRULANAMAZ — bu testler sekme
 * olmadığını, isteğin sabit scope=all ile cursor'suz gittiğini ve retry'ın aynı kapsamı
 * koruduğunu kanıtlar. Gerçek cihaz kontrolü ayrıca gerekir.
 */

jest.mock("expo-crypto", () => ({ getRandomValues: (array: Uint8Array) => array.fill(0xcd) }));
jest.mock("../api/fetch-feed", () => {
  const actual = jest.requireActual("../api/fetch-feed");
  return { ...actual, fetchFeed: jest.fn() };
});

// Video/quiz/paywall item'ları bu testin konusu değil: native video player ve satın alma modülleri yerine düz stub.
jest.mock("./VideoFeedItem", () => {
  const { Text } = require("react-native");
  return { VideoFeedItem: ({ video, isActive }: { video: { id: string }; isActive: boolean }) => <Text accessibilityLabel={isActive ? "active-video" : "paused-video"}>{`video:${video.id}`}</Text> };
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

describe("Feed — tek akış", () => {
  it("kategori sekmesi göstermez; Animasyon/IELTS başlıkları yoktur", async () => {
    mockedFetchFeed.mockResolvedValue(videoPage("1"));
    await renderFeed();

    expect(screen.queryAllByRole("tab")).toHaveLength(0);
    expect(screen.queryByText("Animasyon")).toBeNull();
    expect(screen.queryByText("IELTS")).toBeNull();
    expect(screen.queryByText("Akış")).toBeNull();
  });

  it("ilk istek scope=all ile, cursor'suz gider ve video akışta oynar", async () => {
    mockedFetchFeed.mockResolvedValue(videoPage("1"));
    await renderFeed();
    await waitFor(() => expect(mockedFetchFeed).toHaveBeenCalledTimes(1));
    expect(mockedFetchFeed).toHaveBeenLastCalledWith(undefined, undefined, "all");
    await waitFor(() => expect(screen.getByText("video:00000000-0000-4000-8000-000000000001")).toBeTruthy());
  });

  it("boş akışta 'Henüz video yok.' gösterilir ve 'Tekrar dene' scope=all ile yeniden dener", async () => {
    mockedFetchFeed.mockResolvedValue({ items: [], nextCursor: null });
    await renderFeed();
    await waitFor(() => expect(screen.getByText("Henüz video yok.")).toBeTruthy());

    mockedFetchFeed.mockClear();
    await fireEvent.press(screen.getByText("Tekrar dene"));

    await waitFor(() => expect(mockedFetchFeed).toHaveBeenCalled());
    expect(mockedFetchFeed).toHaveBeenLastCalledWith(undefined, undefined, "all");
  });
});

describe("Feed — session seed", () => {
  const actualFetchFeed = jest.requireActual("../api/fetch-feed").fetchFeed as typeof fetchFeed;
  const originalFetch = global.fetch;
  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("gerçek fetchFeed isteği scope=all, category'siz ve oturum seed'iyle kurulur", async () => {
    const fetchSpy = jest.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({ items: [], nextCursor: null }) });
    global.fetch = fetchSpy as unknown as typeof fetch;
    mockedFetchFeed.mockImplementation((...args) => actualFetchFeed(...args));

    await renderFeed();
    await waitFor(() => expect(fetchSpy).toHaveBeenCalledTimes(1));

    const url = new URL(fetchSpy.mock.calls[0]![0]);
    expect(url.searchParams.get("scope")).toBe("all");
    expect(url.searchParams.has("category")).toBe(false);
    expect(url.searchParams.get("sessionSeed")).toBe("cd".repeat(16));
    expect(url.searchParams.get("sessionSeed")).toBe(getSessionSeed());
  });
});

it("tekrar gelen aynı video iki oynatıcıyı birden aktif etmez", async () => {
  const page = videoPage("1"); page.items.push(page.items[0]!);
  mockedFetchFeed.mockResolvedValue(page);
  await renderFeed();
  await waitFor(() => expect(screen.getAllByLabelText("active-video")).toHaveLength(1));
  expect(screen.getAllByLabelText("paused-video")).toHaveLength(1);
});
