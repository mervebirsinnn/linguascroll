import { eq } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import type { Pool } from "pg";
import { usersTable } from "../users/users.schema";
import { createTestDatabaseConnection, truncateTestTables } from "../videos/test-database";
import { QuizAnswerEventsRepository } from "./quiz-answer-events-repository";
import { quizAnswerEventsTable } from "./quiz-answer-events.schema";
import { quizOptionsTable, quizzesTable } from "./quizzes.schema";

describe("QuizAnswerEventsRepository / quiz_answer_events FK davranışı (integration, gerçek Postgres)", () => {
  let db: NodePgDatabase;
  let pool: Pool;
  let repository: QuizAnswerEventsRepository;

  beforeAll(() => {
    const connection = createTestDatabaseConnection();
    db = connection.db;
    pool = connection.pool;
    repository = new QuizAnswerEventsRepository(db);
  });

  beforeEach(async () => {
    await truncateTestTables(db);
  });

  afterAll(async () => {
    await pool.end();
  });

  async function createUser(): Promise<string> {
    const [user] = await db.insert(usersTable).values({}).returning();
    if (!user) throw new Error("Beklenen kullanıcı insert edilemedi");
    return user.id;
  }

  async function createQuizOption(): Promise<string> {
    const [quiz] = await db.insert(quizzesTable).values({ question: "test soru" }).returning();
    if (!quiz) throw new Error("Beklenen quiz insert edilemedi");
    const [option] = await db
      .insert(quizOptionsTable)
      .values({ quizId: quiz.id, text: "a", isCorrect: true, position: 0 })
      .returning();
    if (!option) throw new Error("Beklenen option insert edilemedi");
    return option.id;
  }

  it("record(), bir quiz-answer-event satırı insert eder", async () => {
    const userId = await createUser();
    const selectedOptionId = await createQuizOption();

    await repository.record({ userId, selectedOptionId, isCorrect: true });

    const events = await db.select().from(quizAnswerEventsTable).where(eq(quizAnswerEventsTable.userId, userId));
    expect(events).toHaveLength(1);
    expect(events[0]?.selectedOptionId).toBe(selectedOptionId);
    expect(events[0]?.isCorrect).toBe(true);
  });

  it("bir quiz_option'ı, ona ait answer-event varken silmeye çalışmak FK violation ile reddedilir (tarihsel isCorrect CASCADE ile kaybolmaz)", async () => {
    const userId = await createUser();
    const selectedOptionId = await createQuizOption();
    await repository.record({ userId, selectedOptionId, isCorrect: true });

    await expect(db.delete(quizOptionsTable).where(eq(quizOptionsTable.id, selectedOptionId))).rejects.toThrow();

    const events = await db
      .select()
      .from(quizAnswerEventsTable)
      .where(eq(quizAnswerEventsTable.selectedOptionId, selectedOptionId));
    expect(events).toHaveLength(1);
  });

  it("bir user silindiğinde kendi answer-event'leri CASCADE ile silinir", async () => {
    const userId = await createUser();
    const selectedOptionId = await createQuizOption();
    await repository.record({ userId, selectedOptionId, isCorrect: false });

    await db.delete(usersTable).where(eq(usersTable.id, userId));

    const events = await db.select().from(quizAnswerEventsTable).where(eq(quizAnswerEventsTable.userId, userId));
    expect(events).toHaveLength(0);
  });
});
