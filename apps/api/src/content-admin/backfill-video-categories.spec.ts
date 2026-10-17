import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import type { ContentCategory } from "@linguascroll/shared-types";
import { buildPublishDraft } from "../content-enrichment/enrich-transcript";
import type { EnrichmentOutput } from "../content-enrichment/enrichment-output.schema";
import { CategoryBackfillError, collectCategoryAssignments, parseArgs } from "./backfill-video-categories";

const draftSegments = [{ ordinal: 1, startMs: 0, endMs: 1000, text: "Hi, welcome." }];
function enrichment(contentSlug: string): EnrichmentOutput {
  return {
    contentSlug,
    topic: "humor",
    cefrLevel: "B2",
    segments: [{ ordinal: 1, englishExplanation: "en", turkishExplanation: "tr" }],
    vocabulary: [{ lemma: "cute", gloss: "sevimli" }],
    learningPoints: [],
    quiz: {
      segmentOrdinal: 1,
      question: "q?",
      options: [
        { text: "a", isCorrect: true },
        { text: "b", isCorrect: false },
        { text: "c", isCorrect: false },
        { text: "d", isCorrect: false },
      ],
    },
  };
}

function writeEnriched(outputDir: string, dirName: string, slug: string, category?: ContentCategory): void {
  const draft = buildPublishDraft(dirName, `/tmp/${dirName}.mp4`, 1000, draftSegments, enrichment(slug), null, category);
  fs.mkdirSync(path.join(outputDir, dirName), { recursive: true });
  fs.writeFileSync(path.join(outputDir, dirName, "enriched.json"), JSON.stringify(draft));
}

describe("collectCategoryAssignments", () => {
  let outputDir: string;
  beforeEach(() => {
    outputDir = fs.mkdtempSync(path.join(os.tmpdir(), "category-backfill-"));
  });
  afterEach(() => fs.rmSync(outputDir, { recursive: true, force: true }));

  it("kaynak, klasör/dosya adı DEĞİL artifact'taki açık category alanıdır", () => {
    // "ielts-" önekli ama category yazılmamış → atanmaz. "plain-name" ama category:"ielts" → atanır.
    writeEnriched(outputDir, "ielts-looks-like-it", "no-category-written");
    writeEnriched(outputDir, "plain-name", "explicit-ielts", "ielts");
    expect(collectCategoryAssignments(outputDir)).toEqual([{ muxAssetId: "local-explicit-ielts", category: "ielts" }]);
  });

  it("açıkça general yazılmış draft atanmaz; enriched.json olmayan klasör ve dosyalar yok sayılır", () => {
    writeEnriched(outputDir, "explicit-general", "g", "general");
    fs.mkdirSync(path.join(outputDir, "empty-dir"));
    fs.writeFileSync(path.join(outputDir, "db_mux_ids_now.txt"), "x");
    expect(collectCategoryAssignments(outputDir)).toEqual([]);
  });

  it("şemayı sağlamayan bir enriched.json sessizce atlanmaz, backfill'i durdurur", () => {
    fs.mkdirSync(path.join(outputDir, "broken"));
    fs.writeFileSync(path.join(outputDir, "broken", "enriched.json"), JSON.stringify({ category: "ielts" }));
    expect(() => collectCategoryAssignments(outputDir)).toThrow(CategoryBackfillError);
  });
});

describe("parseArgs", () => {
  it("--check dry-run açar; argümansız çalışma gerçek günceller", () => {
    expect(parseArgs(["--check"])).toEqual({ dryRun: true });
    expect(parseArgs([])).toEqual({ dryRun: false });
  });
  it("bilinmeyen argümanda hata verir", () => {
    expect(() => parseArgs(["--force"])).toThrow(CategoryBackfillError);
  });
});
