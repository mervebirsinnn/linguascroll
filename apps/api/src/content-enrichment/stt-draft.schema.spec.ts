import { sttDraftSchema } from "./stt-draft.schema";

function validDraft(): Record<string, unknown> {
  return {
    contentId: "a1final1",
    sourceFile: "/tmp/a1final1.mp4",
    languageStatus: "ready",
    detectedLanguage: "en",
    languageProbability: 0.99,
    durationMs: 20900,
    segments: [{ ordinal: 1, startMs: 0, endMs: 1000, text: "Hi." }],
  };
}

describe("sttDraftSchema", () => {
  it("geçerli bir draft.json'ı kabul eder", () => {
    expect(sttDraftSchema.safeParse(validDraft()).success).toBe(true);
  });

  it("madde 14 — boş bir transcript'i (segments: []) reddeder", () => {
    const result = sttDraftSchema.safeParse({ ...validDraft(), segments: [] });
    expect(result.success).toBe(false);
  });

  it("endMs <= startMs olan bir segment'i reddeder", () => {
    const draft = validDraft() as { segments: { startMs: number; endMs: number }[] };
    draft.segments[0]!.endMs = draft.segments[0]!.startMs;
    expect(sttDraftSchema.safeParse(draft).success).toBe(false);
  });

  it("geçersiz bir languageStatus değerini reddeder", () => {
    expect(sttDraftSchema.safeParse({ ...validDraft(), languageStatus: "unknown" }).success).toBe(false);
  });
});
