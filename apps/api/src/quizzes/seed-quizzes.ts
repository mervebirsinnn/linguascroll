import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { quizOptionsTable, quizzesTable } from "./quizzes.schema";

/**
 * seed-videos.ts ile aynı desen: bağımsız script, DATABASE_URL'i doğrudan
 * process.env'den okur, migration'dan ayrı, elle çağrılır (`pnpm seed:quizzes`).
 * Idempotent: id'ler sabit veriliyor (DB-generated default bypass edilir),
 * quizzes.id ve quiz_options.id zaten PRIMARY KEY olduğu için
 * ON CONFLICT (id) DO NOTHING yeni bir constraint gerektirmeden çalışır.
 */
const seedQuizzes = [
  {
    id: "c44f50da-a8be-4333-b25f-e68a9e927d8c",
    question: "'Merhaba' kelimesinin İngilizcesi nedir?",
    options: [
      { id: "57f2bc51-a9d5-44fe-a346-390c72f2efd6", text: "Hello", isCorrect: true, position: 0 },
      { id: "e08f1efb-0c1d-4580-b6a2-9b94a9794b50", text: "Goodbye", isCorrect: false, position: 1 },
      { id: "ea34acaf-9e4b-4653-a3da-007f44dcaca6", text: "Please", isCorrect: false, position: 2 },
      { id: "ab036621-b03c-4969-a8c0-4dbf23e57ef6", text: "Thanks", isCorrect: false, position: 3 },
    ],
  },
  {
    id: "5c79d372-3432-442a-9a33-beb2c79d9c9f",
    question: "Which word means 'teşekkür ederim'?",
    options: [
      { id: "24bfe6d1-f19b-4851-9168-edaa953d5520", text: "Sorry", isCorrect: false, position: 0 },
      { id: "e3f11d6d-5e8e-4d65-bcc0-e63e2790c556", text: "Thank you", isCorrect: true, position: 1 },
      { id: "10642ccc-568f-48cb-b920-f374d794e14b", text: "Hello", isCorrect: false, position: 2 },
      { id: "1e451ba0-10d9-4e7d-bc91-324cdac61674", text: "Yes", isCorrect: false, position: 3 },
    ],
  },
  // --- Chunk 10 (MVP stabilization): 24 videoluk genişletilmiş katalogda 3:1
  // composition'ın quiz havuzunu tüketmemesi için (24/3=8 quiz slot'u) yeterli quiz. ---
  {
    id: "30000000-0000-4000-8000-000000000001",
    question: "Which word means 'uçuş gecikmesi' (havaalanında)?",
    options: [
      { id: "31000000-0000-4000-8000-000000000001", text: "Delay", isCorrect: true, position: 0 },
      { id: "31000000-0000-4000-8000-000000000002", text: "Departure", isCorrect: false, position: 1 },
      { id: "31000000-0000-4000-8000-000000000003", text: "Luggage", isCorrect: false, position: 2 },
      { id: "31000000-0000-4000-8000-000000000004", text: "Ticket", isCorrect: false, position: 3 },
    ],
  },
  {
    id: "30000000-0000-4000-8000-000000000002",
    question: "'Maaş' kelimesinin İngilizcesi nedir?",
    options: [
      { id: "31000000-0000-4000-8000-000000000005", text: "Interview", isCorrect: false, position: 0 },
      { id: "31000000-0000-4000-8000-000000000006", text: "Salary", isCorrect: true, position: 1 },
      { id: "31000000-0000-4000-8000-000000000007", text: "Deadline", isCorrect: false, position: 2 },
      { id: "31000000-0000-4000-8000-000000000008", text: "Resign", isCorrect: false, position: 3 },
    ],
  },
  {
    id: "30000000-0000-4000-8000-000000000003",
    question: "Which word describes a joke that plays on the multiple meanings of a word?",
    options: [
      { id: "31000000-0000-4000-8000-000000000009", text: "Sarcasm", isCorrect: false, position: 0 },
      { id: "31000000-0000-4000-8000-000000000010", text: "Pun", isCorrect: true, position: 1 },
      { id: "31000000-0000-4000-8000-000000000011", text: "Comedian", isCorrect: false, position: 2 },
      { id: "31000000-0000-4000-8000-000000000012", text: "Prank", isCorrect: false, position: 3 },
    ],
  },
  {
    id: "30000000-0000-4000-8000-000000000004",
    question: "'Farkındalık/bilinçli hareket etme' anlamına gelen kelime hangisi?",
    options: [
      { id: "31000000-0000-4000-8000-000000000013", text: "Workout", isCorrect: false, position: 0 },
      { id: "31000000-0000-4000-8000-000000000014", text: "Mindfulness", isCorrect: true, position: 1 },
      { id: "31000000-0000-4000-8000-000000000015", text: "Routine", isCorrect: false, position: 2 },
      { id: "31000000-0000-4000-8000-000000000016", text: "Habit", isCorrect: false, position: 3 },
    ],
  },
  {
    id: "30000000-0000-4000-8000-000000000005",
    question: "Which word means 'ayrılık' (bir ilişkinin bitmesi)?",
    options: [
      { id: "31000000-0000-4000-8000-000000000017", text: "Crush", isCorrect: false, position: 0 },
      { id: "31000000-0000-4000-8000-000000000018", text: "Breakup", isCorrect: true, position: 1 },
      { id: "31000000-0000-4000-8000-000000000019", text: "Date", isCorrect: false, position: 2 },
      { id: "31000000-0000-4000-8000-000000000020", text: "Relationship", isCorrect: false, position: 3 },
    ],
  },
  {
    id: "30000000-0000-4000-8000-000000000006",
    question: "'Bavul/bagaj' kelimesinin İngilizcesi nedir?",
    options: [
      { id: "31000000-0000-4000-8000-000000000021", text: "Passport", isCorrect: false, position: 0 },
      { id: "31000000-0000-4000-8000-000000000022", text: "Luggage", isCorrect: true, position: 1 },
      { id: "31000000-0000-4000-8000-000000000023", text: "Itinerary", isCorrect: false, position: 2 },
      { id: "31000000-0000-4000-8000-000000000024", text: "Journey", isCorrect: false, position: 3 },
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
      .values({ id: quiz.id, question: quiz.question })
      .onConflictDoNothing({ target: quizzesTable.id });

    await db
      .insert(quizOptionsTable)
      .values(quiz.options.map((option) => ({ ...option, quizId: quiz.id })))
      .onConflictDoNothing({ target: quizOptionsTable.id });
  }

  await pool.end();
  console.log(`Seed tamamlandı: ${seedQuizzes.length} quiz (idempotent — zaten var olanlar atlandı).`);
}

seed().catch((error: unknown) => {
  console.error("Seed başarısız:", error);
  process.exit(1);
});
