import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import {
  ApprovalQualityError,
  ApprovedArtifactError,
  approvedArtifactSchema,
  assertApprovedQuality,
  loadApprovedArtifact,
  mapDraftMedia,
  mediaFileNameSchema,
  promoteDraftToApproved,
  resolveApprovedMediaSource,
  resolveApprovedPath,
} from "./approved-artifact";
import type { PublishDraft } from "./publish-draft.schema";

function cleanDraft(overrides: Partial<PublishDraft> = {}): PublishDraft {
  return {
    contentId: "demo-clip",
    muxAssetId: "local-demo-clip",
    sourceFile: "C:\\Users\\someone\\apps\\api\\scripts\\stt\\input\\demo-clip.mp4",
    storageKey: null,
    durationMs: 5000,
    topic: "humor",
    cefrLevel: "A1",
    segments: [
      { ordinal: 1, startMs: 0, endMs: 1000, text: "He ended up staying there.", englishExplanation: "He stayed longer than planned.", turkishExplanation: "Planladığından uzun kaldı." },
      { ordinal: 2, startMs: 1000, endMs: 2000, text: "She loves reading books.", englishExplanation: "She enjoys reading very much.", turkishExplanation: "Okumaktan çok hoşlanıyor." },
      { ordinal: 3, startMs: 2000, endMs: 3000, text: "They went to the market yesterday.", englishExplanation: "They visited the market the day before.", turkishExplanation: "Bir önceki gün pazara gittiler." },
    ],
    vocabulary: [{ lemma: "market", gloss: "pazar" }],
    learningPoints: [
      { segmentOrdinal: 1, type: "phrase", expression: "ended up staying", englishExplanation: "An unplanned result.", turkishExplanation: "Planlanmamış sonuç.", exampleEn: null, exampleTr: null },
    ],
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
    ...overrides,
  };
}

/** Quality gate'ten needsReview döndüren (tek bir warning) içerik. */
function needsReviewDraft(): PublishDraft {
  const draft = cleanDraft();
  draft.vocabulary = [{ lemma: "umbrella", gloss: "şemsiye" }]; // transcript'te yok → vocabularyLemmaNotInTranscript
  return draft;
}

const NOW = new Date("2026-10-14T10:00:00.000Z");
const MEDIA = { localFileName: "demo-clip.mp4" };

describe("mediaFileNameSchema (medya kimliği sınırı)", () => {
  it.each(["clip.mp4", "a1-ielts-ask-for-directions.mp4", "Clip_01.MOV", "x.webm", "x.mkv", "x.m4v"])('"%s" kabul edilir', (name) => {
    expect(mediaFileNameSchema.safeParse(name).success).toBe(true);
  });

  it.each([
    ["../evil.mp4", "traversal"],
    ["..\\evil.mp4", "traversal (backslash)"],
    ["/etc/passwd.mp4", "mutlak yol"],
    ["C:\\x\\clip.mp4", "windows mutlak yol"],
    ["C:clip.mp4", "windows sürücü"],
    ["sub/clip.mp4", "slash"],
    ["sub\\clip.mp4", "backslash"],
    ["a..b.mp4", "çift nokta"],
    [".hidden.mp4", "nokta ile başlayan"],
    ["clip.exe", "izinsiz uzantı"],
    ["clip", "uzantısız"],
    ["clip.mp4.sh", "çift uzantı sonu izinsiz"],
    ["", "boş"],
    ["clip name.mp4", "boşluk"],
  ])('"%s" reddedilir (%s)', (name) => {
    expect(mediaFileNameSchema.safeParse(name).success).toBe(false);
  });
});

describe("mapDraftMedia (açık medya eşlemesi)", () => {
  const exists = (names: string[]) => (file: string) => names.includes(path.basename(file));

  it("draft.sourceFile'ın basename'ini kullanır (win32 yolu dahil), contentId/muxAssetId'den türetmez", () => {
    const draft = cleanDraft({ contentId: "other-id", muxAssetId: "local-some-slug" });
    expect(mapDraftMedia(draft, { fileExists: exists(["demo-clip.mp4"]) })).toEqual({ localFileName: "demo-clip.mp4" });
    // muxAssetId slug'ı ("some-slug.mp4") dosya olarak var olsa bile kullanılmaz:
    expect(() => mapDraftMedia(draft, { fileExists: exists(["some-slug.mp4", "other-id.mp4"]) })).toThrow(ApprovedArtifactError);
  });

  it("override (--media-file) önceliklidir ve doğrulanır", () => {
    expect(mapDraftMedia(cleanDraft(), { override: "alt.mp4", fileExists: exists(["alt.mp4"]) })).toEqual({ localFileName: "alt.mp4" });
    expect(() => mapDraftMedia(cleanDraft(), { override: "../x.mp4", fileExists: () => true })).toThrow(ApprovedArtifactError);
  });

  it("dosya medya dizininde yoksa açık hata verir (otomatik yeniden adlandırma/kopya yok)", () => {
    expect(() => mapDraftMedia(cleanDraft(), { fileExists: () => false })).toThrow(/bulunamadı/);
  });
});

