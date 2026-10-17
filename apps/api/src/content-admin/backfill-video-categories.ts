import "dotenv/config";
import * as fs from "node:fs";
import * as path from "node:path";
import { contentCategorySchema, type ContentCategory } from "@linguascroll/shared-types";
import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import type { Database } from "../database/database.module";
import { ENRICHMENT_OUTPUT_DIR } from "../content-enrichment/enrich-transcript";
import { APPROVED_DIR } from "../content-enrichment/approved-artifact";
import { publishDraftSchema } from "../content-enrichment/publish-draft.schema";
import { videosTable } from "../videos/videos.schema";

/**
 * `category` alanı publish'ten SONRA tanımlanan bir bölüm (örn. "ielts") için,
 * kategori eklenmeden ÖNCE `general` olarak yayınlanmış videoları taşıyan,
 * tekrar çalıştırılabilir backfill (`backfill-r2-videos.ts` ve
 * `animation/backfill-background-colors.ts` ile AYNI "Nest DI dışında, kendi
 * Pool'unu açan CLI" deseni). `publish-content.ts` zaten var olan bir `muxAssetId`'yi
 * atladığı için komutu tekrar çalıştırmak mevcut satırı güncellemez — bu CLI o boşluğu kapatır.
 *
 * Kaynak, dosya adı/contentId öneki DEĞİL: yalnızca `enriched.json` içinde AÇIKÇA
 * yazılmış, `publishDraftSchema`'dan geçmiş `category` alanı (cefrLevel da asla
 * türetilmez ve bu CLI tarafından değiştirilmez). Sadece hâlâ `general` olan satırı
 * günceller: başka bir kategoriye elle/yayınla atanmış bir değerin üzerine sessizce yazmaz.
 */

export class CategoryBackfillError extends Error {}

export type CategoryAssignment = { muxAssetId: string; category: Exclude<ContentCategory, "general"> };

export interface CategoryBackfillResult extends CategoryAssignment {
  status: "updated" | "would-update" | "skipped-no-match-or-not-general";
}

/** `<outputDir>/<contentId>/enriched.json` içinde açık, `general` olmayan bir category taşıyan draft'lar. */
export function collectCategoryAssignments(outputDir: string = ENRICHMENT_OUTPUT_DIR): CategoryAssignment[] {
  const assignments: CategoryAssignment[] = [];
  if (!fs.existsSync(outputDir)) return assignments;
  for (const entry of fs.readdirSync(outputDir, { withFileTypes: true })) {
    const enrichedPath = path.join(outputDir, entry.name, "enriched.json");
    if (!entry.isDirectory() || !fs.existsSync(enrichedPath)) {
      continue;
    }
    const raw: unknown = JSON.parse(fs.readFileSync(enrichedPath, "utf-8"));
    const parsed = publishDraftSchema.safeParse(raw);
    if (!parsed.success) {
      throw new CategoryBackfillError(`"${enrichedPath}" publishDraftSchema'yı sağlamıyor — backfill durduruldu.`);
    }
    const { category, muxAssetId } = parsed.data;
    if (category && category !== "general") {
      assignments.push({ muxAssetId, category });
    }
  }
  return assignments;
}

/** Git'e giren, production'da da çalıştırılabilen kaynak: daha önce `general` yayımlanmış IELTS satırlarının listesi. */
export const CATEGORY_MANIFEST_PATH = path.resolve(__dirname, "../../content/ielts-category-manifest.json");

const manifestSchema = z.array(z.object({ muxAssetId: z.string().min(1), category: contentCategorySchema.exclude(["general"]) }));

export function loadCategoryManifest(manifestPath: string = CATEGORY_MANIFEST_PATH): CategoryAssignment[] {
  if (!fs.existsSync(manifestPath)) return [];
  return manifestSchema.parse(JSON.parse(fs.readFileSync(manifestPath, "utf-8")));
}

