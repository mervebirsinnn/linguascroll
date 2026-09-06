import { buildSrt } from "./srt";
import type { DraftSegment } from "./segment-transcript";

function seg(ordinal: number, startMs: number, endMs: number, text: string): DraftSegment {
  return { ordinal, startMs, endMs, text };
}

describe("buildSrt", () => {
  it("tek segment için standart SRT bloğu üretir", () => {
    const srt = buildSrt([seg(1, 0, 1500, "Hello world.")]);
    expect(srt).toBe("1\n00:00:00,000 --> 00:00:01,500\nHello world.\n");
  });

  it("saat/dakika sınırlarını doğru biçimlendirir", () => {
    const srt = buildSrt([seg(1, 3_661_234, 3_662_000, "x")]);
    expect(srt).toContain("01:01:01,234 --> 01:01:02,000");
  });

  it("birden fazla segment cue numaralarını 1'den ardışık verir ve boş satırla ayırır", () => {
    const srt = buildSrt([seg(1, 0, 500, "A"), seg(2, 600, 1000, "B")]);
    expect(srt).toBe("1\n00:00:00,000 --> 00:00:00,500\nA\n\n2\n00:00:00,600 --> 00:00:01,000\nB\n");
  });

  it("boş segment listesi için boş string döner", () => {
    expect(buildSrt([])).toBe("");
  });
});
