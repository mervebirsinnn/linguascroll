import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { promoteDraftToApproved } from "./approved-artifact";
import { formatPrePublishReport, runPrePublishChecks, type MediaProbe } from "./pre-publish-check";
import type { PublishDraft } from "./publish-draft.schema";

function draft(overrides: Partial<PublishDraft> = {}): PublishDraft {
  return {
    contentId: "demo-clip",
    muxAssetId: "local-demo-clip",
    sourceFile: "demo-clip.mp4",
    storageKey: null,
    durationMs: 3000,
    topic: "humor",
    cefrLevel: "A1",
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
    ...overrides,
  };
}

const GOOD_PROBE: MediaProbe = { durationMs: 3000, width: 1080, height: 1920, videoCodec: "h264", audioCodec: "aac" };
const FULL_R2_ENV = { R2_ACCOUNT_ID: "a", R2_ACCESS_KEY_ID: "b", R2_SECRET_ACCESS_KEY: "c", R2_BUCKET_NAME: "d", R2_PUBLIC_BASE_URL: "https://x" };

describe("runPrePublishChecks (--check)", () => {
  let dir: string;
  let approvedDir: string;
  let mediaDir: string;
  let mediaSourceDir: string;
  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), "prepublish-"));
    approvedDir = path.join(dir, "approved");
    mediaDir = path.join(dir, "media");
    mediaSourceDir = path.join(dir, "source");
    fs.mkdirSync(mediaSourceDir);
    fs.writeFileSync(path.join(mediaSourceDir, "demo-clip.mp4"), "x");
  });
  afterEach(() => {
    fs.rmSync(dir, { recursive: true, force: true });
  });
  const approve = (d: PublishDraft, acknowledge = false, localFileName = "demo-clip.mp4") =>
    promoteDraftToApproved(d, {
      contentId: "demo-clip",
      acknowledgeNeedsReview: acknowledge,
      note: acknowledge ? "bilinçli" : null,
      overwrite: false,
      media: { localFileName },
      approvedDir,
    });
  const run = (probe: () => MediaProbe = () => GOOD_PROBE, extra: object = {}) =>
    runPrePublishChecks("demo-clip", { approvedDir, mediaSourceDir, mediaDir, probe, env: FULL_R2_ENV, ...extra });
  const statusOf = (report: ReturnType<typeof run>, name: string) => report.checks.find((check) => check.name.startsWith(name))?.status;

  it("sağlıklı approved içerik (r2 modu): tüm kontroller geçer, hiçbir şey yazılmaz, DB-gerektiren maddeler ayrıca listelenir", () => {
    approve(draft());
    const report = run();
    expect(report.ok).toBe(true);
    expect(report.checks.every((check) => check.status === "pass")).toBe(true);
    expect(statusOf(report, "R2 yapılandırma")).toBe("pass");
    expect(report.notVerifiable.join(" ")).toMatch(/idempotency/);
    expect(report.notVerifiable.join(" ")).toMatch(/R2/);
    expect(fs.existsSync(mediaDir)).toBe(false);
    expect(formatPrePublishReport(report)).toMatch(/DOĞRULANAMAYAN/);
  });

  it("medya yolu artifact'teki media.localFileName ile çözülür (contentId/muxAssetId'den türetilmez)", () => {
    fs.writeFileSync(path.join(mediaSourceDir, "farkli-ad.mp4"), "y");
    fs.rmSync(path.join(mediaSourceDir, "demo-clip.mp4"));
    approve(draft({ sourceFile: "farkli-ad.mp4" }), false, "farkli-ad.mp4");
    const report = run();
    expect(statusOf(report, "media")).toBe("pass");
    // contentId/muxAssetId adlı dosya var olsa bile artifact'teki ad kullanılır:
    fs.rmSync(path.join(mediaSourceDir, "farkli-ad.mp4"));
    fs.writeFileSync(path.join(mediaSourceDir, "demo-clip.mp4"), "x");
    expect(statusOf(run(), "media")).toBe("fail");
  });

  it("R2 env eksikse warn (r2 modu); local modda bu kontrol yok, hedef çakışması var", () => {
    approve(draft());
    expect(statusOf(run(() => GOOD_PROBE, { env: {} }), "R2 yapılandırma")).toBe("warn");
    const localReport = run(() => GOOD_PROBE, { mode: "local" });
    expect(statusOf(localReport, "R2 yapılandırma")).toBeUndefined();
    expect(statusOf(localReport, "yerel hedef")).toBe("pass");
    fs.mkdirSync(mediaDir, { recursive: true });
    fs.writeFileSync(path.join(mediaDir, "demo-clip.mp4"), "y");
    expect(statusOf(run(() => GOOD_PROBE, { mode: "local" }), "yerel hedef")).toBe("fail");
  });

  it("approved artifact yoksa başarısız olur (output'a düşmez)", () => {
    const report = run();
    expect(report.ok).toBe(false);
    expect(statusOf(report, "approved artifact")).toBe("fail");
  });

  it("medya yoksa / codec yanlışsa / süre uyuşmuyorsa fail", () => {
    approve(draft({ sourceFile: "yok.mp4" }), false, "yok.mp4");
    expect(statusOf(run(), "media")).toBe("fail");
    fs.writeFileSync(path.join(mediaSourceDir, "yok.mp4"), "x");
    expect(statusOf(run(() => ({ ...GOOD_PROBE, videoCodec: "vp9" })), "media")).toBe("fail");
    expect(statusOf(run(() => ({ ...GOOD_PROBE, audioCodec: null })), "media")).toBe("fail");
    expect(statusOf(run(() => ({ ...GOOD_PROBE, durationMs: 4000 })), "media")).toBe("fail");
  });

  it(".mp4 olmayan medya (örn. .mov) yayın için fail", () => {
    fs.writeFileSync(path.join(mediaSourceDir, "clip.mov"), "x");
    approve(draft({ sourceFile: "clip.mov" }), false, "clip.mov");
    expect(statusOf(run(), "media")).toBe("fail");
  });

  it("9:16 olmayan video warn (fail değil)", () => {
    approve(draft());
    const report = run(() => ({ ...GOOD_PROBE, width: 1920, height: 1080 }));
    expect(statusOf(report, "media")).toBe("warn");
    expect(report.ok).toBe(true);
  });

  it("segment video süresini aşarsa fail", () => {
    approve(draft({ durationMs: 2500 }));
    const report = run(() => ({ ...GOOD_PROBE, durationMs: 2500 }));
    expect(statusOf(report, "segmentler video süresi içinde")).toBe("fail");
    expect(report.ok).toBe(false);
  });

  it("acknowledge edilmiş needsReview: ok=true ama quality ve yüzey kontrolü warn", () => {
    const d = draft();
    d.vocabulary = [{ lemma: "umbrella", gloss: "şemsiye" }];
    approve(d, true);
    const report = run();
    expect(report.ok).toBe(true);
    expect(statusOf(report, "quality")).toBe("warn");
    expect(statusOf(report, "learning point / vocabulary yüzey")).toBe("warn");
  });
});
