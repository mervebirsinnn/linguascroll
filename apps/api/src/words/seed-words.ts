import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { videoWordsTable } from "./video-words.schema";
import { wordsTable } from "./words.schema";

/**
 * Bağımsız bir script — seed-videos.ts/seed-quizzes.ts ile aynı desen: DATABASE_URL'i
 * doğrudan process.env'den okur, sabit id'lerle idempotent (`ON CONFLICT DO NOTHING`).
 * `video_words` satırları, seed-videos.ts'teki 5 sabit video id'sine referans veriyor —
 * her video, kendi topic'iyle tutarlı 2 küratörlü kelime "öğretiyor".
 *
 * `gloss` Türkçe: uygulamanın geri kalan UI metniyle (mobile) aynı dil — MVP
 * invariant'ı gereği TEK, SABİT bir açıklama dili (bkz. word.ts).
 */
const seedWords = [
  // lifestyle video (ef7ae2f0) kelimeleri
  { id: "10000000-0000-4000-8000-000000000001", language: "en", lemma: "routine", gloss: "düzenli olarak yapılan alışkanlık, günlük rutin" },
  { id: "10000000-0000-4000-8000-000000000002", language: "en", lemma: "habit", gloss: "sık tekrarlanan, çoğu zaman farkında olmadan yapılan davranış" },
  // dating video (fb6eff86) kelimeleri
  { id: "10000000-0000-4000-8000-000000000003", language: "en", lemma: "relationship", gloss: "iki kişi arasındaki duygusal bağ/ilişki" },
  { id: "10000000-0000-4000-8000-000000000004", language: "en", lemma: "date", gloss: "romantik amaçlı buluşma (fiil: biriyle buluşmak)" },
  // travel video (71b4afce) kelimeleri
  { id: "10000000-0000-4000-8000-000000000005", language: "en", lemma: "journey", gloss: "bir yerden başka bir yere yapılan (genellikle uzun) yolculuk" },
  { id: "10000000-0000-4000-8000-000000000006", language: "en", lemma: "itinerary", gloss: "bir seyahatin planlanmış güzergâhı/programı" },
  // career video (ffca8d44) kelimeleri
  { id: "10000000-0000-4000-8000-000000000007", language: "en", lemma: "promotion", gloss: "işte daha üst bir pozisyona terfi etme" },
  { id: "10000000-0000-4000-8000-000000000008", language: "en", lemma: "colleague", gloss: "aynı işyerinde çalışılan kişi, iş arkadaşı" },
  // humor video (8938c49f) kelimeleri
  { id: "10000000-0000-4000-8000-000000000009", language: "en", lemma: "joke", gloss: "güldürmek amacıyla anlatılan kısa, komik söz/hikâye" },
  { id: "10000000-0000-4000-8000-00000000000a", language: "en", lemma: "pun", gloss: "bir kelimenin birden fazla anlamına dayanan kelime oyunu" },
  // --- Chunk 10 (MVP stabilization): genişletilmiş katalogdaki 10 yeni videoya
  // (topic başına 2) vocabulary — gerçek cihazda scroll ederken çoğu videoda
  // kelime paneli görülebilsin diye. Kalan 9 yeni video bilinçli olarak
  // vocabulary'siz (madde 6'nın "kelimesiz video → boş dizi" davranışı da
  // gerçek cihazda gözlemlenebilsin). ---
  { id: "11000000-0000-4000-8000-000000000001", language: "en", lemma: "delay", gloss: "bir şeyin planlanandan geç gerçekleşmesi, gecikme" },
  { id: "11000000-0000-4000-8000-000000000002", language: "en", lemma: "luggage", gloss: "seyahat ederken taşınan bavul/eşya" },
  { id: "11000000-0000-4000-8000-000000000003", language: "en", lemma: "passport", gloss: "yurt dışı seyahatinde kullanılan kimlik belgesi" },
  { id: "11000000-0000-4000-8000-000000000004", language: "en", lemma: "boarding", gloss: "uçağa/gemiye biniş işlemi" },
  { id: "11000000-0000-4000-8000-000000000005", language: "en", lemma: "salary", gloss: "bir işte düzenli olarak ödenen ücret, maaş" },
  { id: "11000000-0000-4000-8000-000000000006", language: "en", lemma: "interview", gloss: "bir iş için yapılan mülakat/görüşme" },
  { id: "11000000-0000-4000-8000-000000000007", language: "en", lemma: "deadline", gloss: "bir işin tamamlanması gereken son tarih" },
  { id: "11000000-0000-4000-8000-000000000008", language: "en", lemma: "resign", gloss: "işten kendi isteğiyle ayrılmak, istifa etmek" },
  { id: "11000000-0000-4000-8000-000000000009", language: "en", lemma: "sarcasm", gloss: "söylenenin tam tersini kastederek yapılan iğneleyici konuşma" },
  { id: "11000000-0000-4000-8000-000000000010", language: "en", lemma: "prank", gloss: "birine şaka amacıyla yapılan küçük oyun" },
  { id: "11000000-0000-4000-8000-000000000011", language: "en", lemma: "comedian", gloss: "meslek olarak insanları güldüren kişi" },
  { id: "11000000-0000-4000-8000-000000000012", language: "en", lemma: "punchline", gloss: "bir şakanın güldüren son/vurucu cümlesi" },
  { id: "11000000-0000-4000-8000-000000000013", language: "en", lemma: "workout", gloss: "vücut geliştirmek için yapılan egzersiz" },
  { id: "11000000-0000-4000-8000-000000000014", language: "en", lemma: "mindfulness", gloss: "anı bilinçli ve yargılamadan fark etme hâli" },
  { id: "11000000-0000-4000-8000-000000000015", language: "en", lemma: "wellness", gloss: "genel iyi olma hâli, esenlik" },
  { id: "11000000-0000-4000-8000-000000000016", language: "en", lemma: "balance", gloss: "hayatın farklı alanları arasında denge" },
  { id: "11000000-0000-4000-8000-000000000017", language: "en", lemma: "crush", gloss: "birine karşı duyulan ani, yoğun hoşlanma hissi" },
  { id: "11000000-0000-4000-8000-000000000018", language: "en", lemma: "breakup", gloss: "bir ilişkinin sona ermesi, ayrılık" },
  { id: "11000000-0000-4000-8000-000000000019", language: "en", lemma: "flirt", gloss: "birine romantik ilgi göstererek şakalaşmak" },
  { id: "11000000-0000-4000-8000-000000000020", language: "en", lemma: "commitment", gloss: "bir ilişkiye/karara bağlılık, adanmışlık" },
];

