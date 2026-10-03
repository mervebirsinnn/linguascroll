import { render } from "@testing-library/react-native";
import type { FeedPlayableVideo } from "@linguascroll/shared-types";
import { VideoFeedItem } from "./VideoFeedItem";

// RN'in gerçek `Modal` native component spec'i (ExplanationSheet/
// VocabularyWordSheet/VideoAttributionSheet'in üçü de kullanıyor), Jest'in
// babel-plugin-codegen transformunda bu RN sürümüyle bağımsız bir uyumsuzluk
// nedeniyle patlıyor (bu projenin kodundan BAĞIMSIZ bir tooling sorunu) —
// basit bir pass-through ile değiştiriliyor, sadece `visible` iken children'ı
// render ediyor (gerçek Modal'ın test amaçlı yeterli bir yaklaşımı).
jest.mock("react-native/Libraries/Modal/Modal", () => {
  const ReactActual = require("react");
  return {
    __esModule: true,
    default: ({ visible, children }: { visible?: boolean; children?: React.ReactNode }) =>
      visible ? ReactActual.createElement(ReactActual.Fragment, null, children) : null,
  };
});

/**
 * 2026-10-01 — bu dosya, gerçek cihazda video oynatmayı tamamen kıran bir
 * regresyondan (bkz. git/proje hafızası: `nestedScrollEnabled`/
 * `persistentScrollbar` eklenince ekran simsiyah kaldı) SONRA yazıldı. Jest
 * component testleri GERÇEK bir native `SurfaceView`/video render'ını
 * DOĞRULAYAMAZ (bkz. jest.config.js'teki "component" projesi yorumu, jest-expo
 * sadece JS tarafını render eder, gerçek Android/iOS native view pipeline'ını
 * çalıştırmaz) — bu yüzden bu testler SADECE şunu garanti eder: component
 * crash etmeden render oluyor, prop'lar doğru child'lara ulaşıyor, VE bu
 * spesifik regresyona yol açan iki prop'un (nestedScrollEnabled,
 * persistentScrollbar) kasıtsızca geri gelmediği. Gerçek native render
 * doğrulaması HÂLÂ sadece gerçek cihazda yapılabilir.
 */

jest.mock("expo-video", () => ({
  useVideoPlayer: (_source: string, setup?: (player: unknown) => void) => {
    const player = { playing: false, loop: false, timeUpdateEventInterval: 0, play: jest.fn(), pause: jest.fn(), replay: jest.fn() };
    setup?.(player);
    return player;
  },
  VideoView: "VideoView",
}));

jest.mock("expo", () => ({
  useEventListener: jest.fn(),
}));

jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock("../api/record-video-watch-event", () => ({
  recordVideoWatchEvent: jest.fn().mockResolvedValue(undefined),
}));

// ExplanationSheet → use-explanation-language → storage.ts zincirinin
// AsyncStorage'a bağımlılığı için (gerçek native modül Jest'te yok).
jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);

function makeVideo(overrides: Partial<FeedPlayableVideo> = {}): FeedPlayableVideo {
  return {
    id: "00000000-0000-4000-8000-000000000001",
    learningLanguage: "en",
    cefrLevel: "A1",
    topic: "travel",
    durationMs: 15000,
    playbackUrl: "https://example.com/video.mp4",
    vocabulary: [],
    segments: [],
    ...overrides,
  };
}

const baseProps = {
  isActive: true,
  height: 800,
  width: 400,
  userId: "00000000-0000-4000-8000-000000000099",
  isWordSaved: () => false,
  isWordPending: () => false,
  onToggleSaveWord: () => {},
  vocabularyHintVisible: false,
  onDismissVocabularyHint: () => {},
};

describe("VideoFeedItem — render smoke testi", () => {
  // 2026-10-01 — bu RNTL sürümünde (v14) `render()` bir Promise döner
  // (concurrent-mode-uyumlu API) — `await` edilmeden yapılan bir
  // `expect(() => render(...)).not.toThrow()` render sırasında ASENKRON
  // fırlatılan bir hatayı YAKALAMAZ (yanlış bir güvenlik hissi verirdi).

  it("vocabulary/segments boşken crash etmeden render olur", async () => {
    await expect(render(<VideoFeedItem video={makeVideo()} {...baseProps} />)).resolves.toBeDefined();
  });

  it("vocabulary doluyken (kelime paneli dahil) crash etmeden render olur", async () => {
    const video = makeVideo({
      vocabulary: [{ word: { id: "w1", language: "en", lemma: "travel", gloss: "seyahat" }, saved: false }],
    });
    await expect(render(<VideoFeedItem video={video} {...baseProps} />)).resolves.toBeDefined();
  });

  it("animasyon kategorisinde (attribution rozeti dahil) crash etmeden render olur", async () => {
    const video = makeVideo({
      category: "animation",
      attribution: {
        title: "Test Film",
        credit: "Test Credit",
        sourceUrl: "https://example.com/source",
        license: "CC BY 3.0",
        licenseUrl: "https://example.com/license",
        changes: "Test değişiklik",
      },
      backgroundColor: "#112233",
    });
    await expect(render(<VideoFeedItem video={video} {...baseProps} />)).resolves.toBeDefined();
  });

  /**
   * 2026-10-01 — regresyon koruması: `nestedScrollEnabled`/`persistentScrollbar`
   * bir kez gerçek cihazda video oynatmayı tamamen kırdı (bkz. dosya başı
   * yorumu) ve GERİ ALINDI. Biri bunları "scroll çakışması" sorununu çözmek
   * için fark etmeden tekrar eklerse, bu test HEMEN kırmızı yanar — gerçek
   * cihaz testi beklemeden erken bir uyarı verir (native render'ın kendisini
   * KANITLAMAZ, bkz. yukarı, ama en azından "bu riskli prop'lar bilerek mi
   * geri eklendi" sorusunu zorunlu kılar).
   */
  it("hiçbir ScrollView'da nestedScrollEnabled/persistentScrollbar YOK (gerçek cihazda video oynatmayı kıran regresyon, bkz. yorum)", async () => {
    const video = makeVideo({
      vocabulary: [{ word: { id: "w1", language: "en", lemma: "travel", gloss: "seyahat" }, saved: false }],
    });
    // 2026-10-01 — bu RNTL sürümü (v14) `UNSAFE_getAllByType`'ı kaldırmış
    // (implementation-detail query'lere karşı genel Testing Library felsefesi).
    // Bunun yerine render çıktısının JSON ağacını elle, yinelemeli olarak
    // tarıyoruz — host component'lerin TAM tip adına (platforma göre değişebilir,
    // örn. "RCTScrollView") bağımlı olmadan, SADECE iki riskli prop'un hiçbir
    // node'da olmadığını doğruluyor.
    const result = await render(<VideoFeedItem video={video} {...baseProps} />);
    const tree = result.toJSON();
    const riskyPropNodes = findNodesWithRiskyProps(tree);
    expect(riskyPropNodes).toEqual([]);
  });
});

type JsonNode = { type: string; props?: Record<string, unknown>; children?: (JsonNode | string)[] | null };

function findNodesWithRiskyProps(node: JsonNode | (JsonNode | string)[] | string | null): JsonNode[] {
  if (node === null || typeof node === "string") {
    return [];
  }
  if (Array.isArray(node)) {
    return node.flatMap(findNodesWithRiskyProps);
  }
  const foundHere = node.props?.nestedScrollEnabled !== undefined || node.props?.persistentScrollbar !== undefined ? [node] : [];
  return [...foundHere, ...findNodesWithRiskyProps(node.children ?? null)];
}
