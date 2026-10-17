import { GoogleGenAI } from "@google/genai";
import {
  buildGlossPrompt,
  collectSegmentWords,
  generateGlossesForVideo,
  parseArgs,
  parseGlossOutput,
  WordGlossError,
  type GlossSegment,
} from "./generate-word-glosses";

const segments: GlossSegment[] = [
  { id: "00000000-0000-4000-8000-000000000001", ordinal: 1, text: "I didn't go, I went home." },
  { id: "00000000-0000-4000-8000-000000000002", ordinal: 2, text: "42!" },
];

describe("parseArgs", () => {
  it("--video-id yoksa undefined, varsa değeri döner", () => {
    expect(parseArgs([])).toEqual({ videoId: undefined });
    expect(parseArgs(["--video-id", "abc"])).toEqual({ videoId: "abc" });
  });

  it("bilinmeyen argümanda WordGlossError fırlatır", () => {
    expect(() => parseArgs(["--x"])).toThrow(WordGlossError);
  });
});

describe("collectSegmentWords", () => {
  it("normalize edilmiş, tekilleştirilmiş kelimeleri çıkarır; kelime olmayan segment boş kalır", () => {
    const result = collectSegmentWords(segments);
    expect(result[0]!.words).toEqual(["i", "didn't", "go", "went", "home"]);
    expect(result[1]!.words).toEqual([]);
  });
});

describe("buildGlossPrompt", () => {
  it("kelimesi olmayan segment'i prompt'a koymaz", () => {
    const prompt = buildGlossPrompt(collectSegmentWords(segments));
    expect(prompt).toContain("1. I didn't go, I went home.");
    expect(prompt).not.toContain("42!");
  });
});

describe("parseGlossOutput", () => {
  const segmentWords = collectSegmentWords(segments);

  it("sadece istenen (segment, kelime) çiftlerini kabul eder; uydurma kelime ve boş anlamı atar", () => {
    const result = parseGlossOutput(
      { segments: [{ ordinal: 1, glosses: [{ word: "Went", gloss: " gitti " }, { word: "invented", gloss: "uydurma" }, { word: "go", gloss: "  " }] }, { ordinal: 99, glosses: [{ word: "go", gloss: "x" }] }] },
      segmentWords,
    );
    expect(result.glosses).toEqual([{ segmentId: segments[0]!.id, word: "went", gloss: "gitti" }]);
    expect(result.missingCount).toBe(4);
  });

  it("şekil bozuksa WordGlossError fırlatır", () => {
    expect(() => parseGlossOutput({ nope: true }, segmentWords)).toThrow(WordGlossError);
  });
});

describe("generateGlossesForVideo", () => {
  function completed(outputText: string): Awaited<ReturnType<GoogleGenAI["interactions"]["create"]>> {
    return { id: "t", status: "completed", output_text: outputText } as unknown as Awaited<ReturnType<GoogleGenAI["interactions"]["create"]>>;
  }

  it("TEK Gemini çağrısı yapar ve doğrulanmış anlamları döner", async () => {
    const client = new GoogleGenAI({ apiKey: "test" });
    const create = jest
      .spyOn(client.interactions, "create")
      .mockResolvedValue(completed(JSON.stringify({ segments: [{ ordinal: 1, glosses: [{ word: "home", gloss: "ev" }] }] })));

    const result = await generateGlossesForVideo(segments, { client });

    expect(create).toHaveBeenCalledTimes(1);
    expect(result.glosses).toEqual([{ segmentId: segments[0]!.id, word: "home", gloss: "ev" }]);
  });

  it("hiç kelime yoksa Gemini'yi ÇAĞIRMAZ", async () => {
    const client = new GoogleGenAI({ apiKey: "test" });
    const create = jest.spyOn(client.interactions, "create");
    await generateGlossesForVideo([segments[1]!], { client });
    expect(create).not.toHaveBeenCalled();
  });

  it("Gemini hatasını WordGlossError'a çevirir", async () => {
    const client = new GoogleGenAI({ apiKey: "test" });
    jest.spyOn(client.interactions, "create").mockRejectedValue(new Error("429 quota"));
    await expect(generateGlossesForVideo(segments, { client })).rejects.toThrow(WordGlossError);
  });
});
