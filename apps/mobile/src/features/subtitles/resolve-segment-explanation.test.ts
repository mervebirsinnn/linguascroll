import type { LearningPoint, TranscriptSegment, VideoVocabularyItem } from "@linguascroll/shared-types";
import { isEffectivelySameSentence, resolveSegmentExplanation } from "./resolve-segment-explanation";

function makeLearningPoint(overrides: Partial<LearningPoint> = {}): LearningPoint {
  return {
    id: "lp-1",
    type: "phrase",
    expression: "double-edged sword",
    englishExplanation: "A double-edged sword is something that has both benefits and disadvantages.",
    turkishExplanation: "İki ucu keskin bir kılıç, hem faydası hem zararı olan bir şey demektir.",
    exampleEn: null,
    exampleTr: null,
    ...overrides,
  };
}

function makeSegment(overrides: Partial<TranscriptSegment> = {}): TranscriptSegment {
  return {
    id: "seg-1",
    ordinal: 1,
    startMs: 0,
    endMs: 1000,
    text: "AI can be a double-edged sword.",
    englishExplanation: "AI can be a double-edged sword.",
    turkishExplanation: "Yapay zeka iki ucu keskin bir kılıç olabilir.",
    learningPoints: [],
    ...overrides,
  };
}

function makeVocabularyItem(lemma: string, gloss: string): VideoVocabularyItem {
  return { word: { id: "w-1", language: "en", lemma, gloss }, saved: false };
}

describe("isEffectivelySameSentence", () => {
  it("birebir aynı metni true döner", () => {
    expect(isEffectivelySameSentence("AI can be a double-edged sword.", "AI can be a double-edged sword.")).toBe(true);
  });

  it("sadece büyük/küçük harf farkı olan metni true döner", () => {
    expect(isEffectivelySameSentence("ai can be a double-edged sword.", "AI CAN BE A DOUBLE-EDGED SWORD.")).toBe(true);
  });

  it("sadece noktalama/boşluk farkı olan metni true döner", () => {
    expect(isEffectivelySameSentence("AI can be a double-edged sword", "  AI, can be a double-edged sword!  ")).toBe(true);
  });

  it("gerçekten farklı bir açıklamayı false döner", () => {
    expect(
      isEffectivelySameSentence(
        "AI can be a double-edged sword.",
        "A double-edged sword is something that has both benefits and disadvantages.",
      ),
    ).toBe(false);
  });
});

