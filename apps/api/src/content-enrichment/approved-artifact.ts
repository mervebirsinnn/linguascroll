import * as fs from "node:fs";
import * as path from "node:path";
import { z } from "zod";
import { evaluateContentQuality } from "./content-quality-gate";
import { qualityIssueCodeSchema, qualityStatusSchema, type QualityIssueCode, type QualityReport } from "./content-quality.schema";
import { publishDraftSchema, type PublishDraft } from "./publish-draft.schema";
import { assertValidSegmentReferences } from "./validate-segment-references";

/**
 * Approved artifact sınırı. `output/<id>/enriched.json` AI çıktısıdır (Gemini + STT, gerektiğinde elle
 * düzeltilmiş) ve production source-of-truth DEĞİLDİR; publish yalnızca `approved/<id>.json`'u kabul
 * eder. Bu dosya, `promote-content.ts` ile output'tan AÇIKÇA terfi ettirilen (promotion anında quality
 * gate yeniden çalışmış, needsReview ise içerik bazında gerekçeli acknowledgement verilmiş) ve Git'e
 * girebilen, runtime'da Zod ile doğrulanan, tek parça bir kayıttır. CMS/servis yok: sadece bir dizin
 * ve bir şema.
 *
 * Veri akışı: scripts/stt/output → enrich-transcript → output/<id>/enriched.json (AI, review edilir)
 *   → promote-content (quality gate + ack + overwrite koruması) → approved/<id>.json (Git)
 *   → publish-content (şema + quality gate TEKRAR + acknowledgement kapsaması) → DB / R2.
 */
export class ApprovedArtifactError extends Error {}
/** Approved artifact'in bugünkü quality sonucu terfi/publish için yeterli değil (reject ya da kapsanmamış needsReview). */
export class ApprovalQualityError extends Error {}

export const API_ROOT = path.resolve(__dirname, "..", "..");
export const APPROVED_DIR = path.join(API_ROOT, "src", "content-enrichment", "approved");
/** Publish'in kaynak videoyu aradığı TEK dizin (STT girdisi). Dosya adı artifact'teki `media.localFileName`'den gelir. */
export const MEDIA_SOURCE_DIR = path.join(API_ROOT, "scripts", "stt", "input");

export const ALLOWED_MEDIA_EXTENSIONS = [".mp4", ".mov", ".m4v", ".webm", ".mkv"] as const;

/**
 * Medya kimliği SINIRI: video dosya adı contentId/muxAssetId'den ÖRTÜK türetilmez; artifact'te açık ve zorunludur.
 * Yalnızca basename: "../", mutlak yol, "/" veya "\\" reddedilir; yalnızca izin verilen video uzantıları.
 */
export const mediaFileNameSchema = z
  .string()
  .min(1)
  .max(200)
  .refine((name) => !name.includes("/") && !name.includes("\\"), "Yalnızca dosya adı (basename) olmalı: '/' ve '\' yasak")
  .refine((name) => name !== "." && name !== ".." && !name.includes(".."), "'..' içeremez")
  .refine((name) => !path.isAbsolute(name) && !/^[A-Za-z]:/.test(name), "Mutlak yol olamaz")
  .refine((name) => /^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(name), "Yalnızca harf/rakam/._- içerebilir ve harf/rakamla başlamalı")
  .refine((name) => ALLOWED_MEDIA_EXTENSIONS.includes(path.extname(name).toLowerCase() as (typeof ALLOWED_MEDIA_EXTENSIONS)[number]), `İzin verilen uzantılar: ${ALLOWED_MEDIA_EXTENSIONS.join(", ")}`);

export const approvedMediaSchema = z.object({ localFileName: mediaFileNameSchema });
export type ApprovedMedia = z.infer<typeof approvedMediaSchema>;

export const approvalRecordSchema = z
  .object({
    approvedAt: z.string().datetime(),
    // Terfi anındaki sonuç: "reject" artifact oluşturulamaz.
    qualityStatusAtApproval: qualityStatusSchema.exclude(["reject"]),
    // İçerik bazında kabul edilen uyarı kodları. Boş = temiz geçti. Publish anındaki taze quality
    // sonucunun TÜM kodları bu listede olmalı; yeni bir uyarı çıkarsa publish durur.
    acknowledgedIssueCodes: z.array(qualityIssueCodeSchema),
    // needsReview ile terfi ettirildiğinde "neden kabul edildi" gerekçesi zorunlu.
    note: z.string().trim().min(1).nullable(),
  })
  .refine((record) => record.acknowledgedIssueCodes.length === 0 || record.note !== null, {
    message: "Acknowledge edilen uyarılar için gerekçe (note) zorunlu",
    path: ["note"],
  })
  .refine((record) => (record.qualityStatusAtApproval === "pass") === (record.acknowledgedIssueCodes.length === 0), {
    message: "qualityStatusAtApproval ile acknowledgedIssueCodes tutarsız",
    path: ["acknowledgedIssueCodes"],
  });
export type ApprovalRecord = z.infer<typeof approvalRecordSchema>;

