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
