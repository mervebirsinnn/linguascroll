import * as fs from "node:fs";
import * as path from "node:path";
import { z } from "zod";
import { publishDraftSchema } from "../content-enrichment/publish-draft.schema";
import { assertValidSegmentReferences } from "../content-enrichment/validate-segment-references";

export const ANIMATION_CATALOG_PATH = path.resolve(__dirname, "../../content/animation/sintel.json");
const catalogSchema = z.array(z.object({
  sourceStartMs: z.number().int().nonnegative(),
  title: z.string().min(1),
  draft: publishDraftSchema,
})).min(1);

export function loadAnimationCatalog(catalogPath = ANIMATION_CATALOG_PATH) {
  const raw: unknown = JSON.parse(fs.readFileSync(catalogPath, "utf8"));
  const catalog = catalogSchema.parse(raw);
  const identities = new Set<string>();
  for (const { draft } of catalog) {
    if (draft.category !== "animation" || !draft.attribution) throw new Error("Animasyon kategorisi ve kaynak bilgisi zorunlu.");
    if (identities.has(draft.muxAssetId)) throw new Error("Animasyon kataloğunda aynı içerik iki kez var.");
    identities.add(draft.muxAssetId);
    if (draft.contentId !== draft.muxAssetId.slice("local-".length) || draft.sourceFile !== `${draft.contentId}.mp4`) {
      throw new Error("Animasyon içerik kimliği ile medya dosyası eşleşmiyor.");
    }
    assertValidSegmentReferences(draft, draft.segments);
    let previousEnd = 0;
    for (const segment of draft.segments) {
      if (segment.startMs < previousEnd || segment.endMs > draft.durationMs) throw new Error("Altyazı zamanı videonun sınırlarıyla uyuşmuyor.");
      previousEnd = segment.endMs;
    }
  }
  return catalog;
}
