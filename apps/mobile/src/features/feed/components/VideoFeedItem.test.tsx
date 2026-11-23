import { act, fireEvent, render, screen } from "@testing-library/react-native";
import { StyleSheet } from "react-native";
import type { FeedPlayableVideo } from "@linguascroll/shared-types";
import { VideoFeedItem } from "./VideoFeedItem";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { FirstVideoGuideProvider } from '../../onboarding/FirstVideoGuideProvider';
import { FIRST_VIDEO_GUIDE_KEY } from '../../onboarding/first-video-guide-state';

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

// Kelime anlamları isteği (use-word-glosses.ts) gerçek ağa gitmesin.
jest.mock("../../subtitles/api/fetch-word-glosses", () => ({
  fetchWordGlosses: jest.fn().mockResolvedValue({}),
}));

jest.mock("../../subtitles/api/save-gloss", () => ({ saveGloss: jest.fn() }));
jest.mock("../api/send-video-feedback", () => ({ sendVideoFeedback: jest.fn() }));

jest.mock("../api/record-video-watch-event", () => ({
  recordVideoWatchEvent: jest.fn().mockResolvedValue(undefined),
}));

// ExplanationSheet → use-explanation-language → storage.ts zincirinin
// AsyncStorage'a bağımlılığı için (gerçek native modül Jest'te yok).
jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);

// VideoFeedItem yalnızca erişimi alınmış (URL'si kesin) videoyla mount edilir (bkz. GatedVideoFeedItem).
type PlayableFeedVideo = FeedPlayableVideo & { playbackUrl: string };
function makeVideo(overrides: Partial<PlayableFeedVideo> = {}): PlayableFeedVideo {
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
};

