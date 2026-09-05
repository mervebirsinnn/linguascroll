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
 * ediliyor (DEFAULT yalnızca id verilmediğinde devreye girer). id zaten PRIMARY
 * KEY olduğu için ON CONFLICT (id) DO NOTHING hiçbir yeni constraint eklemeden
 * çalışır — script kaç kere çalıştırılırsa çalıştırılsın tabloda tekrar satır
 * oluşmaz, gerçek uygulama insert'leri DB-generated UUID kullanmaya devam eder.
 *
 * Chunk 7: topic değerleri legacy vocabulary'den (greetings/daily-routine/
 * travel/work-life/culture — CEFR ile 1:1 örtüşen, curriculum-flavored) yeni
 * content-interest taxonomy'sine (dating/travel/career/lifestyle/humor)
 * remap edildi. Mock içerik zaten placeholder (stock sample video URL'leri) —
 * relabel etmek gerçek bir içerik iddiasını bozmuyor.
 *
 * Chunk 10 (MVP stabilization): orijinal 5 video (topic başına 1) gerçek cihazda
 * pagination/personalization'ı GÖZLE gözlemlemek için yetersizdi — MAX_SESSION_VIDEOS
 * (27) + PAGE_SIZE (12) ile tek sayfada bitiyordu. 19 video eklendi (toplam 24,
 * 27'yi aşmıyor — tek session'da, ~3 sayfaya yayılıyor). Topic dağılımı BİLİNÇLİ
 * OLARAK eşit değil (travel=6 baskın, diğerleri 4-5) — SWRR ranking'in "baskın
 * topic daha sık ama kümelenmeden" davranışını gerçek cihazda gözlemlemeyi
 * amaçlıyor. Orijinal 5 id DEĞİŞTİRİLMEDİ (seed-words.ts bunlara referans veriyor).
 */
const seedVideos = [
  {
    id: "ef7ae2f0-4c43-4508-a2e4-4d104492af01",
    learningLanguage: "en",
    cefrLevel: "A1",
    muxAssetId: "mock-mux-asset-1",
    topic: "lifestyle",
    durationMs: 596000,
  },
  {
    id: "fb6eff86-a7ad-4ffd-9570-ead895b1abb8",
    learningLanguage: "en",
    cefrLevel: "A2",
    muxAssetId: "mock-mux-asset-2",
    topic: "dating",
    durationMs: 653000,
  },
  {
    id: "71b4afce-8070-4c79-97c5-f69771585cf3",
    learningLanguage: "en",
    cefrLevel: "B1",
    muxAssetId: "mock-mux-asset-3",
    topic: "travel",
    durationMs: 15000,
  },
  {
    id: "ffca8d44-0951-4a41-a42e-acc8ea5d5869",
    learningLanguage: "en",
    cefrLevel: "B2",
    muxAssetId: "mock-mux-asset-4",
    topic: "career",
    durationMs: 15000,
  },
  {
    id: "8938c49f-539d-4699-af03-4672d05a49be",
    learningLanguage: "en",
    cefrLevel: "C1",
    muxAssetId: "mock-mux-asset-5",
    topic: "humor",
    durationMs: 60000,
  },
  // --- Chunk 10: pagination/personalization'ı gözlemlemeye yetecek ek içerik ---
  { id: "20000000-0000-4000-8000-000000000001", learningLanguage: "en", cefrLevel: "A1", muxAssetId: "mock-mux-asset-1", topic: "travel", durationMs: 15000 },
  { id: "20000000-0000-4000-8000-000000000002", learningLanguage: "en", cefrLevel: "A2", muxAssetId: "mock-mux-asset-2", topic: "travel", durationMs: 45000 },
  { id: "20000000-0000-4000-8000-000000000003", learningLanguage: "en", cefrLevel: "B1", muxAssetId: "mock-mux-asset-3", topic: "travel", durationMs: 60000 },
  { id: "20000000-0000-4000-8000-000000000004", learningLanguage: "en", cefrLevel: "B2", muxAssetId: "mock-mux-asset-4", topic: "travel", durationMs: 30000 },
  { id: "20000000-0000-4000-8000-000000000005", learningLanguage: "en", cefrLevel: "C1", muxAssetId: "mock-mux-asset-5", topic: "travel", durationMs: 90000 },
  { id: "20000000-0000-4000-8000-000000000006", learningLanguage: "en", cefrLevel: "C2", muxAssetId: "mock-mux-asset-1", topic: "career", durationMs: 15000 },
  { id: "20000000-0000-4000-8000-000000000007", learningLanguage: "en", cefrLevel: "A1", muxAssetId: "mock-mux-asset-2", topic: "career", durationMs: 45000 },
  { id: "20000000-0000-4000-8000-000000000008", learningLanguage: "en", cefrLevel: "A2", muxAssetId: "mock-mux-asset-3", topic: "career", durationMs: 60000 },
  { id: "20000000-0000-4000-8000-000000000009", learningLanguage: "en", cefrLevel: "B1", muxAssetId: "mock-mux-asset-4", topic: "career", durationMs: 30000 },
  { id: "20000000-0000-4000-8000-000000000010", learningLanguage: "en", cefrLevel: "B2", muxAssetId: "mock-mux-asset-5", topic: "humor", durationMs: 90000 },
  { id: "20000000-0000-4000-8000-000000000011", learningLanguage: "en", cefrLevel: "C1", muxAssetId: "mock-mux-asset-1", topic: "humor", durationMs: 15000 },
  { id: "20000000-0000-4000-8000-000000000012", learningLanguage: "en", cefrLevel: "C2", muxAssetId: "mock-mux-asset-2", topic: "humor", durationMs: 45000 },
  { id: "20000000-0000-4000-8000-000000000013", learningLanguage: "en", cefrLevel: "A1", muxAssetId: "mock-mux-asset-3", topic: "humor", durationMs: 60000 },
  { id: "20000000-0000-4000-8000-000000000014", learningLanguage: "en", cefrLevel: "A2", muxAssetId: "mock-mux-asset-4", topic: "lifestyle", durationMs: 30000 },
  { id: "20000000-0000-4000-8000-000000000015", learningLanguage: "en", cefrLevel: "B1", muxAssetId: "mock-mux-asset-5", topic: "lifestyle", durationMs: 90000 },
  { id: "20000000-0000-4000-8000-000000000016", learningLanguage: "en", cefrLevel: "B2", muxAssetId: "mock-mux-asset-1", topic: "lifestyle", durationMs: 15000 },
  { id: "20000000-0000-4000-8000-000000000017", learningLanguage: "en", cefrLevel: "C1", muxAssetId: "mock-mux-asset-2", topic: "dating", durationMs: 45000 },
  { id: "20000000-0000-4000-8000-000000000018", learningLanguage: "en", cefrLevel: "C2", muxAssetId: "mock-mux-asset-3", topic: "dating", durationMs: 60000 },
  { id: "20000000-0000-4000-8000-000000000019", learningLanguage: "en", cefrLevel: "A1", muxAssetId: "mock-mux-asset-4", topic: "dating", durationMs: 30000 },
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