describe("resolveSegmentExplanation", () => {
  it("englishExplanation doluysa VE orijinal cümleden farklıysa onu kullanır", () => {
    const segment = makeSegment({
      englishExplanation: "The speaker warns that AI has both good and bad consequences.",
    });
    expect(resolveSegmentExplanation(segment, [], "en")).toEqual({
      kind: "sentence",
      text: "The speaker warns that AI has both good and bad consequences.",
    });
  });

  it("englishExplanation orijinal cümlenin birebir tekrarıysa, bir phrase learning point'e düşer", () => {
    const segment = makeSegment({
      englishExplanation: "AI can be a double-edged sword.", // bug: cümlenin aynısı
      learningPoints: [makeLearningPoint()],
    });
    expect(resolveSegmentExplanation(segment, [], "en")).toEqual({
      kind: "labeled",
      label: "double-edged sword",
      text: "A double-edged sword is something that has both benefits and disadvantages.",
    });
  });

  it("englishExplanation boşsa VE phrase learning point yoksa, segment'te geçen bir vocabulary item'a düşer", () => {
    const segment = makeSegment({
      englishExplanation: "",
      text: "The report highlights bias in the study.",
      learningPoints: [],
    });
    const vocabulary = [makeVocabularyItem("bias", "a tendency to favor one side unfairly")];
    expect(resolveSegmentExplanation(segment, vocabulary, "en")).toEqual({
      kind: "labeled",
      label: "bias",
      text: "a tendency to favor one side unfairly",
    });
  });

  it("phrase learning point YOKSA ama grammar learning point varsa, ondan ÖNCE vocabulary'i dener", () => {
    const segment = makeSegment({
      englishExplanation: "AI can be a double-edged sword.",
      text: "AI can be a double-edged sword.",
      learningPoints: [
        makeLearningPoint({
          id: "lp-grammar",
          type: "grammar",
          expression: "can be",
          englishExplanation: "'Can be' expresses a possibility.",
        }),
      ],
    });
    const vocabulary = [makeVocabularyItem("double-edged sword", "hem faydası hem zararı olan bir şey")];
    expect(resolveSegmentExplanation(segment, vocabulary, "en")).toEqual({
      kind: "labeled",
      label: "double-edged sword",
      text: "hem faydası hem zararı olan bir şey",
    });
  });

  it("ne phrase learning point ne vocabulary eşleşmesi varsa, grammar learning point'e düşer", () => {
    const segment = makeSegment({
      englishExplanation: "AI can be a double-edged sword.",
      text: "AI can be a double-edged sword.",
      learningPoints: [
        makeLearningPoint({
          id: "lp-grammar",
          type: "grammar",
          expression: "can be",
          englishExplanation: "'Can be' expresses a possibility.",
        }),
      ],
    });
    expect(resolveSegmentExplanation(segment, [], "en")).toEqual({
      kind: "labeled",
      label: "can be",
      text: "'Can be' expresses a possibility.",
    });
  });

  it("hiçbir kullanılabilir veri yoksa 'none' döner — orijinal cümle ASLA tekrar edilmez", () => {
    const segment = makeSegment({ englishExplanation: "AI can be a double-edged sword.", learningPoints: [] });
    expect(resolveSegmentExplanation(segment, [], "en")).toEqual({ kind: "none" });
  });

  it("tek kelimelik filler bir vocabulary lemma'sını (örn. \"the\") fallback olarak KULLANMAZ", () => {
    const segment = makeSegment({ englishExplanation: "", text: "This is the plan.", learningPoints: [] });
    const vocabulary = [makeVocabularyItem("the", "belirli tanımlık")];
    expect(resolveSegmentExplanation(segment, vocabulary, "en")).toEqual({ kind: "none" });
  });

  it("tek kelimelik filler bir learning point expression'ını (örn. \"is\") fallback olarak KULLANMAZ", () => {
    const segment = makeSegment({
      englishExplanation: "AI can be a double-edged sword.",
      text: "AI can be a double-edged sword.",
      learningPoints: [makeLearningPoint({ type: "grammar", expression: "is", englishExplanation: "'Is' is a verb." })],
    });
    expect(resolveSegmentExplanation(segment, [], "en")).toEqual({ kind: "none" });
  });

  it("Türkçe taraf: turkishExplanation doluysa VE farklıysa AYNEN korunur (davranış değişmez)", () => {
    const segment = makeSegment({ turkishExplanation: "Yapay zeka iki ucu keskin bir kılıç olabilir." });
    expect(resolveSegmentExplanation(segment, [], "tr")).toEqual({
      kind: "sentence",
      text: "Yapay zeka iki ucu keskin bir kılıç olabilir.",
    });
  });

  it("Türkçe taraf da AYNI duplicate sorununu yaşarsa AYNI fallback zincirini kullanır", () => {
    const segment = makeSegment({
      text: "AI can be a double-edged sword.",
      turkishExplanation: "AI can be a double-edged sword.", // veri hatası: TR alanına İngilizce/aynı metin girilmiş
      learningPoints: [makeLearningPoint()],
    });
    expect(resolveSegmentExplanation(segment, [], "tr")).toEqual({
      kind: "labeled",
      label: "double-edged sword",
      text: "İki ucu keskin bir kılıç, hem faydası hem zararı olan bir şey demektir.",
    });
  });
});
