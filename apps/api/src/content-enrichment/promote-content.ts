import { ApprovalQualityError, ApprovedArtifactError, mapDraftMedia, promoteDraftToApproved } from "./approved-artifact";
import { loadPublishDraft, PublishPipelineError } from "./publish-content";

/**
 * output/<id>/enriched.json → approved/<id>.json terfi CLI'ı. DB'ye/R2'ye dokunmaz, tek içerik alır
 * (toplu mod ve global bypass yok). Kullanım:
 *   node dist/content-enrichment/promote-content.js --content-id <id> [--acknowledge-needs-review --note "<gerekçe>"] [--overwrite] [--media-file <dosya.mp4>]
 */
export function parsePromoteArgs(argv: readonly string[]): {
  contentId: string;
  acknowledgeNeedsReview: boolean;
  note: string | null;
  overwrite: boolean;
  mediaFile: string | null;
} {
  let contentId: string | undefined;
  let acknowledgeNeedsReview = false;
  let note: string | null = null;
  let overwrite = false;
  let mediaFile: string | null = null;
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--content-id") {
      contentId = argv[++i];
    } else if (arg === "--acknowledge-needs-review") {
      acknowledgeNeedsReview = true;
    } else if (arg === "--note") {
      const value = argv[++i];
      if (!value || value.startsWith("--")) {
        throw new PublishPipelineError('--note bir gerekçe metni gerektirir (örn. --note "false positive: çekim farkı").');
      }
      note = value;
    } else if (arg === "--overwrite") {
      overwrite = true;
    } else if (arg === "--media-file") {
      const value = argv[++i];
      if (!value || value.startsWith("--")) {
        throw new PublishPipelineError("--media-file bir dosya adı (basename) gerektirir, örn. --media-file clip.mp4.");
      }
      mediaFile = value;
    } else {
      throw new PublishPipelineError(
        `Bilinmeyen argüman: "${arg}". Kullanım: --content-id <id> [--acknowledge-needs-review --note "<gerekçe>"] [--overwrite] [--media-file <dosya.mp4>]`,
      );
    }
  }
  if (!contentId) {
    throw new PublishPipelineError("--content-id zorunlu.");
  }
  return { contentId, acknowledgeNeedsReview, note, overwrite, mediaFile };
}

export function main(argv: readonly string[]): void {
  const options = parsePromoteArgs(argv);
  const draft = loadPublishDraft(options.contentId);
  // Medya dosyası AÇIKÇA eşlenir (draft.sourceFile basename'i ya da --media-file); contentId'den türetilmez, dosya yeniden adlandırılmaz.
  const media = mapDraftMedia(draft, { override: options.mediaFile });
  const { filePath, artifact } = promoteDraftToApproved(draft, { ...options, media });
  console.error(
    `Approved artifact yazıldı: ${filePath} (quality=${artifact.approval.qualityStatusAtApproval}` +
      `${artifact.approval.acknowledgedIssueCodes.length > 0 ? `, acknowledged: ${artifact.approval.acknowledgedIssueCodes.join(",")}` : ""}). DB/R2 değişmedi.`,
  );
}

if (require.main === module) {
  try {
    main(process.argv.slice(2));
  } catch (error: unknown) {
    if (error instanceof PublishPipelineError || error instanceof ApprovedArtifactError || error instanceof ApprovalQualityError) {
      console.error(`\nHATA: ${error.message}`);
    } else {
      console.error("\nBEKLENMEYEN HATA:");
      console.error(error);
    }
    process.exit(1);
  }
}