export const approvedArtifactSchema = z
  .object({
    // v2: `media.localFileName` zorunlu (v1'de yoktu; v1 artifact'ler bilerek reddedilir).
    schemaVersion: z.literal(2),
    approval: approvalRecordSchema,
    media: approvedMediaSchema,
    draft: publishDraftSchema,
  })
  .refine((artifact) => artifact.draft.sourceFile === artifact.media.localFileName, {
    message: "draft.sourceFile, media.localFileName ile aynı (basename) olmalı — makineye bağlı yol artifact'e yazılmaz",
    path: ["draft", "sourceFile"],
  });
export type ApprovedArtifact = z.infer<typeof approvedArtifactSchema>;

const CONTENT_ID_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

function assertValidContentId(contentId: string): void {
  // approved/<contentId>.json: path traversal'ı ve beklenmeyen dosya adlarını erkenden reddet.
  if (!CONTENT_ID_PATTERN.test(contentId)) {
    throw new ApprovedArtifactError(`Geçersiz contentId: "${contentId}" (küçük harf/rakam/tire bekleniyor).`);
  }
}

export function resolveApprovedPath(contentId: string, approvedDir: string = APPROVED_DIR): string {
  assertValidContentId(contentId);
  return path.join(approvedDir, `${contentId}.json`);
}

/**
 * Output draft'ın medya dosyasını AÇIKÇA eşler: dosya adı, draft'ın kendi `sourceFile` alanının basename'idir
 * (contentId/muxAssetId'den türetilmez) ve `mediaSourceDir` içinde gerçekten var olmalıdır. Farklı bir ad
 * için `override` (CLI: --media-file) verilir. Dosyalar hiçbir zaman yeniden adlandırılmaz.
 */
export function mapDraftMedia(
  draft: Pick<PublishDraft, "sourceFile" | "contentId">,
  options: { override?: string | null; mediaSourceDir?: string; fileExists?: (file: string) => boolean } = {},
): ApprovedMedia {
  const mediaSourceDir = options.mediaSourceDir ?? MEDIA_SOURCE_DIR;
  const fileExists = options.fileExists ?? fs.existsSync;
  // win32 yollarını da çözmek için her iki ayraçla basename.
  const candidate = options.override ?? draft.sourceFile.split(/[\\/]/).pop() ?? "";
  const parsed = mediaFileNameSchema.safeParse(candidate);
  if (!parsed.success) {
    throw new ApprovedArtifactError(`Geçersiz medya dosya adı "${candidate}": ${parsed.error.issues.map((issue) => issue.message).join("; ")}. --media-file <dosya.mp4> ile açıkça belirtin.`);
  }
  if (!fileExists(path.join(mediaSourceDir, parsed.data))) {
    throw new ApprovedArtifactError(`Medya dosyası bulunamadı: ${path.join(mediaSourceDir, parsed.data)} (contentId "${draft.contentId}"). --media-file ile doğru dosya adını verin.`);
  }
  return { localFileName: parsed.data };
}

/** Publish ve pre-publish check'in AYNI kaynak-dosya çözümü: `<mediaSourceDir>/<media.localFileName>`. */
export function resolveApprovedMediaSource(artifact: Pick<ApprovedArtifact, "media">, mediaSourceDir: string = MEDIA_SOURCE_DIR): string {
  return path.join(mediaSourceDir, artifact.media.localFileName);
}

export function loadApprovedArtifact(contentId: string, approvedDir: string = APPROVED_DIR): ApprovedArtifact {
  const filePath = resolveApprovedPath(contentId, approvedDir);
  if (!fs.existsSync(filePath)) {
    throw new ApprovedArtifactError(
      `Approved artifact bulunamadı: "${filePath}". Önce "node dist/content-enrichment/promote-content.js --content-id ${contentId}" ile output'tan terfi ettirin.`,
    );
  }
  const raw: unknown = JSON.parse(fs.readFileSync(filePath, "utf-8"));
  const parsed = approvedArtifactSchema.safeParse(raw);
  if (!parsed.success) {
    throw new ApprovedArtifactError(
      `"${filePath}" beklenen şekilde değil:\n${parsed.error.issues.map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`).join("\n")}`,
    );
  }
  const artifact = parsed.data;
  if (artifact.draft.contentId !== contentId) {
    throw new ApprovedArtifactError(`"${filePath}" içindeki contentId ("${artifact.draft.contentId}") dosya adıyla ("${contentId}") uyuşmuyor.`);
  }
  assertValidSegmentReferences(artifact.draft, artifact.draft.segments);
  return artifact;
}

/**
 * Publish anındaki gate: diskteki `draft.quality`/`approval`'a körü körüne GÜVENMEZ — quality FRESH
 * hesaplanır. `reject` hiçbir koşulda geçmez; `needsReview` yalnızca artifact'in kendi içindeki,
 * içerik bazlı acknowledgement tüm güncel uyarı kodlarını kapsıyorsa geçer (global bir flag yok).
 */
export function assertApprovedQuality(artifact: ApprovedArtifact): QualityReport {
  const fresh = evaluateContentQuality(artifact.draft);
  if (fresh.status === "reject") {
    const list = fresh.issues.filter((issue) => issue.severity === "reject").map((issue) => `  - [${issue.code}] ${issue.message}`).join("\n");
    throw new ApprovalQualityError(`"${artifact.draft.contentId}" quality gate'ten "reject" ile döndü (override YOK):\n${list}`);
  }
  const unacknowledged = unacknowledgedCodes(fresh, artifact.approval);
  if (unacknowledged.length > 0) {
    throw new ApprovalQualityError(
      `"${artifact.draft.contentId}" için artifact'te acknowledge edilmemiş uyarı kodları var: ${unacknowledged.join(", ")}. ` +
        "İçeriği düzeltip yeniden promote edin (--overwrite) ya da gerekçeli acknowledgement ile yeniden terfi ettirin.",
    );
  }
  return fresh;
}

