import "dotenv/config";
import { randomUUID } from "node:crypto";
import * as fs from "node:fs";
import * as path from "node:path";
import { HeadObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { and, eq, isNull } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import type { Database } from "../database/database.module";
import { LOCAL_MEDIA_PREFIX } from "../videos/resolve-playback-url";
import { videosTable } from "../videos/videos.schema";
import { buildOriginalVideoStorageKey, isValidContentId } from "./build-storage-key";

/**
 * Chunk 18 — mevcut, `public/media/`'dan yerel olarak servis edilen (storage_key
 * NULL) videoları Cloudflare R2'ye taşıyan, TEK seferlik/tekrar çalıştırılabilir
 * bir backfill CLI'ı. `publish-content.ts`'in Nest DI'ın DIŞINDA kendi
 * Pool/drizzle bağlantısını açan deseni AYNEN takip ediliyor — burada da yeni bir
 * servis/DI bağlamı kurulmuyor.
 *
 * `R2StorageService`'i (content-admin.module.ts DI graph'ının bir parçası)
 * doğrudan `new` ile bu script'e enjekte ETMİYORUZ: constructor'ı Nest'in
 * `ConfigService`'ini bekliyor, CLI bağlamında onu taklit etmek (fake/`as unknown
 * as ConfigService`) gereksiz bir cast'e yol açardı. Bunun yerine `publish-content.ts`
 * `DatabaseModule`'ü değil kendi Pool'unu kurduğu gibi, burada da AYNI S3
 * client kurulumu (region/endpoint/credentials) doğrudan tekrarlanıyor — ama
 * key ÜRETİM mantığı (`buildOriginalVideoStorageKey`/`isValidContentId`)
 * `content-admin/build-storage-key.ts`'ten AYNEN import ediliyor, böylece
 * backfill ile gerçek upload endpoint'i aynı key formatını (`originals/<contentId>/<uuid>.mp4`)
 * üretiyor — iki farklı key şeması riski yok.
 *
 * Güvenlik sırası (kullanıcı kararı): upload → R2'de HeadObjectCommand ile
 * VARLIK doğrulaması → sadece bundan SONRA `videos.storage_key` UPDATE. Upload
 * veya doğrulama başarısız olursa DB'ye HİÇ dokunulmuyor. Script idempotent:
 * `storage_key` zaten dolu bir satır atlanıyor (tekrar çalıştırıldığında zaten
 * taşınmış videoları yeniden yüklemez). Yerel MP4 dosyaları hiçbir koşulda
 * silinmiyor — bu script sadece okuyor.
 */

export class BackfillError extends Error {}

const API_ROOT = path.resolve(__dirname, "..", "..");
const MEDIA_DIR = path.join(API_ROOT, "public", "media");

export function parseArgs(argv: readonly string[]): { videoId: string | undefined } {
  let videoId: string | undefined;
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--video-id") {
      videoId = argv[++i];
    } else {
      throw new BackfillError(`Bilinmeyen argüman: "${argv[i]}". Kullanım: [--video-id <uuid>] (verilmezse storage_key'i NULL olan TÜM videolar işlenir).`);
    }
  }
  return { videoId };
}

/**
 * `videos.mux_asset_id` (`local-<slug>`) → R2 `contentId` (`<slug>`). Aynı
 * `LOCAL_MEDIA_PREFIX` sabiti `resolve-playback-url.ts`'ten import ediliyor —
 * "local- önekini nasıl soyarız" mantığı iki yerde ayrı ayrı yazılmıyor.
 */
export function deriveContentId(muxAssetId: string): string {
  if (!muxAssetId.startsWith(LOCAL_MEDIA_PREFIX)) {
    throw new BackfillError(`"${muxAssetId}" "${LOCAL_MEDIA_PREFIX}" öneki ile başlamıyor — bu script sadece yerel medyadan R2'ye taşınacak videolar içindir.`);
  }
  const contentId = muxAssetId.slice(LOCAL_MEDIA_PREFIX.length);
  if (!isValidContentId(contentId)) {
    throw new BackfillError(`"${muxAssetId}" için türetilen contentId ("${contentId}") beklenen kebab-case formatında değil.`);
  }
  return contentId;
}

export function resolveLocalMediaPath(muxAssetId: string, mediaDir: string = MEDIA_DIR): string {
  return path.join(mediaDir, `${deriveContentId(muxAssetId)}.mp4`);
}

export interface BackfillRowResult {
  videoId: string;
  muxAssetId: string;
  status: "uploaded" | "skipped-already-has-storage-key" | "failed";
  storageKey?: string;
  sizeBytes?: number;
  error?: string;
}

type VideoRow = { id: string; muxAssetId: string; storageKey: string | null };

