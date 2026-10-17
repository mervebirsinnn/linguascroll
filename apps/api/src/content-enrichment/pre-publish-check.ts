import { execFileSync } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";
import { z } from "zod";
import {
  APPROVED_DIR,
  assertApprovedQuality,
  loadApprovedArtifact,
  MEDIA_SOURCE_DIR,
  resolveApprovedMediaSource,
  type ApprovedArtifact,
} from "./approved-artifact";

/**
 * `publish-content --check`: DB'ye ve R2'ye YAZMAYAN (ve DATABASE_URL gerektirmeyen) tam pre-publish
 * doğrulaması. Her kontrol bağımsız raporlanır (biri patlayınca diğerleri gizlenmez). DB/R2 erişimi
 * olmadan doğrulanamayan maddeler `notVerifiable` altında AYRICA listelenir — "OK" bu maddeler için
 * bir kanıt DEĞİLDİR.
 */
export type CheckStatus = "pass" | "warn" | "fail";
export interface CheckResult {
  readonly name: string;
  readonly status: CheckStatus;
  readonly detail: string;
}
export interface PrePublishReport {
  readonly contentId: string;
  readonly checks: readonly CheckResult[];
  readonly notVerifiable: readonly string[];
  readonly ok: boolean;
}
export interface MediaProbe {
  readonly durationMs: number;
  readonly width: number | null;
  readonly height: number | null;
  readonly videoCodec: string | null;
  readonly audioCodec: string | null;
}
export type MediaProber = (file: string) => MediaProbe;

const DURATION_TOLERANCE_MS = 150;
const NINE_SIXTEEN = 9 / 16;
const ASPECT_TOLERANCE = 0.02;

const NOT_VERIFIABLE_WITHOUT_DB = [
  "muxAssetId idempotency: videos tablosunda aynı mux_asset_id zaten var mı (DB gerekir)",
  "contentId/muxAssetId başka bir içerikle çakışıyor mu (videos_mux_asset_id_unique, DB gerekir)",
  "Migration'ların hedef veritabanında uygulanmış olması (videos.background_color vb.)",
  "R2: bucket erişimi/izinleri ve gerçek yükleme (publish önce R2'ye yükler, sonra DB yazar; DB hatasında nesneyi siler)",
];

const ffprobeSchema = z.object({
  format: z.object({ duration: z.string() }),
  streams: z.array(z.object({ codec_type: z.string(), codec_name: z.string().optional(), width: z.number().optional(), height: z.number().optional() })),
});

export const ffprobeMedia: MediaProber = (file) => {
  const raw: unknown = JSON.parse(execFileSync("ffprobe", ["-v", "error", "-show_streams", "-show_format", "-of", "json", file], { encoding: "utf8" }));
  const parsed = ffprobeSchema.parse(raw);
  const video = parsed.streams.find((stream) => stream.codec_type === "video");
  const audio = parsed.streams.find((stream) => stream.codec_type === "audio");
  return {
    durationMs: Math.round(Number(parsed.format.duration) * 1000),
    width: video?.width ?? null,
    height: video?.height ?? null,
    videoCodec: video?.codec_name ?? null,
    audioCodec: audio?.codec_name ?? null,
  };
};

function result(name: string, status: CheckStatus, detail: string): CheckResult {
  return { name, status, detail };
}

function guard(name: string, run: () => CheckResult): CheckResult {
  try {
    return run();
  } catch (error: unknown) {
    return result(name, "fail", error instanceof Error ? error.message : String(error));
  }
}

export interface PrePublishOptions {
  readonly approvedDir?: string;
  /** publish'in kaynak videoyu aradığı dizin (varsayılan: scripts/stt/input); dosya adı = artifact media.localFileName. */
  readonly mediaSourceDir?: string;
  /** Yerel mod hedef dizini (public/media). */
  readonly mediaDir: string;
  /** Yayın modu: r2 (varsayılan, R2'ye yükle) | local (dev: public/media kopyası). */
  readonly mode?: "r2" | "local";
  readonly env?: NodeJS.ProcessEnv;
  readonly probe?: MediaProber;
}