describe("approved artifact promotion", () => {
  let dir: string;
  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), "approved-"));
  });
  afterEach(() => {
    fs.rmSync(dir, { recursive: true, force: true });
  });
  const base = (extra: object = {}) => ({ contentId: "demo-clip", acknowledgeNeedsReview: false, note: null, overwrite: false, media: MEDIA, now: NOW, approvedDir: dir, ...extra });

  it("temiz (pass) içerik ack/gerekçe olmadan terfi eder; v2 şemadan geçer, quality taze hesaplanır, sourceFile = media.localFileName", () => {
    const { filePath, artifact } = promoteDraftToApproved(cleanDraft({ quality: { status: "reject", issues: [] } }), base());
    expect(filePath).toBe(path.join(dir, "demo-clip.json"));
    expect(artifact.schemaVersion).toBe(2);
    expect(artifact.approval).toEqual({ approvedAt: NOW.toISOString(), qualityStatusAtApproval: "pass", acknowledgedIssueCodes: [], note: null });
    expect(artifact.media).toEqual(MEDIA);
    expect(artifact.draft.sourceFile).toBe("demo-clip.mp4"); // makineye bağlı yol artifact'e yazılmaz
    expect(artifact.draft.quality.status).toBe("pass"); // diskteki sahte quality'ye güvenilmedi
    expect(approvedArtifactSchema.safeParse(JSON.parse(fs.readFileSync(filePath, "utf-8"))).success).toBe(true);
  });

  it("geçersiz media.localFileName ile terfi eder değil, şema reddeder", () => {
    expect(() => promoteDraftToApproved(cleanDraft(), base({ media: { localFileName: "../evil.mp4" } }))).toThrow();
    expect(fs.existsSync(path.join(dir, "demo-clip.json"))).toBe(false);
  });

  it("reject içerik hiçbir flag ile terfi etmez ve dosya yazılmaz", () => {
    const draft = cleanDraft();
    draft.segments[0]!.englishExplanation = "   ";
    expect(() => promoteDraftToApproved(draft, base({ acknowledgeNeedsReview: true, note: "x" }))).toThrow(ApprovalQualityError);
    expect(fs.existsSync(path.join(dir, "demo-clip.json"))).toBe(false);
  });

  it("needsReview, açık acknowledgement olmadan approved'a GEÇMEZ", () => {
    expect(() => promoteDraftToApproved(needsReviewDraft(), base())).toThrow(/needsReview/);
    expect(fs.existsSync(path.join(dir, "demo-clip.json"))).toBe(false);
  });

  it("needsReview acknowledgement'ı gerekçe (note) olmadan REDDEDİLİR", () => {
    expect(() => promoteDraftToApproved(needsReviewDraft(), base({ acknowledgeNeedsReview: true }))).toThrow(/--note/);
    expect(() => promoteDraftToApproved(needsReviewDraft(), base({ acknowledgeNeedsReview: true, note: "   " }))).toThrow(/--note/);
  });

  it("needsReview + ack + gerekçe: terfi eder, uyarı kodları ve gerekçe artifact'e içerik bazında yazılır", () => {
    const { artifact } = promoteDraftToApproved(needsReviewDraft(), base({ acknowledgeNeedsReview: true, note: "bilinçli: gloss örnek kelime" }));
    expect(artifact.approval.qualityStatusAtApproval).toBe("needsReview");
    expect(artifact.approval.acknowledgedIssueCodes).toEqual(["vocabularyLemmaNotInTranscript"]);
    expect(artifact.approval.note).toBe("bilinçli: gloss örnek kelime");
  });

  it("var olan approved dosyanın üzerine --overwrite olmadan YAZMAZ; overwrite ile yazar", () => {
    promoteDraftToApproved(cleanDraft(), base());
    const before = fs.readFileSync(path.join(dir, "demo-clip.json"), "utf-8");
    expect(() => promoteDraftToApproved(cleanDraft({ durationMs: 9999 }), base())).toThrow(ApprovedArtifactError);
    expect(fs.readFileSync(path.join(dir, "demo-clip.json"), "utf-8")).toBe(before);
    promoteDraftToApproved(cleanDraft({ durationMs: 9999 }), base({ overwrite: true }));
    expect(loadApprovedArtifact("demo-clip", dir).draft.durationMs).toBe(9999);
    expect(fs.readdirSync(dir)).toEqual(["demo-clip.json"]); // .tmp artığı kalmaz
  });

  it("geçersiz/path-traversal contentId reddedilir", () => {
    expect(() => resolveApprovedPath("../evil", dir)).toThrow(ApprovedArtifactError);
    expect(() => resolveApprovedPath("A B", dir)).toThrow(ApprovedArtifactError);
  });

  it("resolveApprovedMediaSource: <mediaSourceDir>/<media.localFileName> (publish ve check'in ortak çözümü)", () => {
    expect(resolveApprovedMediaSource({ media: MEDIA }, "/media-src")).toBe(path.join("/media-src", "demo-clip.mp4"));
  });
});

