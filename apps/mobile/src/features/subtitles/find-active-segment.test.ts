import type { TranscriptSegment } from "@linguascroll/shared-types";
import { findActiveSegment } from "./find-active-segment";

/**
 * `useActiveSubtitle`'ın TÜM zamanlama mantığı bu saf fonksiyona çıkarıldığı
 * için (hook onu birebir kullanıyor), bu testler RN render etmeden (bu dosya
 * "expo" importu içermediği için mobile'ın sade ts-jest kurulumuyla sorunsuz
 * çalışır — bkz. find-active-segment.ts'in yorumu) [startMs, endMs) sınır
 * davranışını kanıtlıyor — use-feed.test.ts/use-saved-word-ids.test.ts'teki
 * aynı "saf fonksiyona çıkar" deseni.
 */

function makeSegment(id: string, startMs: number, endMs: number): TranscriptSegment {
  return { id, ordinal: 1, startMs, endMs, text: `segment-${id}`, englishExplanation: "en", turkishExplanation: "tr", learningPoints: [] };
}

describe("findActiveSegment — [startMs, endMs) yarı-açık aralık", () => {
  const segmentA = makeSegment("a", 1000, 3000);
  const segmentB = makeSegment("b", 3000, 5000);
  const segments = [segmentA, segmentB];

  it("startMs'ten HEMEN ÖNCE (999ms) → null (henüz hiçbir segment başlamadı)", () => {
    expect(findActiveSegment(segments, 999)).toBeNull();
  });

  it("startMs'e TAM eşit (1000ms) → segment A (dahil)", () => {
    expect(findActiveSegment(segments, 1000)).toBe(segmentA);
  });

  it("endMs'ten HEMEN ÖNCE (2999ms) → hâlâ segment A", () => {
    expect(findActiveSegment(segments, 2999)).toBe(segmentA);
  });

  it("bir sonraki segment'in startMs'ine TAM eşit (3000ms) → segment B (A artık dahil DEĞİL)", () => {
    expect(findActiveSegment(segments, 3000)).toBe(segmentB);
  });

  it("son segment'in endMs'inden SONRA → null", () => {
    expect(findActiveSegment(segments, 5000)).toBeNull();
  });

  it("segment'ler arası bir BOŞLUK (gap) varsa, o aralıkta null döner", () => {
    const withGap = [makeSegment("a", 1000, 2000), makeSegment("b", 4000, 5000)];
    expect(findActiveSegment(withGap, 3000)).toBeNull();
  });

  it("boş segment listesi için her zaman null döner", () => {
    expect(findActiveSegment([], 1500)).toBeNull();
  });

  it("hiç segment başlamadan önceki negatif/sıfır zaman için null döner", () => {
    expect(findActiveSegment(segments, 0)).toBeNull();
  });
});
