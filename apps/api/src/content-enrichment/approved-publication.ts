import {
  APPROVED_DIR,
  MEDIA_SOURCE_DIR,
  assertApprovedQuality,
  loadApprovedArtifact,
  resolveApprovedMediaSource,
  type ApprovedArtifact,
} from "./approved-artifact";
import type { QualityReport } from "./content-quality.schema";
import type { PublishDraft } from "./publish-draft.schema";

/**
 * Publish yollarının (CLI + HTTP) ORTAK uygulama-katmanı sınırı. Hiçbir publish yolu
 * `output/<id>/enriched.json` okuyamaz: kaynak çözümü yalnızca burada, yalnızca `approved/<id>.json`'dan
 * yapılır. Çağıran (controller, CLI) dosya yolu ya da artifact türü SEÇMEZ — sadece contentId verir.
 *
 * Bu modül DB/R2/ağa dokunmaz (saf dosya sistemi + Zod + quality gate): hem --check hem publish aynı
 * çözümü kullanır, böylece "check geçti ama publish başka dosyaya baktı" durumu yapısal olarak yoktur.
 */
export interface ApprovedPublication {
  readonly artifact: ApprovedArtifact;
  /** Publish edilecek draft (artifact.draft; sourceFile = media.localFileName). */
  readonly draft: PublishDraft;
  /** Taze hesaplanan quality (artifact'teki acknowledgement'a karşı doğrulanmış). */
  readonly quality: QualityReport;
  /** `<mediaSourceDir>/<media.localFileName>` — R2-backed (storageKey dolu) içerikte dosya gerekmez ama yol yine çözülür. */
  readonly mediaSource: string;
}

export interface ApprovedPublicationOptions {
  readonly approvedDir?: string;
  readonly mediaSourceDir?: string;
}

export function resolveApprovedPublication(contentId: string, options: ApprovedPublicationOptions = {}): ApprovedPublication {
  const artifact = loadApprovedArtifact(contentId, options.approvedDir ?? APPROVED_DIR);
  const quality = assertApprovedQuality(artifact);
  return {
    artifact,
    draft: artifact.draft,
    quality,
    mediaSource: resolveApprovedMediaSource(artifact, options.mediaSourceDir ?? MEDIA_SOURCE_DIR),
  };
}

/** `--from-output` production guard'ı reddedildiğinde fırlatılır. */
export class UnapprovedPublishForbiddenError extends Error {}

export const ALLOW_UNAPPROVED_ENV = "ALLOW_UNAPPROVED_CONTENT_PUBLISH";

/**
 * `--from-output` (approved olmayan AI çıktısını yayımlama) production'da KESİN hata verir; yalnızca açık
 * `ALLOW_UNAPPROVED_CONTENT_PUBLISH=true` (tam olarak "true") ile açılır. Bu kaçış yolu HTTP'de sunulmaz:
 * HTTP publish bu fonksiyonu hiç çağırmaz ve output'a hiç erişmez.
 */
export function assertFromOutputAllowed(env: NodeJS.ProcessEnv = process.env): void {
  if (env.NODE_ENV === "production" && env[ALLOW_UNAPPROVED_ENV] !== "true") {
    throw new UnapprovedPublishForbiddenError(
      `NODE_ENV=production ortamında --from-output (approved olmayan içerik) yasak. Önce promote-content ile approved artifact üretin; ` +
        `yalnızca bilinçli bir acil durumda ${ALLOW_UNAPPROVED_ENV}=true verin.`,
    );
  }
}
