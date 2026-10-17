import {
  assertReadyForEnrichment,
  buildPublishDraft,
  EnrichmentPipelineError,
  mergeSegments,
  parseArgs,
} from "./enrich-transcript";
import type { EnrichmentOutput } from "./enrichment-output.schema";
import { SegmentReferenceError } from "./validate-segment-references";

describe("parseArgs", () => {
  it("--content-id'yi ayrıştırır", () => {
    expect(parseArgs(["--content-id", "a1final1"])).toEqual({ contentId: "a1final1" });
  });

  it("--category'yi doğrulayıp ayrıştırır; verilmezse alan hiç eklenmez", () => {
    expect(parseArgs(["--content-id", "x", "--category", "ielts"])).toEqual({ contentId: "x", category: "ielts" });
    expect(Object.keys(parseArgs(["--content-id", "x"]))).toEqual(["contentId"]);
  });

  it("bilinmeyen --category değerinde throw eder", () => {
    expect(() => parseArgs(["--content-id", "x", "--category", "speaking"])).toThrow(EnrichmentPipelineError);
    expect(() => parseArgs(["--content-id", "x", "--category"])).toThrow(EnrichmentPipelineError);
  });

  it("--content-id verilmediğinde throw eder", () => {
    expect(() => parseArgs([])).toThrow(EnrichmentPipelineError);
  });

  it("bilinmeyen bir argümanda throw eder", () => {
    expect(() => parseArgs(["--foo", "bar"])).toThrow(EnrichmentPipelineError);
  });
});

describe("assertReadyForEnrichment", () => {
  it("\"ready\" durumunda throw etmez", () => {
    expect(() => assertReadyForEnrichment("ready", "x")).not.toThrow();
  });

  it("\"needsReview\" durumunda AÇIK bir mesajla throw eder (draft silinmiyor, sadece engelleniyor)", () => {
    expect(() => assertReadyForEnrichment("needsReview", "x")).toThrow(/needsReview/);
  });

  it("\"rejected\" durumunda throw eder", () => {
    expect(() => assertReadyForEnrichment("rejected", "x")).toThrow(EnrichmentPipelineError);
  });
});

describe("mergeSegments", () => {
  const draftSegments = [
    { ordinal: 1, startMs: 0, endMs: 1000, text: "Hi," },
    { ordinal: 2, startMs: 1000, endMs: 3000, text: "welcome." },
  ];
  const enrichedSegments: EnrichmentOutput["segments"] = [
    { ordinal: 1, englishExplanation: "en1", turkishExplanation: "tr1" },
    { ordinal: 2, englishExplanation: "en2", turkishExplanation: "tr2" },
  ];

  it("draft segment'lerinin timing/text'ini enrichment'ın açıklamalarıyla birleştirir", () => {
    const merged = mergeSegments(draftSegments, enrichedSegments);
    expect(merged).toEqual([
      { ordinal: 1, startMs: 0, endMs: 1000, text: "Hi,", englishExplanation: "en1", turkishExplanation: "tr1" },
      { ordinal: 2, startMs: 1000, endMs: 3000, text: "welcome.", englishExplanation: "en2", turkishExplanation: "tr2" },
    ]);
  });

  it("bir draft segment için enrichment eksikse throw eder (defense-in-depth)", () => {
    expect(() => mergeSegments(draftSegments, [enrichedSegments[0]!])).toThrow(SegmentReferenceError);
  });
});

describe("buildPublishDraft", () => {
  const draftSegments = [{ ordinal: 1, startMs: 0, endMs: 1000, text: "Hi, welcome." }];
  const enrichmentOutput: EnrichmentOutput = {
    contentSlug: "dog-three-words",
    topic: "humor",
    cefrLevel: "A1",
    segments: [{ ordinal: 1, englishExplanation: "en", turkishExplanation: "tr" }],
    vocabulary: [{ lemma: "cute", gloss: "sevimli" }],
    learningPoints: [],
    quiz: {
      segmentOrdinal: 1,
      question: "q?",
      options: [
        { text: "a", isCorrect: true },
        { text: "b", isCorrect: false },
        { text: "c", isCorrect: false },
        { text: "d", isCorrect: false },
      ],
    },
  };

  it("contentSlug'dan \"local-<slug>\" desenli bir muxAssetId üretir", () => {
    const draft = buildPublishDraft("a1final1", "/tmp/a1final1.mp4", 1000, draftSegments, enrichmentOutput, null);
    expect(draft.muxAssetId).toBe("local-dog-three-words");
    expect(draft.contentId).toBe("a1final1");
    expect(draft.sourceFile).toBe("/tmp/a1final1.mp4");
    expect(draft.storageKey).toBeNull();
    expect(draft.segments[0]!.englishExplanation).toBe("en");
  });

  it("Chunk 17D — storageKey verilirse (R2-backed akış) aynen draft'a taşır", () => {
    const draft = buildPublishDraft(
      "a1final1",
      "/tmp/a1final1.mp4",
      1000,
      draftSegments,
      enrichmentOutput,
      "originals/a1final1/uuid.mp4",
    );
    expect(draft.storageKey).toBe("originals/a1final1/uuid.mp4");
  });

  it("Chunk 13 — quality gate'i otomatik çalıştırıp sonucu gömer (bu fixture'ın vocabulary'si transcript'te yok, quiz metinleri çok kısa — needsReview beklenir)", () => {
    const draft = buildPublishDraft("a1final1", "/tmp/a1final1.mp4", 1000, draftSegments, enrichmentOutput, null);
    expect(draft.quality.status).toBe("needsReview");
    expect(draft.quality.issues.length).toBeGreaterThan(0);
    expect(draft.quality.issues.every((issue) => issue.severity === "warning")).toBe(true);
  });
  it("category verilirse draft'a yazılır; verilmezse alan HİÇ yazılmaz (publish general varsayar)", () => {
    const withCategory = buildPublishDraft("x", "/tmp/x.mp4", 1000, draftSegments, enrichmentOutput, null, "ielts");
    expect(withCategory.category).toBe("ielts");
    const without = buildPublishDraft("x", "/tmp/x.mp4", 1000, draftSegments, enrichmentOutput, null);
    expect(without.category).toBeUndefined();
    expect(Object.keys(without)).not.toContain("category");
  });

  it("contentId/dosya adı önekinden category ve cefrLevel TÜRETİLMEZ: kaynak yalnızca doğrulanmış artifact alanlarıdır", () => {
    // "ielts-c1-" öneki ne ielts kategorisi ne de C1 seviyesi kanıtıdır.
    const prefixed = buildPublishDraft("ielts-c1-foreign-languages", "/tmp/a.mp4", 1000, draftSegments, enrichmentOutput, null);
    expect(prefixed.category).toBeUndefined();
    expect(prefixed.cefrLevel).toBe("A1");
    // Tersi: "a1-" önekli bir id, enrichment çıktısındaki gerçek B2 seviyesini ezmez.
    const a1Prefixed = buildPublishDraft("a1-relationships-x", "/tmp/b.mp4", 1000, draftSegments, { ...enrichmentOutput, cefrLevel: "B2" }, null, "ielts");
    expect(a1Prefixed.cefrLevel).toBe("B2");
    expect(a1Prefixed.category).toBe("ielts");
  });
});
