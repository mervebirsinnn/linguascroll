import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { ApprovalQualityError, ApprovedArtifactError, promoteDraftToApproved } from "./approved-artifact";
import { ALLOW_UNAPPROVED_ENV, assertFromOutputAllowed, resolveApprovedPublication, UnapprovedPublishForbiddenError } from "./approved-publication";
import type { PublishDraft } from "./publish-draft.schema";

function draft(): PublishDraft {
  return {
    contentId: "demo-clip",
    muxAssetId: "local-demo-clip",
    sourceFile: "demo-clip.mp4",
    storageKey: null,
    durationMs: 3000,
    topic: "humor",
    cefrLevel: "B2",
    segments: [
      { ordinal: 1, startMs: 0, endMs: 1000, text: "He ended up staying there.", englishExplanation: "He stayed longer than planned.", turkishExplanation: "Planladığından uzun kaldı." },
      { ordinal: 2, startMs: 1000, endMs: 2000, text: "She loves reading books.", englishExplanation: "She enjoys reading very much.", turkishExplanation: "Okumaktan çok hoşlanıyor." },
      { ordinal: 3, startMs: 2000, endMs: 3000, text: "They went to the market yesterday.", englishExplanation: "They visited the market the day before.", turkishExplanation: "Bir önceki gün pazara gittiler." },
    ],
    vocabulary: [{ lemma: "market", gloss: "pazar" }],
    learningPoints: [{ segmentOrdinal: 1, type: "phrase", expression: "ended up staying", englishExplanation: "x", turkishExplanation: "y", exampleEn: null, exampleTr: null }],
    quiz: {
      segmentOrdinal: 2,
      question: "What does she love doing?",
      options: [
        { text: "Reading books", isCorrect: true },
        { text: "Cooking food", isCorrect: false },
        { text: "Playing games", isCorrect: false },
        { text: "Riding bikes", isCorrect: false },
      ],
    },
    quality: { status: "pass", issues: [] },
  };
}

describe("resolveApprovedPublication (CLI ve HTTP'nin ortak sınırı)", () => {
  let dir: string;
  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), "approved-pub-"));
  });
  afterEach(() => {
    fs.rmSync(dir, { recursive: true, force: true });
  });
  const promote = (d: PublishDraft = draft(), extra: object = {}) =>
    promoteDraftToApproved(d, { contentId: "demo-clip", acknowledgeNeedsReview: false, note: null, overwrite: false, media: { localFileName: "demo-clip.mp4" }, approvedDir: dir, ...extra });
  const tamper = (mutate: (artifact: { draft: PublishDraft }) => void) => {
    const filePath = path.join(dir, "demo-clip.json");
    const artifact = JSON.parse(fs.readFileSync(filePath, "utf-8")) as { draft: PublishDraft };
    mutate(artifact);
    fs.writeFileSync(filePath, JSON.stringify(artifact));
  };

  it("geçerli approved artifact çözülür; medya kaynağı media.localFileName'den gelir", () => {
    promote();
    const publication = resolveApprovedPublication("demo-clip", { approvedDir: dir, mediaSourceDir: "/src" });
    expect(publication.draft.contentId).toBe("demo-clip");
    expect(publication.quality.status).toBe("pass");
    expect(publication.mediaSource).toBe(path.join("/src", "demo-clip.mp4"));
  });

  it("approved yoksa reddedilir", () => {
    expect(() => resolveApprovedPublication("demo-clip", { approvedDir: dir })).toThrow(ApprovedArtifactError);
  });

  it("geçersiz approved şeması reddedilir", () => {
    fs.writeFileSync(path.join(dir, "demo-clip.json"), JSON.stringify({ schemaVersion: 2, approval: {}, media: {}, draft: {} }));
    expect(() => resolveApprovedPublication("demo-clip", { approvedDir: dir })).toThrow(ApprovedArtifactError);
  });

  it("bayat acknowledgement (terfiden sonra doğan yeni uyarı) reddedilir", () => {
    promote();
    tamper((artifact) => {
      artifact.draft.vocabulary = [{ lemma: "umbrella", gloss: "şemsiye" }];
    });
    expect(() => resolveApprovedPublication("demo-clip", { approvedDir: dir })).toThrow(ApprovalQualityError);
  });

  it("bayat quality (terfiden sonra reject'e düşen içerik) reddedilir", () => {
    promote();
    tamper((artifact) => {
      artifact.draft.segments[0]!.englishExplanation = " ";
    });
    expect(() => resolveApprovedPublication("demo-clip", { approvedDir: dir })).toThrow(ApprovalQualityError);
  });
});

describe("assertFromOutputAllowed (--from-output production guard)", () => {
  it("production + override yok → KESİN hata", () => {
    expect(() => assertFromOutputAllowed({ NODE_ENV: "production" })).toThrow(UnapprovedPublishForbiddenError);
  });

  it(`production + ${ALLOW_UNAPPROVED_ENV} tam olarak "true" değilse hâlâ hata ("1", "TRUE", "yes", "false", boş)`, () => {
    for (const value of ["1", "TRUE", "yes", "false", "", " true"]) {
      expect(() => assertFromOutputAllowed({ NODE_ENV: "production", [ALLOW_UNAPPROVED_ENV]: value })).toThrow(UnapprovedPublishForbiddenError);
    }
  });

  it(`production + ${ALLOW_UNAPPROVED_ENV}=true → açık override ile geçer`, () => {
    expect(() => assertFromOutputAllowed({ NODE_ENV: "production", [ALLOW_UNAPPROVED_ENV]: "true" })).not.toThrow();
  });

  it("yerel/development/test/tanımsız NODE_ENV'de override gerekmez", () => {
    for (const env of [{}, { NODE_ENV: "development" }, { NODE_ENV: "test" }, { NODE_ENV: "local" }]) {
      expect(() => assertFromOutputAllowed(env)).not.toThrow();
    }
  });

  it("override değişkeni production dışında anlamsızdır ve tek başına hiçbir şeyi değiştirmez", () => {
    expect(() => assertFromOutputAllowed({ [ALLOW_UNAPPROVED_ENV]: "true" })).not.toThrow();
  });
});
