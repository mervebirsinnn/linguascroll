import { buildParagraphRuns, type RunWordInfo } from "./passage-runs";

const CAT = "00000000-0000-4000-8000-0000000000c1";
const ACCOUNT_FOR = "00000000-0000-4000-8000-0000000000c2";

const words = new Map<string, RunWordInfo>([
  [CAT, { gloss: "kedi", saved: false, contextSentence: "A cat sat." }],
  [ACCOUNT_FOR, { gloss: "açıklamak", saved: true, contextSentence: "Results account for the gap." }],
]);

let nextSpan = 1;
/** Test span'ı: sabit olmayan ama benzersiz id; cümle verilmezse null (kelimenin yedek cümlesi kullanılır). */
const sp = (start: number, end: number, wordId: string, surface: string, contextSentence: string | null = null) => ({
  id: `00000000-0000-4000-8000-00000000${String(nextSpan++).padStart(4, "0")}`,
  start,
  end,
  wordId,
  surface,
  contextSentence,
});

describe("buildParagraphRuns", () => {
  it("span yoksa tek düz run döner", () => {
    expect(buildParagraphRuns("Plain text.", [], words)).toEqual([{ text: "Plain text." }]);
  });

  it("tekrar eden kelime her geçişinde ayrı run olur; HER geçiş kendi span kimliğini ve kendi cümlesini taşır", () => {
    const second = sp(15, 18, CAT, "cat", "The cat left.");
    const first = sp(2, 5, CAT, "cat", "A cat sat.");
    const runs = buildParagraphRuns("A cat sat. The cat left.", [second, first], words);

    expect(runs).toEqual([
      { text: "A " },
      { text: "cat", word: { wordId: CAT, gloss: "kedi", saved: false, spanId: first.id, contextSentence: "A cat sat." } },
      { text: " sat. The " },
      { text: "cat", word: { wordId: CAT, gloss: "kedi", saved: false, spanId: second.id, contextSentence: "The cat left." } },
      { text: " left." },
    ]);
    expect(first.id).not.toBe(second.id);
  });

  it("span'ın kendi cümlesi yoksa kelimenin yedek (ilk geçiş) cümlesi kullanılır", () => {
    const runs = buildParagraphRuns("A cat sat.", [sp(2, 5, CAT, "cat", null)], words);
    expect(runs[1]?.word?.contextSentence).toBe("A cat sat.");
  });

  it("çok kelimeli ifade TEK run'dır ve kaydedilmiş bayrağı taşınır", () => {
    const span = sp(8, 19, ACCOUNT_FOR, "account for");
    const runs = buildParagraphRuns("Results account for the gap.", [span], words);

    expect(runs).toEqual([
      { text: "Results " },
      { text: "account for", word: { wordId: ACCOUNT_FOR, gloss: "açıklamak", saved: true, spanId: span.id, contextSentence: "Results account for the gap." } },
      { text: " the gap." },
    ]);
  });

  it("bitişik span'lar arasında boş düz run üretmez; metnin başında/sonunda span olabilir", () => {
    const runs = buildParagraphRuns("catcat", [
      sp(0, 3, CAT, "cat"),
      sp(3, 6, CAT, "cat"),
    ], words);

    expect(runs.map((run) => run.text)).toEqual(["cat", "cat"]);
  });

  it("tipografik tırnak ve em dash'li metinde indeksler doğru", () => {
    const text = "“Cats” — cat.";
    const start = text.lastIndexOf("cat");
    const runs = buildParagraphRuns(text, [sp(start, start + 3, CAT, "cat")], words);

    expect(runs[0]).toEqual({ text: "“Cats” — " });
    expect(runs[1]?.word?.wordId).toBe(CAT);
    expect(runs[2]).toEqual({ text: "." });
  });

  it("tutarsız veri sessizce düzeltilmez, açıkça patlar", () => {
    expect(() => buildParagraphRuns("A cat.", [sp(2, 5, CAT, "dog")], words)).toThrow("uyuşmuyor");
    expect(() => buildParagraphRuns("A cat.", [sp(2, 50, CAT, "cat")], words)).toThrow("dışında");
    expect(() =>
      buildParagraphRuns("catcat", [
        sp(0, 4, CAT, "catc"),
        sp(3, 6, CAT, "cat"),
      ], words),
    ).toThrow("Çakışan");
    expect(() => buildParagraphRuns("A cat.", [sp(2, 5, "00000000-0000-4000-8000-0000000000ff", "cat")], words)).toThrow("bulunamadı");
    expect(() => buildParagraphRuns("", [], words)).toThrow("Boş paragraf");
  });
});
