import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import type { PublishDraft } from "./publish-draft.schema";
import {
  assertPassesQualityGate,
  copyMediaFile,
  parseArgs,
  PublishPipelineError,
  PublishQualityNeedsReviewError,
  PublishQualityRejectedError,
  resolveMediaDestination,
} from "./publish-content";

describe("parseArgs", () => {
  it("--content-id'yi ayrıştırır, --acknowledge-needs-review verilmezse false", () => {
    expect(parseArgs(["--content-id", "a1final1"])).toEqual({ contentId: "a1final1", acknowledgeNeedsReview: false });
  });

  it("--acknowledge-needs-review bayrağını true yapar", () => {
    expect(parseArgs(["--content-id", "a1final1", "--acknowledge-needs-review"])).toEqual({
      contentId: "a1final1",
      acknowledgeNeedsReview: true,
    });
  });

  it("--content-id verilmediğinde throw eder", () => {
    expect(() => parseArgs([])).toThrow(PublishPipelineError);
  });
});

describe("resolveMediaDestination", () => {
  it("\"local-<slug>\" muxAssetId'sinden <mediaDir>/<slug>.mp4 türetir", () => {
    expect(resolveMediaDestination("local-dog-three-words", "/media")).toBe(
      path.join("/media", "dog-three-words.mp4"),
    );
  });
});

describe("copyMediaFile", () => {
  let sourceDir: string;
  let sourceFile: string;
  let mediaDir: string;

  beforeEach(() => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "publish-content-test-"));
    sourceDir = path.join(root, "source");
    mediaDir = path.join(root, "media");
    fs.mkdirSync(sourceDir, { recursive: true });
    sourceFile = path.join(sourceDir, "input.mp4");
    fs.writeFileSync(sourceFile, "fake video bytes");
  });

  afterEach(() => {
    fs.rmSync(path.dirname(sourceDir), { recursive: true, force: true });
  });

  it("kaynak dosyayı <mediaDir>/<slug>.mp4'e kopyalar", () => {
    const destination = copyMediaFile(sourceFile, "local-copy-media-test", mediaDir);
    expect(fs.readFileSync(destination, "utf-8")).toBe("fake video bytes");
  });

  it("kaynak dosya yoksa açıkça throw eder", () => {
    expect(() => copyMediaFile(path.join(sourceDir, "missing.mp4"), "local-copy-media-test", mediaDir)).toThrow(
      PublishPipelineError,
    );
  });

  it("hedef zaten varsa üzerine YAZMAZ, throw eder", () => {
    copyMediaFile(sourceFile, "local-copy-media-test", mediaDir);
    expect(() => copyMediaFile(sourceFile, "local-copy-media-test", mediaDir)).toThrow(PublishPipelineError);
  });
});

/**
 * Chunk 13 — madde: `--acknowledge-needs-review` SADECE `needsReview`'ı
 * override edebilir, `reject`'i ASLA (flag verilse bile). `quality` alanının
 * değeri (aşağıdaki fixture'larda statik bir placeholder) `assertPassesQualityGate`
 * tarafından hiç okunmuyor — fresh `evaluateContentQuality(draft)` çalışıyor
 * (bkz. publish-content.ts yorumu).
 */
function draftWithQuizOptions(options: { text: string; isCorrect: boolean }[]): PublishDraft {
  return {
    contentId: "x",
    muxAssetId: "local-x",
    sourceFile: "/tmp/x.mp4",
    durationMs: 5000,
    topic: "humor",
    cefrLevel: "A1",
    segments: [
      { ordinal: 1, startMs: 0, endMs: 1000, text: "She loves reading books.", englishExplanation: "She enjoys reading very much.", turkishExplanation: "Okumaktan çok hoşlanıyor." },
      { ordinal: 2, startMs: 1000, endMs: 2000, text: "They went to the market yesterday.", englishExplanation: "They visited the market the day before.", turkishExplanation: "Bir önceki gün pazara gittiler." },
      { ordinal: 3, startMs: 2000, endMs: 3000, text: "He fixed his old bicycle.", englishExplanation: "He repaired his old bike.", turkishExplanation: "Eski bisikletini tamir etti." },
    ],
    vocabulary: [{ lemma: "market", gloss: "pazar" }],
    learningPoints: [],
    quiz: { segmentOrdinal: 1, question: "What does she love doing?", options },
    quality: { status: "pass", issues: [] }, // assertPassesQualityGate bu alanı OKUMUYOR — placeholder
  };
}

const PASSING_DRAFT = draftWithQuizOptions([
  { text: "Reading books", isCorrect: true },
  { text: "Cooking food", isCorrect: false },
  { text: "Playing games", isCorrect: false },
  { text: "Watching movies", isCorrect: false },
]);

const NEEDS_REVIEW_DRAFT: PublishDraft = { ...PASSING_DRAFT, vocabulary: [] }; // emptyVocabulary → warning

const REJECT_DRAFT = draftWithQuizOptions([
  { text: "Reading books", isCorrect: true },
  { text: "READING BOOKS", isCorrect: false }, // duplicateQuizOptions → reject
  { text: "Playing games", isCorrect: false },
  { text: "Watching movies", isCorrect: false },
]);

describe("assertPassesQualityGate", () => {
  it("pass → flag olmadan da izin verir", () => {
    expect(() => assertPassesQualityGate(PASSING_DRAFT, false)).not.toThrow();
  });

  it("pass → flag verilse de sorunsuz izin verir (flag zararsız/no-op)", () => {
    expect(() => assertPassesQualityGate(PASSING_DRAFT, true)).not.toThrow();
  });

  it("needsReview + flag YOK → engellenir", () => {
    expect(() => assertPassesQualityGate(NEEDS_REVIEW_DRAFT, false)).toThrow(PublishQualityNeedsReviewError);
  });

  it("needsReview + --acknowledge-needs-review → izin verilir", () => {
    expect(() => assertPassesQualityGate(NEEDS_REVIEW_DRAFT, true)).not.toThrow();
  });

  it("reject + flag YOK → engellenir", () => {
    expect(() => assertPassesQualityGate(REJECT_DRAFT, false)).toThrow(PublishQualityRejectedError);
  });

  it("reject + --acknowledge-needs-review → YİNE DE engellenir (reject hiçbir flag'le override edilemez)", () => {
    expect(() => assertPassesQualityGate(REJECT_DRAFT, true)).toThrow(PublishQualityRejectedError);
  });
});
