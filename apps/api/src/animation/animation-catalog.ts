import * as fs from "node:fs";
import * as path from "node:path";
import { z } from "zod";
import { publishDraftSchema } from "../content-enrichment/publish-draft.schema";
import { assertValidSegmentReferences } from "../content-enrichment/validate-segment-references";

export const SINTEL_CATALOG_PATH = path.resolve(__dirname, "../../content/animation/sintel.json");
// Cosmos Laundromat: First Cycle — CC BY-SA 3.0, bkz. content/animation/README.md'deki
// "Cosmos Laundromat" bölümü. Sintel'den ayrı bir film/lisans olduğu için ayrı dosya;
// loadAnimationCatalog ikisini TEK bir listeye birleştirip aynı invariant'larla (benzersiz
// muxAssetId, zorunlu attribution, segment/süre tutarlılığı) doğruluyor.
export const COSMOS_LAUNDROMAT_CATALOG_PATH = path.resolve(__dirname, "../../content/animation/cosmos-laundromat.json");
// Sprite Fright — Blender Studio (CC BY), Cosmos ile AYNI STT + enrichment yolundan geçti;
// lisans/atıf bilgisi kataloğun içindeki draft.attribution'da, bkz. README "Sprite Fright".
export const SPRITE_FRIGHT_CATALOG_PATH = path.resolve(__dirname, "../../content/animation/sprite-fright.json");
const DEFAULT_CATALOG_PATHS: readonly string[] = [SINTEL_CATALOG_PATH, COSMOS_LAUNDROMAT_CATALOG_PATH, SPRITE_FRIGHT_CATALOG_PATH];
const catalogSchema = z.array(z.object({
  sourceStartMs: z.number().int().nonnegative(),
  title: z.string().min(1),
  draft: publishDraftSchema,
})).min(1);

export function loadAnimationCatalog(catalogPaths: readonly string[] = DEFAULT_CATALOG_PATHS) {
  const catalog = catalogPaths.flatMap((catalogPath) => {
    const raw: unknown = JSON.parse(fs.readFileSync(catalogPath, "utf8"));
    return catalogSchema.parse(raw);
  });
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
