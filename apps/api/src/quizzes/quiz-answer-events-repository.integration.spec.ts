import { eq } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import type { Pool } from "pg";
import { usersTable } from "../users/users.schema";
import { createTestDatabaseConnection, truncateTestTables } from "../videos/test-database";
import { videoTranscriptSegmentsTable } from "../videos/transcript-segments.schema";
import { videosTable } from "../videos/videos.schema";
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

  /** Chunk 10 — quiz artık bir transcript segment'e (dolayısıyla bir videoya) bağlı olmak ZORUNDA. */
  async function createSourceSegment(): Promise<string> {
    const [video] = await db
      .insert(videosTable)
      .values({ learningLanguage: "en", cefrLevel: "A1", muxAssetId: "mock-mux-asset-1", topic: "travel", durationMs: 1000 })
      .returning();
    if (!video) throw new Error("Beklenen video insert edilemedi");
    const [segment] = await db
      .insert(videoTranscriptSegmentsTable)
      .values({ videoId: video.id, ordinal: 1, startMs: 0, endMs: 1000, text: "segment", englishExplanation: "e", turkishExplanation: "t" })
      .returning();
    if (!segment) throw new Error("Beklenen transcript segment insert edilemedi");
    return segment.id;
  }

  async function createQuizOption(): Promise<string> {
    const sourceTranscriptSegmentId = await createSourceSegment();
    const [quiz] = await db.insert(quizzesTable).values({ question: "test soru", sourceTranscriptSegmentId }).returning();
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