/** `approved/<id>.json` (git'te, şema doğrulamalı) içindeki açık, general olmayan category'ler. */
export function collectApprovedAssignments(approvedDir: string = APPROVED_DIR): CategoryAssignment[] {
  if (!fs.existsSync(approvedDir)) return [];
  const assignments: CategoryAssignment[] = [];
  for (const filename of fs.readdirSync(approvedDir).filter((name) => name.endsWith(".json")).sort()) {
    const raw: unknown = JSON.parse(fs.readFileSync(path.join(approvedDir, filename), "utf-8"));
    const parsed = z.object({ draft: publishDraftSchema }).safeParse(raw);
    if (!parsed.success) throw new CategoryBackfillError(`"${filename}" geçerli bir approved artifact değil — backfill durduruldu.`);
    const { category, muxAssetId } = parsed.data.draft;
    if (category && category !== "general") assignments.push({ muxAssetId, category });
  }
  return assignments;
}

/** Kaynakları birleştirir (manifest + approved + output); aynı muxAssetId için ÇELİŞEN kategori hata verir, sessizce seçilmez. */
export function mergeAssignments(...sources: ReadonlyArray<readonly CategoryAssignment[]>): CategoryAssignment[] {
  const byAsset = new Map<string, CategoryAssignment>();
  for (const assignment of sources.flat()) {
    const existing = byAsset.get(assignment.muxAssetId);
    if (existing && existing.category !== assignment.category) {
      throw new CategoryBackfillError(`${assignment.muxAssetId}: çelişen kategori (${existing.category} vs ${assignment.category}) — backfill durduruldu.`);
    }
    byAsset.set(assignment.muxAssetId, assignment);
  }
  return [...byAsset.values()].sort((a, b) => a.muxAssetId.localeCompare(b.muxAssetId));
}

export async function backfillVideoCategories(
  db: Database,
  assignments: readonly CategoryAssignment[],
  options: { dryRun: boolean },
): Promise<CategoryBackfillResult[]> {
  const results: CategoryBackfillResult[] = [];
  for (const assignment of assignments) {
    const matchesGeneralRow = and(eq(videosTable.muxAssetId, assignment.muxAssetId), eq(videosTable.category, "general"));
    if (options.dryRun) {
      const rows = await db.select({ id: videosTable.id }).from(videosTable).where(matchesGeneralRow);
      results.push({ ...assignment, status: rows.length > 0 ? "would-update" : "skipped-no-match-or-not-general" });
      continue;
    }
    const updated = await db.update(videosTable).set({ category: assignment.category }).where(matchesGeneralRow).returning({ id: videosTable.id });
    results.push({ ...assignment, status: updated.length > 0 ? "updated" : "skipped-no-match-or-not-general" });
  }
  return results;
}

export function parseArgs(argv: readonly string[]): { dryRun: boolean } {
  let dryRun = false;
  for (const arg of argv) {
    if (arg === "--check") {
      dryRun = true;
    } else {
      throw new CategoryBackfillError(`Bilinmeyen argüman: "${arg}". Kullanım: [--check] (sadece listeler, DB'yi değiştirmez).`);
    }
  }
  return { dryRun };
}

async function main(): Promise<void> {
  const { dryRun } = parseArgs(process.argv.slice(2));
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new CategoryBackfillError("DATABASE_URL tanımlı değil (.env dosyasını kontrol edin).");
  }
  const assignments = mergeAssignments(loadCategoryManifest(), collectApprovedAssignments(), collectCategoryAssignments());
  if (assignments.length === 0) {
    console.error("enriched.json'larda açık, general olmayan category yok — yapılacak bir şey yok.");
    return;
  }
  const pool = new Pool({ connectionString: databaseUrl });
  const db = drizzle(pool);
  try {
    const results = await backfillVideoCategories(db, assignments, { dryRun });
    for (const result of results) {
      console.error(`[${result.status}] ${result.muxAssetId} -> ${result.category}`);
    }
    const changed = results.filter((r) => r.status === "updated" || r.status === "would-update").length;
    console.error(`\n${dryRun ? "--check: DB değişmedi. Güncellenecek" : "Güncellenen"}: ${changed}/${results.length}`);
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  main().catch((error: unknown) => {
    console.error(error instanceof CategoryBackfillError ? `\nHATA: ${error.message}` : error);
    process.exit(1);
  });
}
