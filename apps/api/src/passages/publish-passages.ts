import "dotenv/config";
import * as fs from "node:fs";
import * as path from "node:path";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { PassagePublishError, publishPassagePacks, validatePacks } from "./passage-publisher";

/**
 * Okuma pratiği yayın betiği: `node dist/passages/publish-passages.js --dir <klasör> [--apply]`.
 *
 * GÜVENLİK: varsayılan YALNIZ DOĞRULAR (DB'ye hiç bağlanmaz); yazmak için açık `--apply` gerekir ve yazmadan önce hedef
 * veritabanı (host/ad, parolasız) yazdırılır. Dotenv yüklendiği için DATABASE_URL .env'deki (geliştirme) DB olabilir —
 * `--apply` ile çalıştırmadan önce yazdırılan hedefi kontrol et. Tüm dosyalar önce birlikte doğrulanır; biri başarısızsa
 * HİÇBİRİ yazılmaz, yazım tek transaction'dır.
 */
export function describeTarget(databaseUrl: string): string {
  try {
    const url = new URL(databaseUrl);
    return `${url.hostname}:${url.port || "5432"}${url.pathname}`;
  } catch {
    return "(çözümlenemeyen DATABASE_URL)";
  }
}

export function readPackFiles(dir: string): Array<{ source: string; json: unknown }> {
  const files = fs.readdirSync(dir).filter((name) => name.endsWith(".json")).sort();
  return files.map((name) => {
    try {
      return { source: name, json: JSON.parse(fs.readFileSync(path.join(dir, name), "utf8")) as unknown };
    } catch (error) {
      throw new Error(`${name}: geçerli JSON değil (${error instanceof Error ? error.message : String(error)})`);
    }
  });
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const dirIndex = args.indexOf("--dir");
  const dir = dirIndex >= 0 ? args[dirIndex + 1] : undefined;
  const apply = args.includes("--apply");
  if (!dir) throw new Error("Kullanım: publish-passages --dir <klasör> [--apply]");

  const inputs = readPackFiles(path.resolve(dir));
  if (inputs.length === 0) throw new Error(`${dir} içinde .json paketi yok`);
  const { packs, issues } = validatePacks(inputs);
  if (issues.length > 0) {
    for (const entry of issues) console.error(`[${entry.code}] ${entry.path}: ${entry.message}`);
    throw new Error(`Doğrulama başarısız (${issues.length} sorun); hiçbir şey yazılmadı.`);
  }
  console.error(`${packs.length} paket doğrulandı.`);
  if (!apply) {
    console.error("Yalnız doğrulama yapıldı (DB'ye yazılmadı). Yazmak için --apply ekle.");
    return;
  }

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL tanımlı değil (.env dosyasını kontrol edin).");
  console.error(`HEDEF VERİTABANI: ${describeTarget(databaseUrl)}`);
  const pool = new Pool({ connectionString: databaseUrl });
  try {
    const results = await publishPassagePacks(drizzle(pool), packs);
    for (const result of results) console.error(`[${result.status}] ${result.slug}`);
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  main().catch((error: unknown) => {
    console.error(error instanceof PassagePublishError ? error.message : error);
    process.exit(1);
  });
}