const seedVideoWords = [
  { videoId: "ef7ae2f0-4c43-4508-a2e4-4d104492af01", wordId: "10000000-0000-4000-8000-000000000001" },
  { videoId: "ef7ae2f0-4c43-4508-a2e4-4d104492af01", wordId: "10000000-0000-4000-8000-000000000002" },
  { videoId: "fb6eff86-a7ad-4ffd-9570-ead895b1abb8", wordId: "10000000-0000-4000-8000-000000000003" },
  { videoId: "fb6eff86-a7ad-4ffd-9570-ead895b1abb8", wordId: "10000000-0000-4000-8000-000000000004" },
  { videoId: "71b4afce-8070-4c79-97c5-f69771585cf3", wordId: "10000000-0000-4000-8000-000000000005" },
  { videoId: "71b4afce-8070-4c79-97c5-f69771585cf3", wordId: "10000000-0000-4000-8000-000000000006" },
  { videoId: "ffca8d44-0951-4a41-a42e-acc8ea5d5869", wordId: "10000000-0000-4000-8000-000000000007" },
  { videoId: "ffca8d44-0951-4a41-a42e-acc8ea5d5869", wordId: "10000000-0000-4000-8000-000000000008" },
  { videoId: "8938c49f-539d-4699-af03-4672d05a49be", wordId: "10000000-0000-4000-8000-000000000009" },
  { videoId: "8938c49f-539d-4699-af03-4672d05a49be", wordId: "10000000-0000-4000-8000-00000000000a" },
  // --- Chunk 10: yeni 24-video katalogdaki 10 videoya (bkz. seed-videos.ts, id
  // sonekleri 001/002/006/007/010/011/014/015/017/018) vocabulary. ---
  { videoId: "20000000-0000-4000-8000-000000000001", wordId: "11000000-0000-4000-8000-000000000001" },
  { videoId: "20000000-0000-4000-8000-000000000001", wordId: "11000000-0000-4000-8000-000000000002" },
  { videoId: "20000000-0000-4000-8000-000000000002", wordId: "11000000-0000-4000-8000-000000000003" },
  { videoId: "20000000-0000-4000-8000-000000000002", wordId: "11000000-0000-4000-8000-000000000004" },
  { videoId: "20000000-0000-4000-8000-000000000006", wordId: "11000000-0000-4000-8000-000000000005" },
  { videoId: "20000000-0000-4000-8000-000000000006", wordId: "11000000-0000-4000-8000-000000000006" },
  { videoId: "20000000-0000-4000-8000-000000000007", wordId: "11000000-0000-4000-8000-000000000007" },
  { videoId: "20000000-0000-4000-8000-000000000007", wordId: "11000000-0000-4000-8000-000000000008" },
  { videoId: "20000000-0000-4000-8000-000000000010", wordId: "11000000-0000-4000-8000-000000000009" },
  { videoId: "20000000-0000-4000-8000-000000000010", wordId: "11000000-0000-4000-8000-000000000010" },
  { videoId: "20000000-0000-4000-8000-000000000011", wordId: "11000000-0000-4000-8000-000000000011" },
  { videoId: "20000000-0000-4000-8000-000000000011", wordId: "11000000-0000-4000-8000-000000000012" },
  { videoId: "20000000-0000-4000-8000-000000000014", wordId: "11000000-0000-4000-8000-000000000013" },
  { videoId: "20000000-0000-4000-8000-000000000014", wordId: "11000000-0000-4000-8000-000000000014" },
  { videoId: "20000000-0000-4000-8000-000000000015", wordId: "11000000-0000-4000-8000-000000000015" },
  { videoId: "20000000-0000-4000-8000-000000000015", wordId: "11000000-0000-4000-8000-000000000016" },
  { videoId: "20000000-0000-4000-8000-000000000017", wordId: "11000000-0000-4000-8000-000000000017" },
  { videoId: "20000000-0000-4000-8000-000000000017", wordId: "11000000-0000-4000-8000-000000000018" },
  { videoId: "20000000-0000-4000-8000-000000000018", wordId: "11000000-0000-4000-8000-000000000019" },
  { videoId: "20000000-0000-4000-8000-000000000018", wordId: "11000000-0000-4000-8000-000000000020" },
  // Chunk 10: "journey" BİLİNÇLİ OLARAK ikinci bir videoya da bağlanıyor — MVP
  // kriteri #8'i ("aynı word birden fazla videoda senkron") gerçek cihazda
  // görsel olarak test edilebilsin diye. Kod tarafında bu zaten
  // use-saved-word-ids.test.ts'te unit test seviyesinde kanıtlı; bu sadece
  // gerçek cihaz smoke test'i için gözle görülür bir senaryo sağlıyor.
  { videoId: "20000000-0000-4000-8000-000000000002", wordId: "10000000-0000-4000-8000-000000000005" },
];

async function seed(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL tanımlı değil (.env dosyasını kontrol edin).");
  }

  const pool = new Pool({ connectionString: databaseUrl });
  const db = drizzle(pool);

  await db.insert(wordsTable).values(seedWords).onConflictDoNothing({ target: wordsTable.id });
  await db
    .insert(videoWordsTable)
    .values(seedVideoWords)
    .onConflictDoNothing({ target: [videoWordsTable.videoId, videoWordsTable.wordId] });
  await pool.end();

  console.log(
    `Seed tamamlandı: ${seedWords.length} kelime, ${seedVideoWords.length} video-kelime ilişkisi (idempotent).`,
  );
}

seed().catch((error: unknown) => {
  console.error("Seed başarısız:", error);
  process.exit(1);
});
