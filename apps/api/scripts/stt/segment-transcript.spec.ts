import {
  buildDraftSegments,
  MAX_SEGMENT_CHARS,
  MAX_SEGMENT_DURATION_MS,
  MIN_SEGMENT_DURATION_MS,
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
  // Her kelimenin kendi süresi BİLEREK MIN_SEGMENT_DURATION_MS'in üstünde —
  // aksi halde mergeShortFragments bu 3 segmenti teke indirir (bu test'in
  // amacı ordinal/sıra doğruluğu, merge davranışı DEĞİL — o ayrı describe
  // bloğunda test ediliyor).
  const LONG_ENOUGH_MS = MIN_SEGMENT_DURATION_MS + 100;

  it("ordinal 1'den başlar ve kesintisiz ilerler", () => {
    const words = [
      w("First.", 0, LONG_ENOUGH_MS),
      w("Second.", LONG_ENOUGH_MS + PAUSE_GAP_MS, 2 * LONG_ENOUGH_MS + PAUSE_GAP_MS),
      w("Third.", 2 * LONG_ENOUGH_MS + 2 * PAUSE_GAP_MS, 3 * LONG_ENOUGH_MS + 2 * PAUSE_GAP_MS),
    ];
    const segments = buildDraftSegments(words, 100000);
    expect(segments.map((s) => s.ordinal)).toEqual([1, 2, 3]);
  });

  it("segmentler zaman sırasına göre — bir sonraki segment bir öncekinin bitişinden önce başlayamaz", () => {
    const words = [w("First.", 0, LONG_ENOUGH_MS), w("Second.", LONG_ENOUGH_MS + PAUSE_GAP_MS, 2 * LONG_ENOUGH_MS + PAUSE_GAP_MS)];
    const segments = buildDraftSegments(words, 100000);
    for (let i = 1; i < segments.length; i++) {
      expect(segments[i]!.startMs).toBeGreaterThanOrEqual(segments[i - 1]!.endMs);
    }
  });
});

describe("buildDraftSegments — segmentasyon sinyalleri (nokta işaretine dayalı KIRILGAN tek regex DEĞİL)", () => {
  it("uzun bir sessizlik (>= PAUSE_GAP_MS) noktalama olmasa bile yeni segment başlatır", () => {
    // Her iki kelimenin süresi de MIN_SEGMENT_DURATION_MS üstünde — aksi halde
    // mergeShortFragments (noktalama olmadığı için) bunları tekrar birleştirirdi.
    const long = MIN_SEGMENT_DURATION_MS + 100;
    const words = [w("um", 0, long), w("so", long + PAUSE_GAP_MS, 2 * long + PAUSE_GAP_MS)];
    const segments = buildDraftSegments(words, 100000);
    expect(segments).toHaveLength(2);
  });

  it("cümle sonu noktalaması, sessizlik olmasa bile yeni segment başlatır", () => {
    const long = MIN_SEGMENT_DURATION_MS + 100;
    const words = [w("Done.", 0, long), w("Next", long + 10, 2 * long)];
    const segments = buildDraftSegments(words, 100000);
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

describe("buildDraftSegments — kısa fragman birleştirme (gerçek content bug'ından: 'Yesterday,' / 'understand.' gibi tek başına anlamsız parçalar)", () => {
  it("noktalamasız kısa fragman (virgülle biten) SONRAKİ segmentle birleşir", () => {
    const words = [
      w("Yesterday,", 0, 400), // 400ms < MIN_SEGMENT_DURATION_MS, noktalama yok
      w("I", 400 + PAUSE_GAP_MS, 400 + PAUSE_GAP_MS + 100),
      w("found", 400 + PAUSE_GAP_MS + 110, 400 + PAUSE_GAP_MS + 300),
      w("a", 400 + PAUSE_GAP_MS + 310, 400 + PAUSE_GAP_MS + 400),
      w("cat.", 400 + PAUSE_GAP_MS + 410, 400 + PAUSE_GAP_MS + 1000),
    ];
    const segments = buildDraftSegments(words, 100000);
    expect(segments).toHaveLength(1);
    expect(segments[0]!.text).toBe("Yesterday, I found a cat.");
    expect(segments[0]!.startMs).toBe(0);
  });

  it("noktalamayla biten kısa fragman ÖNCEKİ segmentle birleşir", () => {
    const words = [
      w("I", 0, 100),
      w("don't", 110, 300),
      w("fully", 310, 1000), // ilk segment tek başına zaten >= MIN_SEGMENT_DURATION_MS
      w("understand.", 1000 + PAUSE_GAP_MS, 1000 + PAUSE_GAP_MS + 300), // 300ms < MIN, noktalamalı
    ];
    const segments = buildDraftSegments(words, 100000);
    expect(segments).toHaveLength(1);
    expect(segments[0]!.text).toBe("I don't fully understand.");
  });

  it("MIN_SEGMENT_DURATION_MS ve üstündeki segmentler birleştirilmez", () => {
    const long = MIN_SEGMENT_DURATION_MS;
    const words = [w("Fine.", 0, long), w("Also fine.", long + PAUSE_GAP_MS, 2 * long + PAUSE_GAP_MS)];
    const segments = buildDraftSegments(words, 100000);
    expect(segments).toHaveLength(2);
  });

  it("birleşme MAX_SEGMENT_CHARS'ı aşacaksa YAPILMAZ — kısa fragman olduğu gibi kalır", () => {
    const filler = "x".repeat(MAX_SEGMENT_CHARS - 1); // tek başına tavanın altında, ama komşusuyla birleşince kesin aşar
    const words = [
      w(filler, 0, 1000), // uzun (>= MIN), ama METİN olarak neredeyse tavanda
      w("hi", 1000 + PAUSE_GAP_MS, 1000 + PAUSE_GAP_MS + 300), // 300ms < MIN, noktalama yok
    ];
    const segments = buildDraftSegments(words, 100000);
    // Birleşseydi tek segment olurdu (chars tavanını aşarak) — bunun yerine 2 ayrı,
    // GEÇERLİ (tavan altı) segment olarak kalmalı.
    expect(segments).toHaveLength(2);
    for (const segment of segments) {
      expect(segment.text.length).toBeLessThanOrEqual(MAX_SEGMENT_CHARS);
    }
  });

  it("art arda birden fazla kısa fragman TEK bir segmentte birleşir (zincirleme birleşme)", () => {
    const words = [
      w("Well,", 0, 100),
      w("um,", 100 + PAUSE_GAP_MS, 200 + PAUSE_GAP_MS),
      w("actually,", 200 + 2 * PAUSE_GAP_MS, 300 + 2 * PAUSE_GAP_MS),
    ];
    const segments = buildDraftSegments(words, 100000);
    expect(segments).toHaveLength(1);
    expect(segments[0]!.text).toBe("Well, um, actually,");
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
