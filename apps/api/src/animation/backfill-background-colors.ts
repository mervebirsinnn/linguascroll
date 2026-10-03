import "dotenv/config";
import { and, eq, isNull } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import type { Database } from "../database/database.module";
import { videosTable } from "../videos/videos.schema";
import { loadAnimationCatalog } from "./animation-catalog";

/**
 * 2026-09-30 — `background_color` alanı `animation:publish`'ten SONRA eklendi
 * (bkz. drizzle/0010_strange_blockbuster.sql), bu yüzden o zamana kadar zaten
 * yayımlanmış Sintel satırları NULL kaldı — `publish-animation.ts` zaten var
 * olan bir `muxAssetId`'yi atlıyor (idempotency), bu yüzden komutu tekrar
 * çalıştırmak Sintel'i güncellemez. Bu, TEK seferlik/tekrar çalıştırılabilir
 * bir backfill: katalogtaki (Sintel + Cosmos Laundromat, `loadAnimationCatalog`
 * ikisini birden okuyor) her `draft.backgroundColor`'ı, aynı `muxAssetId`'ye
 * sahip VE `background_color` hâlâ NULL olan satıra yazar — elle set edilmiş
 * bir değerin üzerine sessizce yazmıyor, animasyon dışı hiçbir satıra dokunmuyor.
 */

export class BackgroundColorBackfillError extends Error {}

export interface BackfillColorResult {
  muxAssetId: string;
  title: string;
  status: "updated" | "skipped-no-match-or-already-set";
}

export async function backfillBackgroundColors(db: Database): Promise<BackfillColorResult[]> {
  const catalog = loadAnimationCatalog();
  const results: BackfillColorResult[] = [];
  for (const { draft, title } of catalog) {
    if (!draft.backgroundColor) {
      continue;
    }
    const updated = await db
      .update(videosTable)
      .set({ backgroundColor: draft.backgroundColor })
      .where(and(eq(videosTable.muxAssetId, draft.muxAssetId), isNull(videosTable.backgroundColor)))
      .returning({ id: videosTable.id });
    results.push({ muxAssetId: draft.muxAssetId, title, status: updated.length > 0 ? "updated" : "skipped-no-match-or-already-set" });
  }
  return results;
}

async function main(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new BackgroundColorBackfillError("DATABASE_URL tanımlı değil (.env dosyasını kontrol edin).");
  }
  const pool = new Pool({ connectionString: databaseUrl });
  const db = drizzle(pool);
  try {
    const results = await backfillBackgroundColors(db);
    for (const result of results) {
      console.error(`[${result.status}] ${result.title} (${result.muxAssetId})`);
    }
    const updated = results.filter((r) => r.status === "updated").length;
    console.error(`\n${updated}/${results.length} satır güncellendi.`);
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  main().catch((error: unknown) => {
    console.error(error instanceof BackgroundColorBackfillError ? `\nHATA: ${error.message}` : error);
    process.exit(1);
  });
}
