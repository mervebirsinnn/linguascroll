import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { videosTable } from "./videos.schema";

/**
 * Bağımsız bir script — drizzle.config.ts gibi Nest'in DI container'ı dışında
 * çalışır, bu yüzden DATABASE_URL'i doğrudan process.env'den okur (aynı,
 * dokümante edilmiş istisna). Migration'dan ayrı, elle çağrılır (`pnpm seed`),
 * app başlangıcına veya migration akışına bağlı değil.
 *
 * Idempotent: id'ler burada SABİT veriliyor — DB'nin normal akışta kullandığı
 * gen_random_uuid() default'u sadece bu script için bilinçli olarak bypass
 * ediliyor. id zaten PRIMARY KEY olduğu için ON CONFLICT (id) DO NOTHING
 * hiçbir yeni constraint eklemeden çalışır.
 *
 * Kullanıcı kararı (bu chunk): Chunk 7-10'daki TÜM placeholder/örnek video
 * kataloğu (stok "mock-mux-asset-*" doğa görüntüleri + TTS+waveform curated
 * videolar) KALDIRILDI — feed artık SADECE Chunk 11'in gerçek, kullanıcının
 * kendi sağladığı, gerçek insan konuşmalı videolarını içeriyor. Bu satırlar
 * silinince eski video id'lerine referans veren `words`/`video_words`
 * (seed-words.ts) ve eski transcript/quiz seed'leri de temizlendi (bkz. o
 * dosyalardaki yorumlar) — DB'de kalan eski satırlar `truncateTestTables`
 * benzeri bir TRUNCATE ile temizlenip bu dosya sıfırdan reseed edildi.
 */
const seedVideos = [
  // Chunk 11 — GERÇEK insan konuşmalı videolar (STT pipeline'ından, bkz.
  // scripts/stt/README.md). durationMs değerleri ffprobe'un ölçtüğü gerçek
  // süre (STT candidate JSON'undaki `durationMs`). topic/cefrLevel içerik
  // gerçekten dinlenip/okunup verilmiş bir ürün kararı — pipeline bunu
  // ÜRETMEDİ (bilinçli olarak otomatikleştirilmedi, bkz. Chunk 11 planı).
  { id: "60000000-0000-4000-8000-000000000001", learningLanguage: "en", cefrLevel: "A2", muxAssetId: "local-working-out-again", topic: "lifestyle", durationMs: 25523 },
  { id: "60000000-0000-4000-8000-000000000002", learningLanguage: "en", cefrLevel: "B1", muxAssetId: "local-common-mistakes", topic: "career", durationMs: 36467 },
  { id: "60000000-0000-4000-8000-000000000003", learningLanguage: "en", cefrLevel: "A2", muxAssetId: "local-introduce-yourself", topic: "career", durationMs: 21600 },
  { id: "60000000-0000-4000-8000-000000000004", learningLanguage: "en", cefrLevel: "A2", muxAssetId: "local-ordering-food", topic: "travel", durationMs: 30200 },
];

async function seed(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL tanımlı değil (.env dosyasını kontrol edin).");
  }

  const pool = new Pool({ connectionString: databaseUrl });
  const db = drizzle(pool);

  await db.insert(videosTable).values(seedVideos).onConflictDoNothing({ target: videosTable.id });
  await pool.end();

  console.log(`Seed tamamlandı: ${seedVideos.length} video (idempotent — zaten var olanlar atlandı).`);
}

seed().catch((error: unknown) => {
  console.error("Seed başarısız:", error);
  process.exit(1);
});
