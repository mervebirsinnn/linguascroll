import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { quizOptionsTable, quizzesTable } from "./quizzes.schema";

/**
 * seed-videos.ts ile aynı desen: bağımsız script, DATABASE_URL'i doğrudan
 * process.env'den okur, migration'dan ayrı, elle çağrılır (`pnpm seed:quizzes`).
 * Idempotent: id'ler sabit veriliyor, ON CONFLICT (id) DO NOTHING.
 *
 * Kullanıcı kararı: Chunk 10'un TTS+waveform curated video quiz'leri
 * KALDIRILDI — feed artık SADECE Chunk 11'in gerçek videolarından üretilen
 * quiz'leri içeriyor (bkz. seed-videos.ts/seed-transcript-segments.ts'teki
 * aynı karar). `source_transcript_segment_id` NOT NULL olduğu için (Chunk 10
 * review kararı) her quiz hâlâ gerçek bir transcript segment'ine bağlı.
 */
const seedQuizzes = [
  {
    id: "63000000-0000-4000-8000-000000000001",
    question: "\"...but I'm actually looking forward to it.\" — 'looking forward to it' ifadesi ne anlama geliyor?",
    sourceTranscriptSegmentId: "61000000-0000-4000-8000-000000000007",
    options: [
      { id: "64000000-0000-4000-8000-000000000001", text: "Bir şeyden kaçınmak", isCorrect: false, position: 0 },
      { id: "64000000-0000-4000-8000-000000000002", text: "Bir şeyi dört gözle beklemek", isCorrect: true, position: 1 },
      { id: "64000000-0000-4000-8000-000000000003", text: "Bir şeyi unutmak", isCorrect: false, position: 2 },
      { id: "64000000-0000-4000-8000-000000000004", text: "Bir şeyden şüphe duymak", isCorrect: false, position: 3 },
    ],
  },
  {
    id: "63000000-0000-4000-8000-000000000002",
    question: "Complete the sentence: \"___ with your idea.\" (desteklediğini belirtmek için)",
    sourceTranscriptSegmentId: "61000000-0000-4000-8000-000000000011",
    options: [
      { id: "64000000-0000-4000-8000-000000000005", text: "I am agree", isCorrect: false, position: 0 },
      { id: "64000000-0000-4000-8000-000000000006", text: "I agree", isCorrect: true, position: 1 },
      { id: "64000000-0000-4000-8000-000000000007", text: "I does agree", isCorrect: false, position: 2 },
      { id: "64000000-0000-4000-8000-000000000008", text: "I having agree", isCorrect: false, position: 3 },
    ],
  },
  {
    id: "63000000-0000-4000-8000-000000000003",
    question: "\"Start with your background using the phrase, I'm originally from.\" — bu ifade ne için kullanılır?",
    sourceTranscriptSegmentId: "61000000-0000-4000-8000-000000000032",
    options: [
      { id: "64000000-0000-4000-8000-000000000009", text: "Şu an yaşadığın yeri söylemek için", isCorrect: false, position: 0 },
      { id: "64000000-0000-4000-8000-000000000010", text: "Aslen nereli olduğunu söylemek için", isCorrect: true, position: 1 },
      { id: "64000000-0000-4000-8000-000000000011", text: "Mesleğini söylemek için", isCorrect: false, position: 2 },
      { id: "64000000-0000-4000-8000-000000000012", text: "Yaşını söylemek için", isCorrect: false, position: 3 },
    ],
  },
  {
    id: "63000000-0000-4000-8000-000000000004",
    question: "Restoranda sipariş verirken 'I want' yerine hangisini kullanmak daha kibardır?",
    sourceTranscriptSegmentId: "61000000-0000-4000-8000-000000000042",
    options: [
      { id: "64000000-0000-4000-8000-000000000013", text: "I need", isCorrect: false, position: 0 },
      { id: "64000000-0000-4000-8000-000000000014", text: "Could I get", isCorrect: true, position: 1 },
      { id: "64000000-0000-4000-8000-000000000015", text: "Give me", isCorrect: false, position: 2 },
      { id: "64000000-0000-4000-8000-000000000016", text: "I must have", isCorrect: false, position: 3 },
    ],
  },

  // --- Chunk 11, 2. batch (11 yeni gerçek video) — ayrı id prefix (73000000-.../74000000-...) ---
  {
    id: "73000000-0000-4000-8000-000000000001",
    question: "\"He knows only three English words.\" — Bu cümleye göre köpek kaç İngilizce kelime biliyor?",
    sourceTranscriptSegmentId: "71000000-0000-4000-8000-000000000002",
    options: [
      { id: "74000000-0000-4000-8000-000000000001", text: "İki", isCorrect: false, position: 0 },
      { id: "74000000-0000-4000-8000-000000000002", text: "Üç", isCorrect: true, position: 1 },
      { id: "74000000-0000-4000-8000-000000000003", text: "Dört", isCorrect: false, position: 2 },
      { id: "74000000-0000-4000-8000-000000000004", text: "Hiç", isCorrect: false, position: 3 },
    ],
  },
  {
    id: "73000000-0000-4000-8000-000000000002",
    question: "\"Usually, they give you the first simple answer, I'm fine.\" — 'How are you?' sorusuna en hızlı ve yaygın cevap hangisidir?",
    sourceTranscriptSegmentId: "71000000-0000-4000-8000-000000000022",
    options: [
      { id: "74000000-0000-4000-8000-000000000005", text: "I'm fine", isCorrect: true, position: 0 },
      { id: "74000000-0000-4000-8000-000000000006", text: "My back hurts", isCorrect: false, position: 1 },
      { id: "74000000-0000-4000-8000-000000000007", text: "My cat is sick", isCorrect: false, position: 2 },
      { id: "74000000-0000-4000-8000-000000000008", text: "My socks are dirty", isCorrect: false, position: 3 },
    ],
  },
  {
    id: "73000000-0000-4000-8000-000000000003",
    question: "\"To order means to ask for food.\" — 'to order' ifadesi ne anlama gelir?",
    sourceTranscriptSegmentId: "71000000-0000-4000-8000-000000000043",
    options: [
      { id: "74000000-0000-4000-8000-000000000009", text: "Yemek yapmak", isCorrect: false, position: 0 },
      { id: "74000000-0000-4000-8000-000000000010", text: "Yemek istemek / sipariş etmek", isCorrect: true, position: 1 },
      { id: "74000000-0000-4000-8000-000000000011", text: "Yemek yemek", isCorrect: false, position: 2 },
      { id: "74000000-0000-4000-8000-000000000012", text: "Yemek pişirmek", isCorrect: false, position: 3 },
    ],
  },
  {
    id: "73000000-0000-4000-8000-000000000004",
    question: "\"Yellow plus blue makes green.\" — Sarı ve mavi karıştırılınca hangi renk elde edilir?",
    sourceTranscriptSegmentId: "71000000-0000-4000-8000-000000000064",
    options: [
      { id: "74000000-0000-4000-8000-000000000013", text: "Mor", isCorrect: false, position: 0 },
      { id: "74000000-0000-4000-8000-000000000014", text: "Turuncu", isCorrect: false, position: 1 },
      { id: "74000000-0000-4000-8000-000000000015", text: "Yeşil", isCorrect: true, position: 2 },
      { id: "74000000-0000-4000-8000-000000000016", text: "Kahverengi", isCorrect: false, position: 3 },
    ],
  },
  {
    id: "73000000-0000-4000-8000-000000000005",
    question: "\"Count means to say numbers.\" — 'count' fiili ne anlama gelir?",
    sourceTranscriptSegmentId: "71000000-0000-4000-8000-000000000083",
    options: [
      { id: "74000000-0000-4000-8000-000000000017", text: "Uyumak", isCorrect: false, position: 0 },
      { id: "74000000-0000-4000-8000-000000000018", text: "Sayı söylemek", isCorrect: true, position: 1 },
      { id: "74000000-0000-4000-8000-000000000019", text: "Koyun yetiştirmek", isCorrect: false, position: 2 },
      { id: "74000000-0000-4000-8000-000000000020", text: "Rüya görmek", isCorrect: false, position: 3 },
    ],
  },
  {
    id: "73000000-0000-4000-8000-000000000006",
    question: "\"On mute means no sound.\" — 'on mute' ifadesi ne anlama gelir?",
    sourceTranscriptSegmentId: "71000000-0000-4000-8000-000000000105",
    options: [
      { id: "74000000-0000-4000-8000-000000000021", text: "Ses açık", isCorrect: false, position: 0 },
      { id: "74000000-0000-4000-8000-000000000022", text: "Mikrofon kapalı, ses yok", isCorrect: true, position: 1 },
      { id: "74000000-0000-4000-8000-000000000023", text: "Bağlantı kesildi", isCorrect: false, position: 2 },
      { id: "74000000-0000-4000-8000-000000000024", text: "Kamera kapalı", isCorrect: false, position: 3 },
    ],
  },
  {
    id: "73000000-0000-4000-8000-000000000007",
    question: "\"I knead the dough until it feels smooth.\" — 'knead' fiili ne anlama gelir?",
    sourceTranscriptSegmentId: "71000000-0000-4000-8000-000000000123",
    options: [
      { id: "74000000-0000-4000-8000-000000000025", text: "Hamuru dinlendirmek", isCorrect: false, position: 0 },
      { id: "74000000-0000-4000-8000-000000000026", text: "Hamuru pişirmek", isCorrect: false, position: 1 },
      { id: "74000000-0000-4000-8000-000000000027", text: "Hamuru yoğurmak", isCorrect: true, position: 2 },
      { id: "74000000-0000-4000-8000-000000000028", text: "Hamuru kesmek", isCorrect: false, position: 3 },
    ],
  },
  {
    id: "73000000-0000-4000-8000-000000000008",
    question: "\"Practice makes perfect\" deyimi ne anlama gelir?",
    sourceTranscriptSegmentId: "71000000-0000-4000-8000-000000000143",
    options: [
      { id: "74000000-0000-4000-8000-000000000029", text: "Şans her şeyi belirler", isCorrect: false, position: 0 },
      { id: "74000000-0000-4000-8000-000000000030", text: "Tekrar tekrar pratik yapmak ustalık getirir", isCorrect: true, position: 1 },
      { id: "74000000-0000-4000-8000-000000000031", text: "Mükemmeliyet imkansızdır", isCorrect: false, position: 2 },
      { id: "74000000-0000-4000-8000-000000000032", text: "İlk deneme en iyisidir", isCorrect: false, position: 3 },
    ],
  },
  {
    id: "73000000-0000-4000-8000-000000000009",
    question: "\"Artificial intelligence feels like a double-edged sword.\" — bu deyim ne anlatır?",
    sourceTranscriptSegmentId: "71000000-0000-4000-8000-000000000161",
    options: [
      { id: "74000000-0000-4000-8000-000000000033", text: "Sadece faydalı olduğunu", isCorrect: false, position: 0 },
      { id: "74000000-0000-4000-8000-000000000034", text: "Hem faydalı hem tehlikeli olabileceğini", isCorrect: true, position: 1 },
      { id: "74000000-0000-4000-8000-000000000035", text: "Tamamen zararlı olduğunu", isCorrect: false, position: 2 },
      { id: "74000000-0000-4000-8000-000000000036", text: "Anlaşılması imkansız olduğunu", isCorrect: false, position: 3 },
    ],
  },
  {
    id: "73000000-0000-4000-8000-000000000010",
    question: "\"...deciding to turn over a new leaf.\" — 'turn over a new leaf' deyimi ne anlama gelir?",
    sourceTranscriptSegmentId: "71000000-0000-4000-8000-000000000181",
    options: [
      { id: "74000000-0000-4000-8000-000000000037", text: "Eski alışkanlıkları sürdürmek", isCorrect: false, position: 0 },
      { id: "74000000-0000-4000-8000-000000000038", text: "Yeni ve daha iyi bir başlangıç yapmak", isCorrect: true, position: 1 },
      { id: "74000000-0000-4000-8000-000000000039", text: "Bir yaprağı çevirmek (literal)", isCorrect: false, position: 2 },
      { id: "74000000-0000-4000-8000-000000000040", text: "Vazgeçmek", isCorrect: false, position: 3 },
    ],
  },
  {
    id: "73000000-0000-4000-8000-000000000011",
    question: "\"When you learn the ropes,...\" — 'learn the ropes' deyimi ne anlama gelir?",
    sourceTranscriptSegmentId: "71000000-0000-4000-8000-000000000206",
    options: [
      { id: "74000000-0000-4000-8000-000000000041", text: "Bir ipi bağlamayı öğrenmek", isCorrect: false, position: 0 },
      { id: "74000000-0000-4000-8000-000000000042", text: "Bir işi deneyimle öğrenmek", isCorrect: true, position: 1 },
      { id: "74000000-0000-4000-8000-000000000043", text: "Pes etmek", isCorrect: false, position: 2 },
      { id: "74000000-0000-4000-8000-000000000044", text: "Kuralları çiğnemek", isCorrect: false, position: 3 },
    ],
  },
];

async function seed(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL tanımlı değil (.env dosyasını kontrol edin).");
  }

  const pool = new Pool({ connectionString: databaseUrl });
  const db = drizzle(pool);

  for (const quiz of seedQuizzes) {
    await db
      .insert(quizzesTable)
      .values({ id: quiz.id, question: quiz.question, sourceTranscriptSegmentId: quiz.sourceTranscriptSegmentId })
      .onConflictDoNothing({ target: quizzesTable.id });

    await db
      .insert(quizOptionsTable)
      .values(quiz.options.map((option) => ({ ...option, quizId: quiz.id })))
      .onConflictDoNothing({ target: quizOptionsTable.id });
  }

  await pool.end();
  console.log(`Seed tamamlandı: ${seedQuizzes.length} quiz, her biri gerçek bir transcript segment'ine bağlı (idempotent).`);
}

seed().catch((error: unknown) => {
  console.error("Seed başarısız:", error);
  process.exit(1);
});
