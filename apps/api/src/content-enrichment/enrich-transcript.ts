import * as fs from "node:fs";
import * as path from "node:path";
import { enrichTranscript } from "./enrichment-llm-client";
import { evaluateContentQuality } from "./content-quality-gate";
import type { EnrichmentOutput, EnrichmentSegment } from "./enrichment-output.schema";
import { publishDraftSchema, type PublishDraft } from "./publish-draft.schema";
import { sttDraftSchema, type SttDraftSegment } from "./stt-draft.schema";
import { assertValidSegmentReferences, SegmentReferenceError } from "./validate-segment-references";

/**
 * Chunk 12 — draft.json (STT, değişmedi) → enriched.json (bu chunk'ın
 * reviewable artifact'ı, madde 12). DB'ye HİÇ dokunmuyor — `publish-content.ts`
 * ayrı bir adım (madde 12'nin review boundary'si burada).
 */

// __dirname derlenmiş haliyle apps/api/dist/content-enrichment — API_ROOT iki
// seviye yukarısı (apps/api). Çıktı, dist/ değil SRC ağacına yazılıyor (STT'nin
// scripts/stt/output/ konvansiyonuyla aynı: derlemeler arası kalıcı, git-diff'lenebilir).
const API_ROOT = path.resolve(__dirname, "..", "..");
const STT_OUTPUT_DIR = path.join(API_ROOT, "scripts", "stt", "output");
export const ENRICHMENT_OUTPUT_DIR = path.join(API_ROOT, "src", "content-enrichment", "output");

export class EnrichmentPipelineError extends Error {}

export function parseArgs(argv: readonly string[]): { contentId: string } {
  let contentId: string | undefined;
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--content-id") {
      contentId = argv[++i];
    } else {
      throw new EnrichmentPipelineError(`Bilinmeyen argüman: "${argv[i]}". Kullanım: --content-id <id>`);
    }
  }
  if (!contentId) {
    throw new EnrichmentPipelineError(
      "--content-id zorunlu (örn. --content-id a1final1) — scripts/stt/output/ altındaki bir content-id.",
    );
  }
  return { contentId };
}

export function resolveDraftPath(contentId: string): string {
  return path.join(STT_OUTPUT_DIR, contentId, "draft.json");
}

export function resolveEnrichedOutputPath(contentId: string): string {
  return path.join(ENRICHMENT_OUTPUT_DIR, contentId, "enriched.json");
}

/**
 * Madde 2/14 — `languageStatus !== "ready"` bir draft otomatik enrichment'a
 * hiç girmiyor. Draft SİLİNMİYOR/reddedilmiyor — sadece bu adım açık bir
 * mesajla dur diyor, insan review'ı (STT README'sindeki mevcut anlamıyla)
 * bekleniyor.
 */
export function assertReadyForEnrichment(languageStatus: string, contentId: string): void {
  if (languageStatus !== "ready") {
    throw new EnrichmentPipelineError(
      `"${contentId}" içeriği enrichment için hazır değil (languageStatus: "${languageStatus}"). ` +
        "Otomatik enrichment sadece \"ready\" durumundaki draft'lar için çalışır — bu içerik insan review'ı gerektiriyor.",
    );
  }
}

/**
 * `assertValidSegmentReferences` zaten ordinal kümesinin BİREBİR eşleştiğini
 * garanti ettiği için (bkz. validate-segment-references.ts) burada her draft
 * segment'i için bir eşleşme bulunacağı KANITLANMIŞ durumda — yine de sessiz
 * bir non-null assertion yerine açık bir throw ile defense-in-depth.
 */
export function mergeSegments(
  draftSegments: readonly SttDraftSegment[],
  enrichedSegments: readonly EnrichmentSegment[],
): PublishDraft["segments"] {
  const enrichedByOrdinal = new Map(enrichedSegments.map((segment) => [segment.ordinal, segment]));
  return draftSegments.map((draft) => {
    const enriched = enrichedByOrdinal.get(draft.ordinal);
    if (!enriched) {
      throw new SegmentReferenceError(`Segment ordinal ${draft.ordinal} için enrichment bulunamadı.`);
    }
    return {
      ordinal: draft.ordinal,
      startMs: draft.startMs,
      endMs: draft.endMs,
      text: draft.text,
      englishExplanation: enriched.englishExplanation,
      turkishExplanation: enriched.turkishExplanation,
    };
  });
}

