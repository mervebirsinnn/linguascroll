import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { loadAnimationCatalog } from "./animation-catalog";
import { evaluateContentQuality } from "../content-enrichment/content-quality-gate";
import { publishDraftSchema } from "../content-enrichment/publish-draft.schema";

describe("Curated animation catalog", () => {
  it("on dört gerçek sahne (Sintel + Cosmos Laundromat + Sprite Fright), 61 altyazı ve yayınlanabilir kaynaklı içerik içerir", () => {
    const catalog = loadAnimationCatalog();
    expect(catalog).toHaveLength(14);
    expect(catalog.flatMap(entry => entry.draft.segments)).toHaveLength(61);
    for (const { draft } of catalog) {
      expect(evaluateContentQuality(draft).status).not.toBe("reject");
      // Üç farklı film, farklı (hepsi attribution zorunluluğunu karşılayan) lisanslar taşıyor.
      expect(["CC BY 3.0", "CC BY-SA 3.0", "CC BY 1.0"]).toContain(draft.attribution?.license);
    }
  });
  it("kaynak/lisans bilgisi silinen animasyon yayın taslağını reddeder", () => {
    const draft = { ...loadAnimationCatalog()[0]!.draft, attribution: null };
    expect(publishDraftSchema.safeParse(draft).success).toBe(false);
  });
  it("insan düzenlemesiyle video sınırının dışına taşan altyazıyı reddeder", () => {
    const catalog = loadAnimationCatalog();
    catalog[0]!.draft.segments[0]!.endMs = catalog[0]!.draft.durationMs + 1;
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "animation-catalog-"));
    try {
      const file = path.join(dir, "catalog.json");
      fs.writeFileSync(file, JSON.stringify(catalog));
      expect(() => loadAnimationCatalog([file])).toThrow();
    } finally { fs.rmSync(dir, { recursive: true, force: true }); }
  });
});
