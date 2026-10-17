import "dotenv/config";
import { ConfigService } from "@nestjs/config";
import { isNotNull } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { videosTable } from "../videos/videos.schema";
import { R2StorageService, type R2ObjectSummary } from "./r2-storage.service";

/**
 * READ-ONLY / DRY-RUN orphan raporu. R2 `originals/` altındaki nesneleri `videos.storage_key` referanslarıyla karşılaştırır ve
 * yalnızca ORPHAN ADAYLARINI raporlar. HİÇBİR nesneyi/satırı silmez, değiştirmez (DB'de yalnızca SELECT, R2'de yalnızca LIST).
 *
 * Neden "aday": publish R2'ye yükler, SONRA DB'ye yazar (bkz. publish-content.ts `publishApprovedContent`). Upload ile DB commit'i
 * arasındaki pencerede (veya process orada ölürse) nesne DB'de referanssız görünür. Devam eden bir publish'in nesnesini yanlışlıkla
 * "orphan" saymamak için `minAgeMs`'den GENÇ nesneler orphan sayılmaz, ayrıca raporlanır. Silme kararı insana aittir.
 */
export interface OrphanReport {
  readonly totalObjects: number;
  readonly referencedObjects: number;
  /** DB'de referansı olmayan VE minAge'den eski nesneler — gerçek orphan adayları. */
  readonly orphanCandidates: readonly R2ObjectSummary[];
  /** DB'de referansı olmayan ama minAge'den genç (muhtemelen devam eden publish) — orphan SAYILMAZ. */
  readonly tooRecentToJudge: readonly R2ObjectSummary[];
  /** DB'de storage_key olan ama listelemede görünmeyen (kırık feed riski!) — prefix altındakiler. */
  readonly missingInR2: readonly string[];
}

export function findOrphanCandidates(params: {
  objects: readonly R2ObjectSummary[];
  dbStorageKeys: ReadonlySet<string>;
  now: Date;
  minAgeMs: number;
  prefix: string;
}): OrphanReport {
  const { objects, dbStorageKeys, now, minAgeMs, prefix } = params;
  const listedKeys = new Set(objects.map((object) => object.key));
  const orphanCandidates: R2ObjectSummary[] = [];
  const tooRecentToJudge: R2ObjectSummary[] = [];
  let referencedObjects = 0;
  for (const object of objects) {
    if (dbStorageKeys.has(object.key)) {
      referencedObjects += 1;
      continue;
    }
    // LastModified bilinmiyorsa güvenli taraf: yargılama (orphan sayma).
    const ageMs = object.lastModified ? now.getTime() - object.lastModified.getTime() : -1;
    if (ageMs >= minAgeMs) {
      orphanCandidates.push(object);
    } else {
      tooRecentToJudge.push(object);
    }
  }
  const missingInR2 = [...dbStorageKeys].filter((key) => key.startsWith(prefix) && !listedKeys.has(key)).sort();
  return { totalObjects: objects.length, referencedObjects, orphanCandidates, tooRecentToJudge, missingInR2 };
}

export function parseOrphanArgs(argv: readonly string[]): { prefix: string; minAgeMinutes: number; json: boolean } {
  let prefix = "originals/";
  let minAgeMinutes = 60;
  let json = false;
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--prefix") {
      const value = argv[++i];
      if (!value || value.startsWith("--")) throw new Error("--prefix bir değer gerektirir.");
      prefix = value;
    } else if (arg === "--min-age-minutes") {
      const value = Number(argv[++i]);
      if (!Number.isFinite(value) || value < 0) throw new Error("--min-age-minutes sıfır veya pozitif bir sayı olmalı.");
      minAgeMinutes = value;
    } else if (arg === "--json") {
      json = true;
    } else {
      throw new Error(`Bilinmeyen argüman: ${arg}. Kullanım: [--prefix originals/] [--min-age-minutes 60] [--json] — bu komut SİLMEZ.`);
    }
  }
  return { prefix, minAgeMinutes, json };
}

export function formatOrphanReport(report: OrphanReport, now: Date): string {
  const age = (object: R2ObjectSummary) => (object.lastModified ? `${Math.round((now.getTime() - object.lastModified.getTime()) / 60000)} dk` : "?");
  const lines = [
    "R2 ORPHAN RAPORU (read-only; hiçbir şey silinmedi)",
    `  toplam nesne: ${report.totalObjects} · DB'de referanslı: ${report.referencedObjects} · orphan adayı: ${report.orphanCandidates.length} · yargılanamayacak kadar yeni: ${report.tooRecentToJudge.length} · DB'de var R2'de YOK: ${report.missingInR2.length}`,
  ];
  for (const object of report.orphanCandidates) lines.push(`  ORPHAN-ADAYI  ${object.key}  (yaş ${age(object)}, ${object.size ?? "?"} B)`);
  for (const object of report.tooRecentToJudge) lines.push(`  YENİ(atlandı) ${object.key}  (yaş ${age(object)})`);
  for (const key of report.missingInR2) lines.push(`  EKSİK-R2      ${key}  (DB referansı var, nesne yok → oynatılamaz)`);
  if (report.orphanCandidates.length > 0) {
    lines.push("  Not: aday ≠ kesin orphan. Silmeden önce ilgili içeriğin gerçekten yayımlanmadığını doğrulayın; silme bu komutun kapsamı dışındadır.");
  }
  return lines.join("\n");
}

async function main(argv: readonly string[]): Promise<void> {
  const { prefix, minAgeMinutes, json } = parseOrphanArgs(argv);
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL tanımlı değil.");
  }
  const storage = new R2StorageService(new ConfigService());
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    const objects = await storage.listOriginalVideoObjects(prefix);
    const rows = await drizzle(pool).select({ storageKey: videosTable.storageKey }).from(videosTable).where(isNotNull(videosTable.storageKey));
    const dbStorageKeys = new Set(rows.map((row) => row.storageKey!));
    const now = new Date();
    const report = findOrphanCandidates({ objects, dbStorageKeys, now, minAgeMs: minAgeMinutes * 60_000, prefix });
    console.log(json ? JSON.stringify(report, null, 2) : formatOrphanReport(report, now));
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  main(process.argv.slice(2)).catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : "Orphan raporu başarısız.");
    process.exitCode = 1;
  });
}
