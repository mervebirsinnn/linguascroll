import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import type { PublishDraft } from "./publish-draft.schema";
import {
  assertPassesQualityGate,
  assertLocalMediaAllowed,
  copyMediaFile,
  parseArgs,
  PublishPipelineError,
  PublishQualityNeedsReviewError,
  PublishQualityRejectedError,
  requiresLocalMediaCopy,
  resolveMediaDestination,
} from "./publish-content";

describe("parseArgs", () => {
  it("--content-id'yi ayrıştırır; varsayılan: approved akışı (fromOutput=false, check=false, ack=false)", () => {
    expect(parseArgs(["--content-id", "a1final1"])).toEqual({ contentId: "a1final1", acknowledgeNeedsReview: false, checkOnly: false, fromOutput: false, local: false });
  });

  it("--from-output + --acknowledge-needs-review birlikte geçerli (eski/AI çıktı yolu, açık opt-in)", () => {
    expect(parseArgs(["--content-id", "a1final1", "--from-output", "--acknowledge-needs-review"])).toEqual({
      contentId: "a1final1",
      acknowledgeNeedsReview: true,
      checkOnly: false,
      fromOutput: true,
      local: false,
    });
  });

  it("--acknowledge-needs-review, --from-output olmadan REDDEDİLİR (global bypass yok; ack artifact'te)", () => {
    expect(() => parseArgs(["--content-id", "a1final1", "--acknowledge-needs-review"])).toThrow(PublishPipelineError);
  });

  it("--check yalnızca approved artifact'i doğrular; --from-output ile birleşmez", () => {
    expect(parseArgs(["--content-id", "a1final1", "--check"]).checkOnly).toBe(true);
    expect(() => parseArgs(["--content-id", "a1final1", "--check", "--from-output"])).toThrow(PublishPipelineError);
  });

  it("--content-id verilmediğinde throw eder", () => {
    expect(() => parseArgs([])).toThrow(PublishPipelineError);
  });

  it("--local (dev: public/media kopyası) ayrıştırılır; --from-output ile birleşmez", () => {
    expect(parseArgs(["--content-id", "a1final1", "--local"]).local).toBe(true);
    expect(() => parseArgs(["--content-id", "a1final1", "--local", "--from-output"])).toThrow(PublishPipelineError);
  });
});

describe("assertLocalMediaAllowed (production'da --local yasak)", () => {
  it("NODE_ENV=production → hata; development/test/tanımsız → izin", () => {
    expect(() => assertLocalMediaAllowed({ NODE_ENV: "production" })).toThrow(PublishPipelineError);
    expect(() => assertLocalMediaAllowed({ NODE_ENV: "development" })).not.toThrow();
    expect(() => assertLocalMediaAllowed({ NODE_ENV: "test" })).not.toThrow();
    expect(() => assertLocalMediaAllowed({})).not.toThrow();
  });
});

describe("resolveMediaDestination", () => {
  it("\"local-<slug>\" muxAssetId'sinden <mediaDir>/<slug>.mp4 türetir", () => {
    expect(resolveMediaDestination("local-dog-three-words", "/media")).toBe(
      path.join("/media", "dog-three-words.mp4"),
    );
  });
});

describe("requiresLocalMediaCopy", () => {
  const BASE_DRAFT: PublishDraft = {
    contentId: "x",
    muxAssetId: "local-x",
    sourceFile: "/tmp/x.mp4",
    durationMs: 5000,
    topic: "humor",
    cefrLevel: "A1",
    segments: [{ ordinal: 1, startMs: 0, endMs: 1000, text: "Hi.", englishExplanation: "en", turkishExplanation: "tr" }],
    vocabulary: [],
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
    quality: { status: "pass", issues: [] },
  };

  it("storageKey YOKSA (offline/yerel akış) true döner — copyMediaFile ÇAĞRILMALI", () => {
    expect(requiresLocalMediaCopy(BASE_DRAFT)).toBe(true);
  });

  it("storageKey null İSE (aynı offline/yerel akış) true döner", () => {
    expect(requiresLocalMediaCopy({ ...BASE_DRAFT, storageKey: null })).toBe(true);
  });

  it("storageKey dolu İSE (R2-backed akış) false döner — copyMediaFile ÇAĞRILMAMALI", () => {
    expect(requiresLocalMediaCopy({ ...BASE_DRAFT, storageKey: "originals/x/uuid.mp4" })).toBe(false);
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
