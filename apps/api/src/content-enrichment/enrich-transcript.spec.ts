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
    const draft = buildPublishDraft("a1final1", "/tmp/a1final1.mp4", 1000, draftSegments, enrichmentOutput);
    expect(draft.muxAssetId).toBe("local-dog-three-words");
    expect(draft.contentId).toBe("a1final1");
    expect(draft.sourceFile).toBe("/tmp/a1final1.mp4");
    expect(draft.segments[0]!.englishExplanation).toBe("en");
  });

  it("Chunk 13 — quality gate'i otomatik çalıştırıp sonucu gömer (bu fixture'ın vocabulary'si transcript'te yok, quiz metinleri çok kısa — needsReview beklenir)", () => {
    const draft = buildPublishDraft("a1final1", "/tmp/a1final1.mp4", 1000, draftSegments, enrichmentOutput);
    expect(draft.quality.status).toBe("needsReview");
    expect(draft.quality.issues.length).toBeGreaterThan(0);
    expect(draft.quality.issues.every((issue) => issue.severity === "warning")).toBe(true);
  });
});
