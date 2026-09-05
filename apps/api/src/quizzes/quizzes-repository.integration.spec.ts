import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import type { Pool } from "pg";
import { createTestDatabaseConnection, truncateTestTables } from "../videos/test-database";
import { QuizzesRepository } from "./quizzes-repository";
import { quizOptionsTable, quizzesTable } from "./quizzes.schema";

describe("QuizzesRepository (integration, gerçek Postgres)", () => {
  let db: NodePgDatabase;
  let pool: Pool;
  let repository: QuizzesRepository;

  beforeAll(() => {
    const connection = createTestDatabaseConnection();
    db = connection.db;
    pool = connection.pool;
    repository = new QuizzesRepository(db);
  });

  beforeEach(async () => {
    await truncateTestTables(db);
  });

  afterAll(async () => {
    await pool.end();
  });

  it("DB row'larını isCorrect DAHİL internal Quiz'e map eder, option'ları position'a göre sıralar", async () => {
    const [quiz] = await db.insert(quizzesTable).values({ question: "test soru" }).returning();
    if (!quiz) {
      throw new Error("Beklenen quiz insert edilemedi");
    }

    await db.insert(quizOptionsTable).values([
      { quizId: quiz.id, text: "ikinci", isCorrect: false, position: 1 },
      { quizId: quiz.id, text: "birinci", isCorrect: true, position: 0 },
    ]);

    const found = await repository.findQuizById(quiz.id);

    expect(found).not.toBeNull();
    expect(found?.question).toBe("test soru");
    expect(found?.options.map((option) => option.text)).toEqual(["birinci", "ikinci"]);
    expect(found?.options[0]?.isCorrect).toBe(true);
    expect(found?.options[1]?.isCorrect).toBe(false);
  });

  it("var olmayan quiz için null döner", async () => {
    const found = await repository.findQuizById("00000000-0000-4000-8000-000000000099");
    expect(found).toBeNull();
  });

  it("DB partial unique index, aynı quiz için iki doğru cevabı ENGELLER (en fazla bir garanti)", async () => {
    const [quiz] = await db.insert(quizzesTable).values({ question: "test soru" }).returning();
    if (!quiz) {
      throw new Error("Beklenen quiz insert edilemedi");
    }

    await db.insert(quizOptionsTable).values({ quizId: quiz.id, text: "a", isCorrect: true, position: 0 });

    await expect(
      db.insert(quizOptionsTable).values({ quizId: quiz.id, text: "b", isCorrect: true, position: 1 }),
    ).rejects.toThrow();
  });
});
