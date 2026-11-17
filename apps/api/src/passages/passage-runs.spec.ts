import { buildParagraphRuns, type RunWordInfo } from "./passage-runs";

const CAT = "00000000-0000-4000-8000-0000000000c1";
const ACCOUNT_FOR = "00000000-0000-4000-8000-0000000000c2";

const words = new Map<string, RunWordInfo>([
  [CAT, { gloss: "kedi", saved: false }],
  [ACCOUNT_FOR, { gloss: "açıklamak", saved: true }],
]);

describe("buildParagraphRuns", () => {
  it("span yoksa tek düz run döner", () => {
    expect(buildParagraphRuns("Plain text.", [], words)).toEqual([{ text: "Plain text." }]);
  });

  it("tekrar eden kelime her geçişinde ayrı run olur, aralardaki metin korunur", () => {
    const runs = buildParagraphRuns("A cat sat. The cat left.", [
      { start: 15, end: 18, wordId: CAT, surface: "cat" },
      { start: 2, end: 5, wordId: CAT, surface: "cat" },
    ], words);

    expect(runs).toEqual([
      { text: "A " },
      { text: "cat", word: { wordId: CAT, gloss: "kedi", saved: false } },
      { text: " sat. The " },
      { text: "cat", word: { wordId: CAT, gloss: "kedi", saved: false } },
      { text: " left." },
    ]);
  });

  it("çok kelimeli ifade TEK run'dır ve kaydedilmiş bayrağı taşınır", () => {
    const runs = buildParagraphRuns("Results account for the gap.", [{ start: 8, end: 19, wordId: ACCOUNT_FOR, surface: "account for" }], words);

    expect(runs).toEqual([
      { text: "Results " },
      { text: "account for", word: { wordId: ACCOUNT_FOR, gloss: "açıklamak", saved: true } },
      { text: " the gap." },
    ]);
  });

  it("bitişik span'lar arasında boş düz run üretmez; metnin başında/sonunda span olabilir", () => {
    const runs = buildParagraphRuns("catcat", [
      { start: 0, end: 3, wordId: CAT, surface: "cat" },
      { start: 3, end: 6, wordId: CAT, surface: "cat" },
    ], words);

    expect(runs.map((run) => run.text)).toEqual(["cat", "cat"]);
  });

  it("tipografik tırnak ve em dash'li metinde indeksler doğru", () => {
    const text = "“Cats” — cat.";
    const start = text.lastIndexOf("cat");
    const runs = buildParagraphRuns(text, [{ start, end: start + 3, wordId: CAT, surface: "cat" }], words);

    expect(runs[0]).toEqual({ text: "“Cats” — " });
    expect(runs[1]?.word?.wordId).toBe(CAT);
    expect(runs[2]).toEqual({ text: "." });
  });

  it("tutarsız veri sessizce düzeltilmez, açıkça patlar", () => {
    expect(() => buildParagraphRuns("A cat.", [{ start: 2, end: 5, wordId: CAT, surface: "dog" }], words)).toThrow("uyuşmuyor");
    expect(() => buildParagraphRuns("A cat.", [{ start: 2, end: 50, wordId: CAT, surface: "cat" }], words)).toThrow("dışında");
    expect(() =>
      buildParagraphRuns("catcat", [
        { start: 0, end: 4, wordId: CAT, surface: "catc" },
        { start: 3, end: 6, wordId: CAT, surface: "cat" },
      ], words),
    ).toThrow("Çakışan");
    expect(() => buildParagraphRuns("A cat.", [{ start: 2, end: 5, wordId: "00000000-0000-4000-8000-0000000000ff", surface: "cat" }], words)).toThrow("bulunamadı");
    expect(() => buildParagraphRuns("", [], words)).toThrow("Boş paragraf");
  });
});
