import "dotenv/config";
import { z } from "zod";
import { execFileSync } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";
import { ConfigService } from "@nestjs/config";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { R2StorageService } from "../content-admin/r2-storage.service";
import { assertPassesQualityGate, copyMediaFile, publishContent, resolveMediaDestination } from "../content-enrichment/publish-content";
import { videosTable } from "../videos/videos.schema";
import { ANIMATION_CATALOG_DIR, loadAnimationCatalog } from "./animation-catalog";

const API_ROOT = path.resolve(__dirname, "../..");

export function parseAnimationArgs(argv: readonly string[]) {
  let mediaDir = path.join(API_ROOT, "public/media");
  let catalogPath = ANIMATION_CATALOG_DIR;
  let checkOnly = false, local = false, acknowledgeNeedsReview = false;
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--media-dir") {
      const value = argv[++i];
      if (!value || value.startsWith("--")) throw new Error("--media-dir bir dosya yolu gerektirir.");
      mediaDir = path.resolve(value);
    } else if (arg === "--catalog") {
      const value = argv[++i];
      if (!value || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value)) {
        throw new Error("--catalog yalnızca küçük harf, rakam ve tire içeren bir katalog adı gerektirir.");
      }
      catalogPath = path.join(ANIMATION_CATALOG_DIR, `${value}.json`);
    } else if (arg === "--check") checkOnly = true;
    else if (arg === "--local") local = true;
    else if (arg === "--acknowledge-needs-review") acknowledgeNeedsReview = true;
    else throw new Error(`Bilinmeyen argüman: ${arg}`);
  }
  return { mediaDir, catalogPath, checkOnly, local, acknowledgeNeedsReview };
}

// Medya, DB'ye/R2'ye dokunmadan önce doğrulanır. Dosya adı tek başına kanıt değildir.
export function verifyAnimationMedia(filename: string, durationMs: number): void {
  if (!fs.existsSync(filename)) throw new Error(`Sahne bulunamadı: ${path.basename(filename)}. Önce prepare-animation-media.py çalıştırın.`);
  const raw: unknown = JSON.parse(execFileSync("ffprobe", ["-v", "error", "-show_streams", "-show_format", "-of", "json", filename], { encoding: "utf8" }));
  const result = z.object({
    format: z.object({ duration: z.string() }),
    streams: z.array(z.object({ codec_type: z.string(), codec_name: z.string() })),
  }).parse(raw);
  const duration = Number(result.format.duration) * 1000;
  if (!Number.isFinite(duration) || Math.abs(duration - durationMs) > 150 ||
    !result.streams.some((stream) => stream.codec_type === "video" && stream.codec_name === "h264") ||
    !result.streams.some((stream) => stream.codec_type === "audio" && stream.codec_name === "aac")) {
    throw new Error(`Sahnenin süre/codec bilgisi katalogla uyuşmuyor: ${path.basename(filename)}`);
  }
}

export async function main(argv: readonly string[]): Promise<void> {
  const options = parseAnimationArgs(argv);
  const catalog = loadAnimationCatalog(options.catalogPath);
  // Kataloğun tümü ön kontrolden geçmeden hiçbir öğe yayımlanmaz.
  for (const entry of catalog) {
    assertPassesQualityGate(entry.draft, options.acknowledgeNeedsReview);
    verifyAnimationMedia(path.join(options.mediaDir, entry.draft.sourceFile), entry.draft.durationMs);
  }
  if (options.checkOnly) {
    console.log(`${catalog.length} Animasyon sahnesi: kaynak, kalite, altyazı ve medya kontrolleri geçti. DB/R2 değişmedi.`);
    return;
  }
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL tanımlı değil.");
  if (!options.local) for (const key of ["R2_ACCOUNT_ID", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY", "R2_BUCKET_NAME", "R2_PUBLIC_BASE_URL"]) {
    if (!process.env[key]) throw new Error(`${key} tanımlı değil; Animasyon yayını R2 yapılandırması gerektirir.`);
  }
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool);
  const storage = new R2StorageService(new ConfigService());
  try {
    for (const { draft, title } of catalog) {
      const [existing] = await db.select({ id: videosTable.id, category: videosTable.category }).from(videosTable).where(eq(videosTable.muxAssetId, draft.muxAssetId));
      if (existing) {
        if (existing.category !== "animation") throw new Error(`İçerik kimliği başka bir kategoride kullanılıyor: ${draft.contentId}`);
        console.log(`Zaten yayımlanmış, atlandı: ${title}`);
        continue;
      }
      const source = path.join(options.mediaDir, draft.sourceFile);
      let storageKey: string | null = null;
      if (options.local) {
        if (path.resolve(source) !== path.resolve(resolveMediaDestination(draft.muxAssetId))) copyMediaFile(source, draft.muxAssetId);
      } else {
        storageKey = (await storage.uploadOriginalVideo({ contentId: draft.contentId, buffer: fs.readFileSync(source), contentType: "video/mp4" })).storageKey;
      }
      const { videoId } = await publishContent(db, { ...draft, storageKey });
      console.log(`Animasyon yayımlandı: ${title} (${videoId})`);
    }
  } finally { await pool.end(); }
}

if (require.main === module) main(process.argv.slice(2)).catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Animasyon yayını başarısız.");
  process.exitCode = 1;
});