export function runPrePublishChecks(contentId: string, options: PrePublishOptions): PrePublishReport {
  const checks: CheckResult[] = [];
  const probe = options.probe ?? ffprobeMedia;

  let artifact = null as ApprovedArtifact | null;
  checks.push(
    guard("approved artifact + runtime schema", () => {
      artifact = loadApprovedArtifact(contentId, options.approvedDir ?? APPROVED_DIR);
      return result("approved artifact + runtime schema", "pass", `${contentId}.json Zod şemasından ve segment referans kontrolünden geçti (approvedAt ${artifact.approval.approvedAt}).`);
    }),
  );
  const loaded = artifact as ApprovedArtifact | null;
  if (!loaded) {
    return { contentId, checks, notVerifiable: NOT_VERIFIABLE_WITHOUT_DB, ok: false };
  }
  const draft = loaded.draft;

  let issueCodes: string[] = [];
  checks.push(
    guard("quality (taze) + acknowledgement kapsaması", () => {
      const quality = assertApprovedQuality(loaded);
      issueCodes = quality.issues.map((issue) => issue.code);
      return result(
        "quality (taze) + acknowledgement kapsaması",
        quality.status === "pass" ? "pass" : "warn",
        quality.status === "pass" ? "pass" : `needsReview — tümü artifact'te acknowledge edilmiş: ${[...new Set(issueCodes)].join(", ")} (gerekçe: ${loaded.approval.note ?? "-"})`,
      );
    }),
  );

  checks.push(
    guard("ordinal ve [startMs,endMs) bütünlüğü", () => {
      const problems: string[] = [];
      draft.segments.forEach((segment, index) => {
        if (segment.ordinal !== index + 1) {
          problems.push(`segment #${index + 1} ordinal=${segment.ordinal} (1..n ardışık olmalı)`);
        }
        if (!(segment.startMs < segment.endMs)) {
          problems.push(`segment ${segment.ordinal}: startMs(${segment.startMs}) < endMs(${segment.endMs}) değil`);
        }
        const previous = draft.segments[index - 1];
        if (previous && segment.startMs < previous.endMs) {
          problems.push(`segment ${segment.ordinal} önceki segmentin bitişinden (${previous.endMs}ms) önce başlıyor`);
        }
      });
      return problems.length === 0
        ? result("ordinal ve [startMs,endMs) bütünlüğü", "pass", `${draft.segments.length} segment ardışık, sıralı, örtüşmesiz (yarı-açık aralık: bitişik segmentler serbest).`)
        : result("ordinal ve [startMs,endMs) bütünlüğü", "fail", problems.join("; "));
    }),
  );

  checks.push(
    guard("quiz ve learning point segment referansları", () => {
      const ordinals = new Set(draft.segments.map((segment) => segment.ordinal));
      const problems: string[] = [];
      if (!ordinals.has(draft.quiz.segmentOrdinal)) {
        problems.push(`quiz segmentOrdinal=${draft.quiz.segmentOrdinal} yok`);
      }
      for (const learningPoint of draft.learningPoints) {
        if (!ordinals.has(learningPoint.segmentOrdinal)) {
          problems.push(`learning point "${learningPoint.expression}" segmentOrdinal=${learningPoint.segmentOrdinal} yok`);
        }
      }
      return problems.length === 0
        ? result("quiz ve learning point segment referansları", "pass", `quiz → segment ${draft.quiz.segmentOrdinal}; ${draft.learningPoints.length} learning point referansı geçerli.`)
        : result("quiz ve learning point segment referansları", "fail", problems.join("; "));
    }),
  );

  checks.push(
    guard("learning point / vocabulary yüzey eşleşmeleri", () => {
      const surface = issueCodes.filter((code) => code === "learningPointExpressionNotInTranscript" || code === "vocabularyLemmaNotInTranscript" || code === "malformedHyphenSpacing");
      return surface.length === 0
        ? result("learning point / vocabulary yüzey eşleşmeleri", "pass", "Tüm ifadeler transcript'te yüzey biçimi olarak bulundu (anlamsal doğrulama değil), bozuk tire yazımı yok.")
        : result("learning point / vocabulary yüzey eşleşmeleri", "warn", `yüzey uyarıları: ${[...new Set(surface)].join(", ")}`);
    }),
  );

  // publish ile AYNI çözüm: <mediaSourceDir>/<media.localFileName> (contentId/muxAssetId'den türetme yok).
  const mode = options.mode ?? "r2";
  const sourceFile = resolveApprovedMediaSource(loaded, options.mediaSourceDir ?? MEDIA_SOURCE_DIR);
  let mediaProbe = null as MediaProbe | null;
  checks.push(
    guard("media varlığı/formatı", () => {
      if (draft.storageKey) {
        return result("media varlığı/formatı", "warn", `R2-backed (storageKey=${draft.storageKey}); yerel dosya yok, format R2'de doğrulanamaz.`);
      }
      if (!fs.existsSync(sourceFile)) {
        return result("media varlığı/formatı", "fail", `Kaynak video yok: ${sourceFile}`);
      }
      if (!sourceFile.toLowerCase().endsWith(".mp4")) {
        return result("media varlığı/formatı", "fail", `Yayın yalnızca .mp4 kabul eder: ${loaded.media.localFileName}`);
      }
      mediaProbe = probe(sourceFile);
      const problems: string[] = [];
      if (mediaProbe.videoCodec !== "h264") problems.push(`video codec=${mediaProbe.videoCodec ?? "yok"} (h264 bekleniyor)`);
      if (mediaProbe.audioCodec !== "aac") problems.push(`audio codec=${mediaProbe.audioCodec ?? "yok"} (aac bekleniyor)`);
      if (Math.abs(mediaProbe.durationMs - draft.durationMs) > DURATION_TOLERANCE_MS) {
        problems.push(`süre ${mediaProbe.durationMs}ms ≠ draft.durationMs ${draft.durationMs}ms (±${DURATION_TOLERANCE_MS})`);
      }
      const dims = `${mediaProbe.width ?? "?"}x${mediaProbe.height ?? "?"}`;
      const isNineSixteen = mediaProbe.width !== null && mediaProbe.height !== null && Math.abs(mediaProbe.width / mediaProbe.height - NINE_SIXTEEN) <= ASPECT_TOLERANCE;
      if (problems.length > 0) {
        return result("media varlığı/formatı", "fail", problems.join("; "));
      }
      return result("media varlığı/formatı", isNineSixteen ? "pass" : "warn", `${dims} h264/aac ${mediaProbe.durationMs}ms${isNineSixteen ? "" : " — 9:16 DEĞİL"}`);
    }),
  );

  checks.push(
    guard("segmentler video süresi içinde", () => {
      const lastEnd = draft.segments.reduce((max, segment) => Math.max(max, segment.endMs), 0);
      const limit = (mediaProbe?.durationMs ?? draft.durationMs) + DURATION_TOLERANCE_MS;
      return lastEnd <= draft.durationMs && lastEnd <= limit
        ? result("segmentler video süresi içinde", "pass", `son segment ${lastEnd}ms ≤ video ${mediaProbe?.durationMs ?? draft.durationMs}ms`)
        : result("segmentler video süresi içinde", "fail", `son segment ${lastEnd}ms video süresini aşıyor (draft ${draft.durationMs}ms, medya ${mediaProbe?.durationMs ?? "bilinmiyor"}ms)`);
    }),
  );

  if (mode === "local") {
    checks.push(
      guard("yerel hedef dosya çakışması", () => {
        if (draft.storageKey) {
          return result("yerel hedef dosya çakışması", "pass", "R2-backed: yerel kopya yok.");
        }
        const destination = path.join(options.mediaDir, `${draft.muxAssetId.slice("local-".length)}.mp4`);
        return fs.existsSync(destination)
          ? result("yerel hedef dosya çakışması", "fail", `${destination} zaten var — publish üzerine yazmaz`)
          : result("yerel hedef dosya çakışması", "pass", `${destination} boş (playback URL'i muxAssetId'den türer — API sözleşmesi)`);
      }),
    );
  } else if (!draft.storageKey) {
    checks.push(
      guard("R2 yapılandırma değişkenleri", () => {
        const env = options.env ?? process.env;
        const missing = ["R2_ACCOUNT_ID", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY", "R2_BUCKET_NAME", "R2_PUBLIC_BASE_URL"].filter((key) => !env[key]);
        return missing.length === 0
          ? result("R2 yapılandırma değişkenleri", "pass", "Tüm R2_* değişkenleri tanımlı (erişim/izin bu check ile DOĞRULANMAZ).")
          : result("R2 yapılandırma değişkenleri", "warn", `Eksik: ${missing.join(", ")} — publish bu ortamda R2 yüklemesi yapamaz.`);
      }),
    );
  }

  return { contentId, checks, notVerifiable: NOT_VERIFIABLE_WITHOUT_DB, ok: checks.every((check) => check.status !== "fail") };
}

export function formatPrePublishReport(report: PrePublishReport): string {
  const icon: Record<CheckStatus, string> = { pass: "OK  ", warn: "WARN", fail: "FAIL" };
  const lines = [`PRE-PUBLISH CHECK: ${report.contentId} → ${report.ok ? "GEÇTİ" : "BAŞARISIZ"} (DB/R2 değişmedi)`];
  for (const check of report.checks) {
    lines.push(`  [${icon[check.status]}] ${check.name}: ${check.detail}`);
  }
  lines.push("  DB/R2 olmadan DOĞRULANAMAYAN maddeler (bu check bunlar için kanıt değildir):");
  for (const item of report.notVerifiable) {
    lines.push(`    - ${item}`);
  }
  return lines.join("\n");
}
