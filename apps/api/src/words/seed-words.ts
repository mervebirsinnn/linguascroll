import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { videoWordsTable } from "./video-words.schema";
import { wordsTable } from "./words.schema";

/**
 * Bağımsız bir script — seed-videos.ts/seed-quizzes.ts ile aynı desen: DATABASE_URL'i
 * doğrudan process.env'den okur, sabit id'lerle idempotent (`ON CONFLICT DO NOTHING`).
 *
 * Kullanıcı kararı: Chunk 7-10'un placeholder video kataloğu (bu kelimelerin
 * `video_words` ile bağlı olduğu TÜM videolar) kaldırıldı (bkz. seed-videos.ts).
 * O videolara referans veren küratörlü kelime/video-kelime ilişkileri de
 * anlamsız kaldığı için bilinçli olarak BOŞALTILDI — Chunk 11'in gerçek 4
 * videosu için henüz bir vocabulary curation'ı yok (kapsam dışı, istenmedi).
 * `vocabulary: []` mevcut kod tarafından zaten sorunsuz destekleniyor (bkz.
 * Chunk 9 kararı) — bu script'in 0 satır eklemesi feed'i bozmaz.
 */
const seedWords: { id: string; language: string; lemma: string; gloss: string }[] = [];

const seedVideoWords: { videoId: string; wordId: string }[] = [];

async function seed(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL tanımlı değil (.env dosyasını kontrol edin).");
  }

  const pool = new Pool({ connectionString: databaseUrl });
  const db = drizzle(pool);

  if (seedWords.length > 0) {
    await db.insert(wordsTable).values(seedWords).onConflictDoNothing({ target: wordsTable.id });
  }
  if (seedVideoWords.length > 0) {
    await db
      .insert(videoWordsTable)
      .values(seedVideoWords)
      .onConflictDoNothing({ target: [videoWordsTable.videoId, videoWordsTable.wordId] });
  }
  await pool.end();

  console.log(
    `Seed tamamlandı: ${seedWords.length} kelime, ${seedVideoWords.length} video-kelime ilişkisi (idempotent).`,
  );
}

seed().catch((error: unknown) => {
  console.error("Seed başarısız:", error);
  process.exit(1);
});