describe("loadApprovedArtifact / assertApprovedQuality", () => {
  let dir: string;
  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), "approved-"));
  });
  afterEach(() => {
    fs.rmSync(dir, { recursive: true, force: true });
  });
  const promote = (draft: PublishDraft = cleanDraft(), extra: object = {}) =>
    promoteDraftToApproved(draft, { contentId: "demo-clip", acknowledgeNeedsReview: false, note: null, overwrite: false, media: MEDIA, approvedDir: dir, ...extra });
  const tamper = (mutate: (artifact: Record<string, unknown> & { draft: PublishDraft }) => void) => {
    const filePath = path.join(dir, "demo-clip.json");
    const artifact = JSON.parse(fs.readFileSync(filePath, "utf-8")) as Record<string, unknown> & { draft: PublishDraft };
    mutate(artifact);
    fs.writeFileSync(filePath, JSON.stringify(artifact));
  };

  it("olmayan approved artifact için promote talimatıyla hata verir (output'a sessizce düşmez)", () => {
    expect(() => loadApprovedArtifact("demo-clip", dir)).toThrow(/promote-content/);
  });

  it("şemaya uymayan dosyayı reddeder (runtime Zod)", () => {
    fs.writeFileSync(path.join(dir, "demo-clip.json"), JSON.stringify({ schemaVersion: 2, approval: {}, draft: {} }));
    expect(() => loadApprovedArtifact("demo-clip", dir)).toThrow(ApprovedArtifactError);
  });

  it("media alanı olmayan eski (v1) artifact reddedilir", () => {
    promote();
    tamper((artifact) => {
      artifact.schemaVersion = 1;
      delete artifact.media;
    });
    expect(() => loadApprovedArtifact("demo-clip", dir)).toThrow(ApprovedArtifactError);
  });

  it("media.localFileName ile draft.sourceFile ayrışırsa reddeder", () => {
    promote();
    tamper((artifact) => {
      artifact.draft.sourceFile = "baska.mp4";
    });
    expect(() => loadApprovedArtifact("demo-clip", dir)).toThrow(/media\.localFileName/);
  });

  it("dosya adı ile içerideki contentId uyuşmazsa reddeder", () => {
    promote();
    fs.renameSync(path.join(dir, "demo-clip.json"), path.join(dir, "other-clip.json"));
    expect(() => loadApprovedArtifact("other-clip", dir)).toThrow(/uyuşmuyor/);
  });

  it("terfiden SONRA içerik elle bozulup yeni bir uyarı doğarsa publish gate'i durdurur (acknowledge kapsamı)", () => {
    promote();
    tamper((artifact) => {
      artifact.draft.vocabulary = [{ lemma: "umbrella", gloss: "şemsiye" }];
    });
    expect(() => assertApprovedQuality(loadApprovedArtifact("demo-clip", dir))).toThrow(/acknowledge edilmemiş/);
  });

  it("terfiden sonra reject'e düşen içerik override edilemez", () => {
    promote();
    tamper((artifact) => {
      artifact.draft.segments[1]!.englishExplanation = "  ";
    });
    expect(() => assertApprovedQuality(loadApprovedArtifact("demo-clip", dir))).toThrow(/reject/);
  });

  it("acknowledge edilmiş needsReview artifact publish gate'inden geçer", () => {
    promote(needsReviewDraft(), { acknowledgeNeedsReview: true, note: "bilinçli" });
    expect(assertApprovedQuality(loadApprovedArtifact("demo-clip", dir)).status).toBe("needsReview");
  });
});