export async function backfillOneVideo(
  db: Database,
  s3Client: S3Client,
  bucket: string,
  video: VideoRow,
  mediaDir: string = MEDIA_DIR,
): Promise<BackfillRowResult> {
  if (video.storageKey) {
    return { videoId: video.id, muxAssetId: video.muxAssetId, status: "skipped-already-has-storage-key", storageKey: video.storageKey };
  }

  let localPath: string;
  try {
    localPath = resolveLocalMediaPath(video.muxAssetId, mediaDir);
  } catch (error) {
    return { videoId: video.id, muxAssetId: video.muxAssetId, status: "failed", error: error instanceof Error ? error.message : String(error) };
  }
  if (!fs.existsSync(localPath)) {
    return { videoId: video.id, muxAssetId: video.muxAssetId, status: "failed", error: `Yerel dosya bulunamadı: "${localPath}"` };
  }

  const buffer = fs.readFileSync(localPath);
  const storageKey = buildOriginalVideoStorageKey(deriveContentId(video.muxAssetId), randomUUID());

  try {
    await s3Client.send(new PutObjectCommand({ Bucket: bucket, Key: storageKey, Body: buffer, ContentType: "video/mp4" }));
    // Upload'ın gerçekten kalıcı olduğunu (transient network hatası/sessiz kısmi
    // yazma değil) doğrulamadan DB'yi güncellemiyoruz — kullanıcı kararı.
    await s3Client.send(new HeadObjectCommand({ Bucket: bucket, Key: storageKey }));
  } catch (error) {
    return { videoId: video.id, muxAssetId: video.muxAssetId, status: "failed", error: error instanceof Error ? error.message : String(error) };
  }

  // `isNull(storageKey)` ek bir garanti (assertNotAlreadyPublished'daki aynı
  // "application kontrolü + DB seviyesinde son çare" deseni) — bu script
  // tek-thread'li/sıralı çalıştığı için pratikte hep true olur, ama satırın
  // script çalışırken başka bir yoldan (elle) doldurulmuş olması ihtimaline
  // karşı var olan bir key'in üzerine sessizce yazılmasını engelliyor.
  const updated = await db
    .update(videosTable)
    .set({ storageKey })
    .where(and(eq(videosTable.id, video.id), isNull(videosTable.storageKey)))
    .returning({ id: videosTable.id });

  if (updated.length === 0) {
    throw new BackfillError(
      `"${video.id}" için storage_key güncellemesi yapılamadı (satırda zaten bir storage_key var olabilir) — R2'ye yüklenen "${storageKey}" object'i elle kontrol edilmeli (yetim obje kalmış olabilir).`,
    );
  }

  return { videoId: video.id, muxAssetId: video.muxAssetId, status: "uploaded", storageKey, sizeBytes: buffer.byteLength };
}

function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new BackfillError(`"${key}" tanımlı değil (.env dosyasını kontrol edin).`);
  }
  return value;
}

function buildR2Client(): S3Client {
  return new S3Client({
    region: "auto",
    endpoint: `https://${requireEnv("R2_ACCOUNT_ID")}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: requireEnv("R2_ACCESS_KEY_ID"),
      secretAccessKey: requireEnv("R2_SECRET_ACCESS_KEY"),
    },
  });
}

async function main(): Promise<void> {
  const { videoId } = parseArgs(process.argv.slice(2));
  const bucket = requireEnv("R2_BUCKET_NAME");
  const pool = new Pool({ connectionString: requireEnv("DATABASE_URL") });
  const db = drizzle(pool);
  const s3Client = buildR2Client();

  try {
    const targetRows = videoId
      ? await db.select().from(videosTable).where(eq(videosTable.id, videoId))
      : await db.select().from(videosTable).where(isNull(videosTable.storageKey));

    if (targetRows.length === 0) {
      console.error(videoId ? `"${videoId}" ile eşleşen video bulunamadı.` : "storage_key'i NULL olan video yok — yapılacak bir şey yok.");
      return;
    }

    const results: BackfillRowResult[] = [];
    for (const row of targetRows) {
      const result = await backfillOneVideo(db, s3Client, bucket, { id: row.id, muxAssetId: row.muxAssetId, storageKey: row.storageKey });
      results.push(result);
      const suffix = result.storageKey ? ` -> ${result.storageKey}` : result.error ? ` — ${result.error}` : "";
      console.error(`[${result.status}] ${result.muxAssetId} (${result.videoId})${suffix}`);
    }

    const uploaded = results.filter((r) => r.status === "uploaded");
    const skipped = results.filter((r) => r.status === "skipped-already-has-storage-key");
    const failed = results.filter((r) => r.status === "failed");
    const totalBytes = uploaded.reduce((sum, r) => sum + (r.sizeBytes ?? 0), 0);

    console.error("\n=== BACKFILL ÖZET ===");
    console.error(`Yüklenen: ${uploaded.length}, Atlanan (zaten var): ${skipped.length}, Başarısız: ${failed.length}`);
    console.error(`Toplam yüklenen: ${(totalBytes / (1024 * 1024)).toFixed(1)} MB`);
    if (failed.length > 0) {
      console.error("Başarısız videolar:");
      for (const f of failed) {
        console.error(`  - ${f.muxAssetId} (${f.videoId}): ${f.error}`);
      }
      process.exitCode = 1;
    }
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  main().catch((error: unknown) => {
    if (error instanceof BackfillError) {
      console.error(`\nHATA: ${error.message}`);
    } else {
      console.error("\nBEKLENMEYEN HATA:");
      console.error(error);
    }
    process.exit(1);
  });
}