/**
 * Chunk 13 — Quality Gate BURADA, `publishDraftSchema.parse`'tan HEMEN ÖNCE
 * çalışıyor: (1) reviewer `enriched.json`'ı açtığında `quality` alanını GÖRÜYOR
 * (madde 2), (2) `evaluateContentQuality`'e giden obje `quality` alanı OLMADAN
 * inşa ediliyor (`contentWithoutQuality`) — fonksiyonun kendi ürettiği sonucu
 * girdi olarak okuması tip seviyesinde imkansız (kullanıcı kararı, bkz.
 * content-quality-gate.ts'in dosya başı yorumu).
 */
export function buildPublishDraft(
  contentId: string,
  sourceFile: string,
  durationMs: number,
  draftSegments: readonly SttDraftSegment[],
  enrichmentOutput: EnrichmentOutput,
): PublishDraft {
  const contentWithoutQuality = {
    contentId,
    muxAssetId: `local-${enrichmentOutput.contentSlug}`,
    sourceFile,
    durationMs,
    topic: enrichmentOutput.topic,
    cefrLevel: enrichmentOutput.cefrLevel,
    segments: mergeSegments(draftSegments, enrichmentOutput.segments),
    vocabulary: enrichmentOutput.vocabulary,
    learningPoints: enrichmentOutput.learningPoints,
    quiz: enrichmentOutput.quiz,
  };
  const quality = evaluateContentQuality(contentWithoutQuality);
  return publishDraftSchema.parse({ ...contentWithoutQuality, quality });
}

/** STT pipeline'ın `atomicWriteFile`'ıyla AYNI desen (tmp + rename) — küçük, bilinçli bir tekrar (bkz. stt-draft.schema.ts yorumu, farklı build root). */
function atomicWriteFile(finalPath: string, content: string): void {
  const tmpPath = `${finalPath}.tmp`;
  fs.mkdirSync(path.dirname(finalPath), { recursive: true });
  fs.writeFileSync(tmpPath, content, "utf-8");
  fs.renameSync(tmpPath, finalPath);
}

async function main(): Promise<void> {
  const { contentId } = parseArgs(process.argv.slice(2));

  const draftPath = resolveDraftPath(contentId);
  if (!fs.existsSync(draftPath)) {
    throw new EnrichmentPipelineError(`Draft bulunamadı: "${draftPath}" — önce STT pipeline'ını çalıştırın (pnpm stt:process).`);
  }

  const outputPath = resolveEnrichedOutputPath(contentId);
  if (fs.existsSync(outputPath)) {
    throw new EnrichmentPipelineError(
      `"${outputPath}" zaten var — üzerine YAZILMIYOR. Farklı bir content-id kullanın veya mevcut dosyayı elle kaldırıp tekrar çalıştırın.`,
    );
  }

  const rawDraft: unknown = JSON.parse(fs.readFileSync(draftPath, "utf-8"));
  const draftParseResult = sttDraftSchema.safeParse(rawDraft);
  if (!draftParseResult.success) {
    throw new EnrichmentPipelineError(
      `"${draftPath}" beklenen draft.json şeklinde değil:\n${draftParseResult.error.issues.map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`).join("\n")}`,
    );
  }
  const draft = draftParseResult.data;

  assertReadyForEnrichment(draft.languageStatus, contentId);

  console.error(`"${contentId}" için enrichment başlatılıyor (${draft.segments.length} segment)...`);
  const enrichmentOutput = await enrichTranscript(draft.segments);

  assertValidSegmentReferences(enrichmentOutput, draft.segments);

  const publishDraft = buildPublishDraft(contentId, draft.sourceFile, draft.durationMs, draft.segments, enrichmentOutput);

  atomicWriteFile(outputPath, JSON.stringify(publishDraft, null, 2));

  console.error(`Enrichment tamamlandı: ${outputPath}`);
  console.error(`  topic: ${publishDraft.topic}, cefrLevel: ${publishDraft.cefrLevel}, muxAssetId: ${publishDraft.muxAssetId}`);
  console.error(
    `  vocabulary: ${publishDraft.vocabulary.length}, learningPoints: ${publishDraft.learningPoints.length}, quiz: 1`,
  );
  console.error(`  quality: ${publishDraft.quality.status}${publishDraft.quality.issues.length > 0 ? ` (${publishDraft.quality.issues.length} issue)` : ""}`);
  console.error("Publish etmeden önce dosyayı review edin (gerekirse elle düzeltin), sonra: pnpm publish-content --content-id " + contentId);
}

if (require.main === module) {
  main().catch((error: unknown) => {
    if (error instanceof EnrichmentPipelineError || error instanceof SegmentReferenceError) {
      console.error(`\nHATA: ${error.message}`);
    } else {
      console.error("\nBEKLENMEYEN HATA:");
      console.error(error);
    }
    process.exit(1);
  });
}
