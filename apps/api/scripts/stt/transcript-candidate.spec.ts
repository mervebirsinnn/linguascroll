import { transcriptCandidateSchema } from "./transcript-candidate";

function makeCandidate(overrides: Record<string, unknown> = {}) {
  return {
    sourceFile: "input/example.mp4",
    detectedLanguage: "en",
    languageProbability: 0.92,
    durationMs: 30000,
    setupSeconds: 1.2,
    transcriptionSeconds: 4.5,
    words: [{ text: "hello", startMs: 0, endMs: 300 }],
    ...overrides,
  };
}

describe("transcriptCandidateSchema — yapısal doğrulama (dil POLİTİKASI yok)", () => {
  it("geçerli bir candidate'i kabul eder", () => {
    expect(transcriptCandidateSchema.safeParse(makeCandidate()).success).toBe(true);
  });

  it("İngilizce OLMAYAN bir dili de kabul eder — dil politikası burada değil", () => {
    const result = transcriptCandidateSchema.safeParse(
      makeCandidate({ detectedLanguage: "fr", languageProbability: 0.99 }),
    );
    expect(result.success).toBe(true);
  });

  it("düşük confidence'ı da kabul eder — reddetme kararı language-status.ts'te", () => {
    const result = transcriptCandidateSchema.safeParse(makeCandidate({ languageProbability: 0.1 }));
    expect(result.success).toBe(true);
  });

  it("boş words[] dizisini reddeder", () => {
    expect(transcriptCandidateSchema.safeParse(makeCandidate({ words: [] })).success).toBe(false);
  });

  it("endMs <= startMs olan bir word'ü reddeder", () => {
    const result = transcriptCandidateSchema.safeParse(
      makeCandidate({ words: [{ text: "x", startMs: 100, endMs: 100 }] }),
    );
    expect(result.success).toBe(false);
  });

  it("negatif startMs'i reddeder", () => {
    const result = transcriptCandidateSchema.safeParse(
      makeCandidate({ words: [{ text: "x", startMs: -1, endMs: 50 }] }),
    );
    expect(result.success).toBe(false);
  });

  it("languageProbability 0-1 aralığı dışındaysa reddeder", () => {
    expect(transcriptCandidateSchema.safeParse(makeCandidate({ languageProbability: 1.5 })).success).toBe(false);
  });

  it("durationMs pozitif olmalı", () => {
    expect(transcriptCandidateSchema.safeParse(makeCandidate({ durationMs: 0 })).success).toBe(false);
  });

  it("fazladan/provider-özel alanlar (örn. whisper'ın avg_logprob'u) şemayı bozmaz — bilinmeyen anahtarlar strip edilir", () => {
    const raw = { ...makeCandidate(), avgLogprob: -0.4, compressionRatio: 1.1 };
    const result = transcriptCandidateSchema.safeParse(raw);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).not.toHaveProperty("avgLogprob");
    }
  });
});
