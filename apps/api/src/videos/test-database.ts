import { sql } from "drizzle-orm";
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

/**
 * Test infrastructure için TEK, dar amaçlı yardımcı. Generic bir "TestBase"/test
 * framework DEĞİL — videos VE quizzes feature'larının testlerinin (repository
 * integration + e2e) paylaştığı iki gerçek ihtiyacı izole ediyor: (a)
 * TEST_DATABASE_URL'i güvenli şekilde okumak, (b) her testten önce tabloları
 * temizlemek.
 *
 * DATABASE_URL'e ASLA fallback yapmaz. TEST_DATABASE_URL tanımlı değilse veya
 * veritabanı adı tam olarak "linguascroll_test" değilse fail-fast throw eder —
 * bu, destructive bir cleanup'ın (truncateTestTables) yanlışlıkla dev/prod DB'ye
 * karşı çalışmasını engelleyen tek, ucuz kontrol.
 */
export function getTestDatabaseUrl(): string {
  const testDatabaseUrl = process.env.TEST_DATABASE_URL;
  if (!testDatabaseUrl) {
    throw new Error(
      "TEST_DATABASE_URL tanımlı değil. Testler DATABASE_URL'e fallback yapmaz — " +
        "apps/api/.env.test dosyasını kontrol edin (bkz. .env.test.example).",
    );
  }

  const databaseName = new URL(testDatabaseUrl).pathname.replace(/^\//, "");
  if (databaseName !== "linguascroll_test") {
    throw new Error(
      `TEST_DATABASE_URL beklenmeyen bir veritabanına işaret ediyor: "${databaseName}". ` +
        'Destructive test cleanup sadece "linguascroll_test" veritabanına karşı çalışabilir.',
    );
  }

  return testDatabaseUrl;
}

export function createTestDatabaseConnection(): { db: NodePgDatabase; pool: Pool } {
  const pool = new Pool({ connectionString: getTestDatabaseUrl() });
  return { db: drizzle(pool), pool };
}

/**
 * Chunk 5 ile videos'un yanına quizzes/quiz_options eklendi, Chunk 6 ile
 * users/video_watch_events/quiz_answer_events, Chunk 9 ile words/video_words/
 * user_saved_words, Chunk 10 ile video_transcript_segments/
 * transcript_segment_learning_points — hepsi tek bir TRUNCATE ifadesinde
 * listeleniyor (Postgres, aynı ifadede listelenen FK'li tabloları CASCADE'e
 * gerek kalmadan birlikte temizler).
 */
export async function truncateTestTables(db: NodePgDatabase): Promise<void> {
  await db.execute(
    sql`TRUNCATE TABLE videos, quizzes, quiz_options, users, video_watch_events, quiz_answer_events, words, video_words, user_saved_words, video_transcript_segments, transcript_segment_learning_points`,
  );
}
