import {
  buildDraftSegments,
  MAX_SEGMENT_CHARS,
  MAX_SEGMENT_DURATION_MS,
  OVERLAP_TOLERANCE_MS,
  PAUSE_GAP_MS,
  SegmentationError,
} from "./segment-transcript";
import type { TimedWord } from "./transcript-candidate";

function w(text: string, startMs: number, endMs: number): TimedWord {
  return { text, startMs, endMs };
}

describe("buildDraftSegments — kelimelerden segment start/end türetimi", () => {
  it("tek bir doğal cümle: segment start=ilk kelime start, end=son kelime end", () => {
    const words = [w("Hello", 0, 200), w("world.", 250, 600)];
    const segments = buildDraftSegments(words, 10000);
    expect(segments).toEqual([{ ordinal: 1, startMs: 0, endMs: 600, text: "Hello world." }]);
  });

  it("boş transcript (0 kelime) → SegmentationError", () => {
    expect(() => buildDraftSegments([], 1000)).toThrow(SegmentationError);
  });
});

describe("buildDraftSegments — ordinal ve kronolojik sıra", () => {
  it("ordinal 1'den başlar ve kesintisiz ilerler", () => {
    const words = [
      w("First.", 0, 300),
      w("Second.", PAUSE_GAP_MS + 400, PAUSE_GAP_MS + 700),
      w("Third.", 2 * PAUSE_GAP_MS + 1100, 2 * PAUSE_GAP_MS + 1400),
    ];
    const segments = buildDraftSegments(words, 10000);
    expect(segments.map((s) => s.ordinal)).toEqual([1, 2, 3]);
  });

  it("segmentler zaman sırasına göre — bir sonraki segment bir öncekinin bitişinden önce başlayamaz", () => {
    const words = [w("First.", 0, 300), w("Second.", PAUSE_GAP_MS + 400, PAUSE_GAP_MS + 700)];
    const segments = buildDraftSegments(words, 10000);
    for (let i = 1; i < segments.length; i++) {
      expect(segments[i]!.startMs).toBeGreaterThanOrEqual(segments[i - 1]!.endMs);
    }
  });
});

describe("buildDraftSegments — segmentasyon sinyalleri (nokta işaretine dayalı KIRILGAN tek regex DEĞİL)", () => {
  it("uzun bir sessizlik (>= PAUSE_GAP_MS) noktalama olmasa bile yeni segment başlatır", () => {
    const words = [w("um", 0, 100), w("so", 100 + PAUSE_GAP_MS, 200 + PAUSE_GAP_MS)];
    const segments = buildDraftSegments(words, 10000);
    expect(segments).toHaveLength(2);
  });

  it("cümle sonu noktalaması, sessizlik olmasa bile yeni segment başlatır", () => {
    const words = [w("Done.", 0, 200), w("Next", 210, 400)];
    const segments = buildDraftSegments(words, 10000);
    expect(segments).toHaveLength(2);
    expect(segments[0]!.text).toBe("Done.");
  });

  it("uzun cümleler (MAX_SEGMENT_DURATION_MS aşımı) doğal duraklama/noktalama olmasa bile bölünür", () => {
    // 20 kelime, aralarında hiç boşluk/noktalama yok ama toplam süre MAX'ı aşıyor.
    const words: TimedWord[] = [];
    const perWordMs = Math.ceil((MAX_SEGMENT_DURATION_MS + 2000) / 20);
    for (let i = 0; i < 20; i++) {
      words.push(w(`w${i}`, i * perWordMs, i * perWordMs + perWordMs - 1));
    }
    const segments = buildDraftSegments(words, 100000);
    expect(segments.length).toBeGreaterThan(1);
    for (const segment of segments) {
      expect(segment.endMs - segment.startMs).toBeLessThanOrEqual(MAX_SEGMENT_DURATION_MS);
    }
  });

  it("uzun karakter sayısı (MAX_SEGMENT_CHARS aşımı) süre kısa olsa bile bölünür", () => {
    const words: TimedWord[] = [];
    for (let i = 0; i < 30; i++) {
      words.push(w("word", i * 10, i * 10 + 5)); // toplam metin >> MAX_SEGMENT_CHARS, ama süre çok kısa
    }
    const segments = buildDraftSegments(words, 100000);
    expect(segments.length).toBeGreaterThan(1);
    for (const segment of segments) {
      expect(segment.text.length).toBeLessThanOrEqual(MAX_SEGMENT_CHARS);
    }
  });
});

describe("buildDraftSegments — invalid/overlapping timestamps", () => {
  it("küçük çakışma (<= OVERLAP_TOLERANCE_MS) sessizce düzeltilir", () => {
    const words = [w("a", 0, 300), w("b", 300 - OVERLAP_TOLERANCE_MS, 500)];
    const segments = buildDraftSegments(words, 10000);
    expect(segments[0]!.startMs).toBe(0);
    expect(segments[0]!.endMs).toBe(500);
  });

  it("büyük çakışma (> OVERLAP_TOLERANCE_MS) SegmentationError fırlatır", () => {
    const words = [w("a", 0, 300), w("b", 300 - OVERLAP_TOLERANCE_MS - 1, 500)];
    expect(() => buildDraftSegments(words, 10000)).toThrow(SegmentationError);
  });

  it("negatif süreli/ters zamanlı bir kelime zaten transcript-candidate şemasında reddedilir — burada tekrar test edilmiyor (sorumluluk sınırı)", () => {
    // Kasıtlı: TimedWord'ün kendisi endMs>startMs garantili geliyor (Zod sınırında).
    // Bu test dosyası sadece segment-DÜZEYİ overlap/timing'i doğruluyor.
    expect(true).toBe(true);
  });
});

describe("buildDraftSegments — video süresi dışına taşma", () => {
  it("son segment durationMs'e clamp edilir", () => {
    const words = [w("late", 9000, 9990)];
    const segments = buildDraftSegments(words, 9500);
    expect(segments[0]!.endMs).toBe(9500);
  });

  it("clamp segment'i sıfır/negatif süreye düşürürse SegmentationError fırlatır", () => {
    const words = [w("late", 9000, 9990)];
    expect(() => buildDraftSegments(words, 9000)).toThrow(SegmentationError);
  });
});