export function unacknowledgedCodes(report: QualityReport, approval: ApprovalRecord): QualityIssueCode[] {
  const acknowledged = new Set<QualityIssueCode>(approval.acknowledgedIssueCodes);
  return [...new Set(report.issues.map((issue) => issue.code))].filter((code) => !acknowledged.has(code));
}

export interface PromoteOptions {
  readonly contentId: string;
  readonly acknowledgeNeedsReview: boolean;
  readonly note: string | null;
  readonly overwrite: boolean;
  /** Açık medya eşlemesi (bkz. mapDraftMedia). Çağıran verir; contentId'den türetilmez. */
  readonly media: ApprovedMedia;
  readonly now?: Date;
  readonly approvedDir?: string;
}

/**
 * output draft'ı (çağıran, `loadPublishDraft` ile şema + segment referansından geçirip verir) approved
 * artifact'e terfi ettirir. Sırayla: quality gate TAZE çalışır → reject durur → needsReview ise bu içerik
 * için açık acknowledgement (+ gerekçe) şart → var olan dosya `overwrite` yoksa asla ezilmez → atomik yaz.
 */
export function promoteDraftToApproved(draft: PublishDraft, options: PromoteOptions): { filePath: string; artifact: ApprovedArtifact } {
  const approvedDir = options.approvedDir ?? APPROVED_DIR;
  const filePath = resolveApprovedPath(options.contentId, approvedDir);
  if (draft.contentId !== options.contentId) {
    throw new ApprovedArtifactError(`Draft contentId ("${draft.contentId}") ile istenen contentId ("${options.contentId}") uyuşmuyor.`);
  }

  const quality = evaluateContentQuality(draft);
  if (quality.status === "reject") {
    const list = quality.issues.filter((issue) => issue.severity === "reject").map((issue) => `  - [${issue.code}] ${issue.message}`).join("\n");
    throw new ApprovalQualityError(`"${options.contentId}" quality gate'ten "reject" ile döndü — terfi edilemez (override YOK):\n${list}`);
  }

  let acknowledgedIssueCodes: QualityIssueCode[] = [];
  let note: string | null = null;
  if (quality.status === "needsReview") {
    const list = quality.issues.map((issue) => `  - [${issue.code}] ${issue.message}`).join("\n");
    if (!options.acknowledgeNeedsReview) {
      throw new ApprovalQualityError(
        `"${options.contentId}" quality gate'ten "needsReview" ile döndü:\n${list}\n\n` +
          'Bu içerik için bilinçli kabul ediyorsanız --acknowledge-needs-review --note "<gerekçe>" ile tekrar çalıştırın (yalnızca bu content-id için geçerli).',
      );
    }
    if (!options.note || options.note.trim().length === 0) {
      throw new ApprovalQualityError(`"${options.contentId}" needsReview acknowledgement'ı için --note "<gerekçe>" zorunlu.`);
    }
    acknowledgedIssueCodes = [...new Set(quality.issues.map((issue) => issue.code))];
    note = options.note.trim();
  }

  if (fs.existsSync(filePath) && !options.overwrite) {
    throw new ApprovedArtifactError(`"${filePath}" zaten var — üzerine yazılmaz. Bilerek güncellemek için --overwrite verin.`);
  }

  const artifact = approvedArtifactSchema.parse({
    schemaVersion: 2,
    approval: {
      approvedAt: (options.now ?? new Date()).toISOString(),
      qualityStatusAtApproval: quality.status,
      acknowledgedIssueCodes,
      note,
    },
    media: options.media,
    draft: { ...draft, sourceFile: options.media.localFileName, quality },
  });

  fs.mkdirSync(approvedDir, { recursive: true });
  const tmpPath = `${filePath}.tmp`;
  try {
    fs.writeFileSync(tmpPath, `${JSON.stringify(artifact, null, 2)}\n`, "utf-8");
    fs.renameSync(tmpPath, filePath);
  } finally {
    if (fs.existsSync(tmpPath)) {
      fs.unlinkSync(tmpPath);
    }
  }
  return { filePath, artifact };
}
