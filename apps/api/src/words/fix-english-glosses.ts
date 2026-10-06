import "dotenv/config";
import * as fs from "node:fs";
import * as path from "node:path";
import { and, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { z } from "zod";
import type { Database } from "../database/database.module";
import { wordsTable } from "./words.schema";

/**
 * 2026-10-06 — kelime tekrarında (ve kelime sheet'inde) bazı anlamların İngilizce
 * görünmesi: `words.gloss` TEK dilde (Türkçe) olmalı, ama içerik üretim
 * prompt'unda `vocabulary.gloss`'un dili belirtilmediği için model bazen İngilizce
 * bir tanım yazmış (bkz. enrichment-llm-client.ts). Bu, TEK seferlik/tekrar
 * çalıştırılabilir bir veri düzeltmesi: `content/words/turkish-gloss-fixes.json`'daki
 * her (lemma, from) çiftini, `gloss` HÂLÂ tam olarak `from` ise `to` ile değiştirir —
 * elle düzeltilmiş (artık `from` olmayan) satırlara ve hiçbir başka kelimeye dokunmaz.
 */

export const GLOSS_FIXES_PATH = path.resolve(__dirname, "../../content/words/turkish-gloss-fixes.json");

export const glossFixesSchema = z.array(z.object({ lemma: z.string().min(1), from: z.string().min(1), to: z.string().min(1) }));
export type GlossFix = z.infer<typeof glossFixesSchema>[number];

export interface GlossFixResult {
  lemma: string;
  rowsUpdated: number;
}

export function loadGlossFixes(filePath: string = GLOSS_FIXES_PATH): GlossFix[] {
  return glossFixesSchema.parse(JSON.parse(fs.readFileSync(filePath, "utf8")));
}

export async function applyGlossFixes(db: Database, fixes: readonly GlossFix[]): Promise<GlossFixResult[]> {
  const results: GlossFixResult[] = [];
  for (const fix of fixes) {
    const updated = await db
      .update(wordsTable)
      .set({ gloss: fix.to })
      .where(and(eq(wordsTable.lemma, fix.lemma), eq(wordsTable.gloss, fix.from)))
      .returning({ id: wordsTable.id });
    results.push({ lemma: fix.lemma, rowsUpdated: updated.length });
  }
  return results;
}

async function main(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL tanımlı değil (.env dosyasını kontrol edin).");
  }
  const pool = new Pool({ connectionString: databaseUrl });
  const db = drizzle(pool);
  try {
    const results = await applyGlossFixes(db, loadGlossFixes());
    const changed = results.filter((r) => r.rowsUpdated > 0);
    for (const r of changed) {
      console.error(`[updated x${r.rowsUpdated}] ${r.lemma}`);
    }
    const totalRows = changed.reduce((sum, r) => sum + r.rowsUpdated, 0);
    console.error(`\n${changed.length}/${results.length} düzeltme uygulandı (${totalRows} satır). Uygulanmayanlar zaten düzeltilmiş ya da bu veritabanında yok.`);
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  main().catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  });
}
