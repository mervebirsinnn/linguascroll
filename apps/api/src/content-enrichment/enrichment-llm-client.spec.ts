import { GoogleGenAI } from "@google/genai";
import { enrichTranscript, EnrichmentLlmError } from "./enrichment-llm-client";
import type { SttDraftSegment } from "./stt-draft.schema";

const segments: SttDraftSegment[] = [{ ordinal: 1, startMs: 0, endMs: 1000, text: "Hi, welcome." }];

function validEnrichmentJson(): string {
  return JSON.stringify({
    contentSlug: "dog-three-words",
    topic: "humor",
    cefrLevel: "A1",
    segments: [{ ordinal: 1, englishExplanation: "A greeting.", turkishExplanation: "Bir selamlama." }],
    vocabulary: [],
    learningPoints: [],
    quiz: {
      segmentOrdinal: 1,
      question: "What does the speaker say?",
      options: [
        { text: "Hi, welcome", isCorrect: true },
        { text: "Goodbye", isCorrect: false },
        { text: "Sorry", isCorrect: false },
        { text: "Thanks", isCorrect: false },
      ],
    },
  });
}

/** `client.interactions.create`'in gerçek dönüşü — sadece kodun okuduğu alanlar (`status`, `output_text`) dolduruluyor. */
function completedInteraction(outputText: string): Awaited<ReturnType<GoogleGenAI["interactions"]["create"]>> {
  return {
    id: "interaction_test",
    status: "completed",
    output_text: outputText,
  } as unknown as Awaited<ReturnType<GoogleGenAI["interactions"]["create"]>>;
}

describe("enrichTranscript", () => {
  it("LLM geçerli JSON döndürdüğünde validate edilmiş EnrichmentOutput'u döner", async () => {
    const client = new GoogleGenAI({ apiKey: "test" });
    jest.spyOn(client.interactions, "create").mockResolvedValue(completedInteraction(validEnrichmentJson()));

    const result = await enrichTranscript(segments, { client });

    expect(result.contentSlug).toBe("dog-three-words");
    expect(result.quiz.options).toHaveLength(4);
  });

  it("LLM geçersiz JSON metni döndürdüğünde EnrichmentLlmError fırlatır", async () => {
    const client = new GoogleGenAI({ apiKey: "test" });
    jest.spyOn(client.interactions, "create").mockResolvedValue(completedInteraction("this is not json"));

    await expect(enrichTranscript(segments, { client })).rejects.toThrow(EnrichmentLlmError);
  });

  it("LLM şemayı sağlamayan (ör. eksik alan) JSON döndürdüğünde EnrichmentLlmError fırlatır", async () => {
    const client = new GoogleGenAI({ apiKey: "test" });
    jest.spyOn(client.interactions, "create").mockResolvedValue(completedInteraction(JSON.stringify({ contentSlug: "x" })));

    await expect(enrichTranscript(segments, { client })).rejects.toThrow(EnrichmentLlmError);
  });

  it("LLM izin verilmeyen bir topic döndürdüğünde EnrichmentLlmError fırlatır", async () => {
    const client = new GoogleGenAI({ apiKey: "test" });
    const invalidTopic = JSON.parse(validEnrichmentJson());
    invalidTopic.topic = "sports";
    jest.spyOn(client.interactions, "create").mockResolvedValue(completedInteraction(JSON.stringify(invalidTopic)));

    await expect(enrichTranscript(segments, { client })).rejects.toThrow(EnrichmentLlmError);
  });

  it("interaction \"completed\" DIŞINDA bir status ile bittiğinde EnrichmentLlmError fırlatır", async () => {
    const client = new GoogleGenAI({ apiKey: "test" });
    jest.spyOn(client.interactions, "create").mockResolvedValue({
      id: "interaction_failed",
      status: "failed",
      output_text: undefined,
    } as unknown as Awaited<ReturnType<GoogleGenAI["interactions"]["create"]>>);

    await expect(enrichTranscript(segments, { client })).rejects.toThrow(EnrichmentLlmError);
  });

  it("API çağrısı reddedilirse (rate limit/timeout/hata) EnrichmentLlmError fırlatır", async () => {
    const client = new GoogleGenAI({ apiKey: "test" });
    jest.spyOn(client.interactions, "create").mockRejectedValue(new Error("rate limited"));

    await expect(enrichTranscript(segments, { client })).rejects.toThrow(EnrichmentLlmError);
  });

  it("client enjekte edilmediğinde ve GEMINI_API_KEY tanımsızken EnrichmentLlmError fırlatır (gerçek ağ çağrısı YAPMAZ)", async () => {
    const originalKey = process.env.GEMINI_API_KEY;
    delete process.env.GEMINI_API_KEY;
    try {
      await expect(enrichTranscript(segments)).rejects.toThrow(EnrichmentLlmError);
    } finally {
      if (originalKey !== undefined) {
        process.env.GEMINI_API_KEY = originalKey;
      }
    }
  });
});