// Dosyadaki İLK render, RN/expo modüllerinin soğuk (senkron) yüklenmesini
// ödüyor: bu makinede 9-15 sn (diğer testler ~50 ms). Önceden Jest'in 5 sn'lik
// varsayılan timeout'u senkron yükleme sırasında işleyemediği için test şans
// eseri geçiyordu; asenkron bir effect (kelime anlamı isteği) eklenince bu yarış
// belirgin hale geldi. Gerçek bir regresyon değil — dürüst bir timeout.
jest.setTimeout(60_000);

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

  it("alttaki açılır kelime paneli ('N kelimeyi keşfet') ve ipucu artık render edilmez", async () => {
    const video = makeVideo({
      vocabulary: [{ word: { id: "w1", language: "en", lemma: "travel", gloss: "seyahat" }, saved: false }],
    });
    const result = await render(<VideoFeedItem video={video} {...baseProps} />);
    expect(result.queryByText(/kelimeyi keşfet/)).toBeNull();
    expect(result.queryByText(/Vurgulu kelimeye dokun/)).toBeNull();
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

  it("ilerleme bandı en az 44 dp dokunma alanı taşır ve panel açıkken devre dışı kalır", async () => {
    const result = await render(<VideoFeedItem video={makeVideo()} {...baseProps} />);
    const progress = result.getByRole("button", { name: /Videoda ileri veya geri sar/ });
    expect(StyleSheet.flatten(progress.props.style).minHeight).toBeGreaterThanOrEqual(44);

    await fireEvent.press(result.getByLabelText("Video hakkında geri bildirim gönder"));
    expect(result.getByRole("button", { name: /Videoda ileri veya geri sar/ }).props.accessibilityState).toEqual({ disabled: true });
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

/**
 * 2026-11-19 (bağımsız review) — kelime penceresi BAĞLANTI testi: altyazıdaki vurgulu kelimeye dokunma → pencere dokunulan
 * segmentin cümlesini gösterir ve kaydet/çıkar DOKUNULAN segmentin id'siyle çağrılır ("tahmini segment asla" kuralı; eskiden
 * yalnız id tutuluyordu, şimdi segmentin kendisi). Önceden bu kablolamayı kapsayan bir test yoktu.
 */
describe("VideoFeedItem — vurgulu kelime penceresi bağlantısı", () => {
  const SEGMENT = {
    id: "00000000-0000-4000-8000-0000000000a1",
    ordinal: 1,
    startMs: 0,
    endMs: 5000,
    text: "I love to travel often.",
    englishExplanation: "e",
    turkishExplanation: "t",
    learningPoints: [],
  };
  const WORD_ID = "00000000-0000-4000-8000-0000000000b1";
  const video = () => makeVideo({ vocabulary: [{ word: { id: WORD_ID, language: "en", lemma: "travel", gloss: "seyahat" }, saved: false }], segments: [SEGMENT] });

  /** useEventListener mock'lanmış: kayıtlı "timeUpdate" dinleyicilerini elle tetikleyip aktif altyazıyı açıyoruz. */
  async function showSubtitle() {
    const { useEventListener } = require("expo") as { useEventListener: jest.Mock };
    await act(async () => {
      for (const call of useEventListener.mock.calls) {
        if (call[1] === "timeUpdate") (call[2] as (event: { currentTime: number }) => void)({ currentTime: 1 });
      }
    });
  }

  it("vurgulu kelimeye dokununca pencere o segmentin cümlesini gösterir; 'Kelimelerime kaydet' DOKUNULAN segmentin id'siyle kaydeder", async () => {
    const onToggleSaveWord = jest.fn();
    await render(<VideoFeedItem video={video()} {...baseProps} onToggleSaveWord={onToggleSaveWord} />);
    await showSubtitle();
    expect(screen.queryByText("Videoya dön")).toBeNull();
    const sentenceBefore = screen.getAllByText("I love to travel often.").length;

    await fireEvent.press(screen.getByText("travel"));

    expect(screen.getByText("Videoya dön")).toBeTruthy();
    expect(screen.getAllByText("I love to travel often.").length).toBe(sentenceBefore + 1); // pencere cümleyi bağlam olarak gösteriyor
    await fireEvent.press(screen.getByText("Kelimelerime kaydet"));
    expect(onToggleSaveWord).toHaveBeenCalledTimes(1);
    expect(onToggleSaveWord).toHaveBeenCalledWith(WORD_ID, SEGMENT.id);
  });

  it("kayıtlı kelimede YALNIZ 'Kelimelerimden çıkar' çağırır (aynı segment id'siyle); ana düğme pasif", async () => {
    const onToggleSaveWord = jest.fn();
    await render(<VideoFeedItem video={video()} {...baseProps} isWordSaved={() => true} onToggleSaveWord={onToggleSaveWord} />);
    await showSubtitle();
    await fireEvent.press(screen.getByText("travel"));

    await fireEvent.press(screen.getByText("Kelimelerine eklendi ✓"));
    expect(onToggleSaveWord).not.toHaveBeenCalled();

    await fireEvent.press(screen.getByText("Kelimelerimden çıkar"));
    expect(onToggleSaveWord).toHaveBeenCalledTimes(1);
    expect(onToggleSaveWord).toHaveBeenCalledWith(WORD_ID, SEGMENT.id);
  });

  it("kayıtlı değilken 'çıkar' satırı basılamaz: yanlış yönde (kayıtsız kelimeyi 'çıkarırken' kaydetme) çağrı olmaz", async () => {
    const onToggleSaveWord = jest.fn();
    await render(<VideoFeedItem video={video()} {...baseProps} onToggleSaveWord={onToggleSaveWord} />);
    await showSubtitle();
    await fireEvent.press(screen.getByText("travel"));

    await fireEvent.press(screen.getByText("Kelimelerimden çıkar", { includeHiddenElements: true }));

    expect(onToggleSaveWord).not.toHaveBeenCalled();
  });

  it("pencere kapanınca ('Videoya dön') segment snapshot'ı bırakılır: yeniden açmadan kayıt çağrısı olmaz", async () => {
    const onToggleSaveWord = jest.fn();
    await render(<VideoFeedItem video={video()} {...baseProps} onToggleSaveWord={onToggleSaveWord} />);
    await showSubtitle();
    await fireEvent.press(screen.getByText("travel"));
    await fireEvent.press(screen.getByText("Videoya dön"));

    expect(screen.queryByText("Kelimelerime kaydet")).toBeNull();
    expect(onToggleSaveWord).not.toHaveBeenCalled();
  });
});

/**
 * 2026-11-19 (bağımsız review, ortak sheet bağlantısı) — video akışının kelime davranışının, sheet genelleştirilince (word → entry)
 * KORUNDUĞUNU sabitleyen testler: başlık = sözlük biçimi (lemma), anlam = gloss, cümle = dokunulan segment, kapatma = "Videoya dön",
 * hata kutusu yok, bekleme etiketi, kapat-yeniden aç.
 */
describe("VideoFeedItem — ortak kelime penceresi video akışında aynı kalır", () => {
  const SEGMENT = { id: "00000000-0000-4000-8000-0000000000c1", ordinal: 1, startMs: 0, endMs: 5000, text: "She loves to travel often.", englishExplanation: "e", turkishExplanation: "t", learningPoints: [] };
  const WORD_ID = "00000000-0000-4000-8000-0000000000d1";
  it("başlık sözlük biçimi (lemma), anlam gloss, cümle dokunulan segmentin metni; kapatma 'Videoya dön'; hata kutusu YOK", async () => {
    const { useEventListener } = require("expo") as { useEventListener: jest.Mock };
    useEventListener.mockClear();
    const plain = makeVideo({
      vocabulary: [{ word: { id: WORD_ID, language: "en", lemma: "travel", gloss: "seyahat etmek" }, saved: false }],
      segments: [SEGMENT],
    });
    await render(<VideoFeedItem video={plain} {...baseProps} />);
    await act(async () => {
      for (const call of useEventListener.mock.calls) {
        if (call[1] === "timeUpdate") (call[2] as (event: { currentTime: number }) => void)({ currentTime: 1 });
      }
    });
    await fireEvent.press(screen.getByText("travel"));

    expect(screen.getAllByText("travel").length).toBeGreaterThan(1); // altyazıdaki + penceredeki başlık
    expect(screen.getByText("seyahat etmek")).toBeTruthy(); // gloss
    expect(screen.getAllByText("She loves to travel often.").length).toBeGreaterThan(1); // cümle penceredede
    expect(screen.getByText("Videoya dön")).toBeTruthy();
    expect(screen.queryByText("Metne dön")).toBeNull();
    expect(screen.queryByRole("alert")).toBeNull();
    expect(screen.queryByText("Tekrar dene")).toBeNull();
  });

  it("bekleme: 'Kaydediliyor…' (yön save) ve ana düğme basılamaz; kapat ve yeniden aç aynı içeriği gösterir", async () => {
    const onToggleSaveWord = jest.fn();
    const { useEventListener } = require("expo") as { useEventListener: jest.Mock };
    useEventListener.mockClear();
    const plain = makeVideo({
      vocabulary: [{ word: { id: WORD_ID, language: "en", lemma: "travel", gloss: "seyahat etmek" }, saved: false }],
      segments: [SEGMENT],
    });
    await render(<VideoFeedItem video={plain} {...baseProps} isWordPending={() => true} onToggleSaveWord={onToggleSaveWord} />);
    await act(async () => {
      for (const call of useEventListener.mock.calls) {
        if (call[1] === "timeUpdate") (call[2] as (event: { currentTime: number }) => void)({ currentTime: 1 });
      }
    });
    await fireEvent.press(screen.getByText("travel"));

    expect(screen.getByText("Kaydediliyor…")).toBeTruthy();
    await fireEvent.press(screen.getByText("Kaydediliyor…"));
    expect(onToggleSaveWord).not.toHaveBeenCalled();

    await fireEvent.press(screen.getByText("Videoya dön"));
    expect(screen.queryByText("Kaydediliyor…")).toBeNull();
    await fireEvent.press(screen.getByText("travel"));
    expect(screen.getByText("seyahat etmek")).toBeTruthy();
    expect(screen.getByText("Kaydediliyor…")).toBeTruthy();
  });
});

it('ilk videodaki gerçek kelime dokunuşunu izler, yalnız onaylı kayıt sonrası ilerler', async () => {
  await AsyncStorage.removeItem(FIRST_VIDEO_GUIDE_KEY);
  let saved = false;
  const onSave = jest.fn();
  const first = makeVideo({
    segments: [{ id: 'segment-guide', ordinal: 1, startMs: 0, endMs: 5000, text: 'We travel often.', englishExplanation: 'e', turkishExplanation: 'Sık seyahat ederiz.', learningPoints: [] }],
    vocabulary: [{ word: { id: 'guide-word', language: 'en', lemma: 'travel', gloss: 'seyahat' }, saved: false }],
  });
  const content = () => <FirstVideoGuideProvider><VideoFeedItem video={first} {...baseProps} guideEligible isWordSaved={() => saved} onToggleSaveWord={onSave} /></FirstVideoGuideProvider>;
  const result = await render(content());
  expect(await screen.findByTestId('guide-word')).toBeTruthy();
  await fireEvent.press(screen.getByText('travel'));
  expect(screen.getByTestId('guide-save')).toBeTruthy();
  await fireEvent.press(screen.getByText('Kelimelerime kaydet'));
  expect(onSave).toHaveBeenCalledWith('guide-word', 'segment-guide');
  expect(screen.getByTestId('guide-save')).toBeTruthy();
  saved = true;
  await result.rerender(content());
  expect(screen.getByTestId('guide-closeWord')).toBeTruthy();
  await fireEvent.press(screen.getByText('Videoya dön'));
  expect(screen.getByTestId('guide-sentence')).toBeTruthy();
});
