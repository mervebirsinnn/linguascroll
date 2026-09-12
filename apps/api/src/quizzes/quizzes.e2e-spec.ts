import type { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { eq } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import type { Pool } from "pg";
import request from "supertest";
import { AppModule } from "../app.module";
import { createTestDatabaseConnection, truncateTestTables } from "../videos/test-database";
import { videoTranscriptSegmentsTable } from "../videos/transcript-segments.schema";
import { videosTable } from "../videos/videos.schema";
import { usersTable } from "../users/users.schema";
import { quizAnswerEventsTable } from "./quiz-answer-events.schema";
import { quizOptionsTable, quizzesTable } from "./quizzes.schema";

describe("POST /quizzes/:quizId/answer (e2e, gerçek Postgres)", () => {
  let app: INestApplication;
  let db: NodePgDatabase;
  let pool: Pool;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    await app.init();

    const connection = createTestDatabaseConnection();
    db = connection.db;
    pool = connection.pool;
  });

  beforeEach(async () => {
    await truncateTestTables(db);
  });

  afterAll(async () => {
    await pool.end();
    await app.close();
  });

  let nextMuxAssetId = 1;
  /**
   * Chunk 10 — quiz artık bir transcript segment'e (dolayısıyla bir videoya) bağlı olmak ZORUNDA.
   * Chunk 12: videos.mux_asset_id artık UNIQUE (bkz. videos.schema.ts) — bu
   * testte bu helper birden fazla kez çağrıldığı için sabit bir literal artık
   * çakışır, her çağrı kendi benzersiz id'sini üretmeli.
   */
  async function createSourceSegment(): Promise<string> {
    const [video] = await db
      .insert(videosTable)
      .values({ learningLanguage: "en", cefrLevel: "A1", muxAssetId: `mock-mux-asset-${nextMuxAssetId++}`, topic: "travel", durationMs: 1000 })
      .returning();
    if (!video) {
      throw new Error("Beklenen video insert edilemedi");
    }
    const [segment] = await db
      .insert(videoTranscriptSegmentsTable)
      .values({
        videoId: video.id,
        ordinal: 1,
        startMs: 0,
        endMs: 1000,
        text: "segment",
        englishExplanation: "english explanation",
        turkishExplanation: "türkçe açıklama",
      })
      .returning();
    if (!segment) {
      throw new Error("Beklenen transcript segment insert edilemedi");
    }
    return segment.id;
  }

  async function insertQuizWithOptions() {
    const sourceTranscriptSegmentId = await createSourceSegment();
    const [quiz] = await db.insert(quizzesTable).values({ question: "test soru", sourceTranscriptSegmentId }).returning();
    if (!quiz) {
      throw new Error("Beklenen quiz insert edilemedi");
    }
    const options = await db
      .insert(quizOptionsTable)
      .values([
        { quizId: quiz.id, text: "doğru", isCorrect: true, position: 0 },
        { quizId: quiz.id, text: "yanlış", isCorrect: false, position: 1 },
      ])
      .returning();
    return { quiz, options };
  }

  async function createUser(): Promise<string> {
    const [user] = await db.insert(usersTable).values({}).returning();
    if (!user) {
      throw new Error("Beklenen kullanıcı insert edilemedi");
    }
    return user.id;
  }

  it("doğru option için correct:true ve correctOptionId döner", async () => {
    const { quiz, options } = await insertQuizWithOptions();
    const correctOption = options.find((option) => option.isCorrect);
    if (!correctOption) {
      throw new Error("Beklenen doğru option bulunamadı");
    }
    const userId = await createUser();

    const response = await request(app.getHttpServer())
      .post(`/quizzes/${quiz.id}/answer`)
      .send({ optionId: correctOption.id, userId });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ correct: true, correctOptionId: correctOption.id });
  });

  it("yanlış option için correct:false ve doğru correctOptionId döner", async () => {
    const { quiz, options } = await insertQuizWithOptions();
    const wrongOption = options.find((option) => !option.isCorrect);
    const correctOption = options.find((option) => option.isCorrect);
    if (!wrongOption || !correctOption) {
      throw new Error("Beklenen option'lar bulunamadı");
    }
    const userId = await createUser();

    const response = await request(app.getHttpServer())
      .post(`/quizzes/${quiz.id}/answer`)
      .send({ optionId: wrongOption.id, userId });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ correct: false, correctOptionId: correctOption.id });
  });

  it("malformed quizId (geçersiz UUID) için 400 döner", async () => {
    const userId = await createUser();

    const response = await request(app.getHttpServer())
      .post("/quizzes/not-a-uuid/answer")
      .send({ optionId: "00000000-0000-4000-8000-000000000098", userId });

    expect(response.status).toBe(400);
  });

  it("var olmayan quiz için 404 döner", async () => {
    const userId = await createUser();

    const response = await request(app.getHttpServer())
      .post("/quizzes/00000000-0000-4000-8000-000000000099/answer")
      .send({ optionId: "00000000-0000-4000-8000-000000000098", userId });

    expect(response.status).toBe(404);
  });

  it("başka bir quiz'e ait optionId için 400 döner", async () => {
    const { quiz: quizA } = await insertQuizWithOptions();
    const { options: optionsB } = await insertQuizWithOptions();
    const optionFromB = optionsB[0];
    if (!optionFromB) {
      throw new Error("Beklenen option bulunamadı");
    }
    const userId = await createUser();

    const response = await request(app.getHttpServer())
      .post(`/quizzes/${quizA.id}/answer`)
      .send({ optionId: optionFromB.id, userId });

    expect(response.status).toBe(400);
  });

  it("geçersiz request body (eksik optionId/userId) için 400 döner", async () => {
    const { quiz } = await insertQuizWithOptions();

    const response = await request(app.getHttpServer()).post(`/quizzes/${quiz.id}/answer`).send({});

    expect(response.status).toBe(400);
  });

  it("malformed userId (geçersiz UUID) için 400 döner", async () => {
    const { quiz, options } = await insertQuizWithOptions();
    const correctOption = options.find((option) => option.isCorrect);
    if (!correctOption) {
      throw new Error("Beklenen doğru option bulunamadı");
    }

    const response = await request(app.getHttpServer())
      .post(`/quizzes/${quiz.id}/answer`)
      .send({ optionId: correctOption.id, userId: "not-a-uuid" });

    expect(response.status).toBe(400);
  });

  it("var olmayan (ama geçerli UUID biçimli) userId için kontrollü 400 döner, 500 değil", async () => {
    const { quiz, options } = await insertQuizWithOptions();
    const correctOption = options.find((option) => option.isCorrect);
    if (!correctOption) {
      throw new Error("Beklenen doğru option bulunamadı");
    }

    const response = await request(app.getHttpServer())
      .post(`/quizzes/${quiz.id}/answer`)
      .send({ optionId: correctOption.id, userId: "00000000-0000-4000-8000-000000000099" });

    expect(response.status).toBe(400);
  });

  it("doğru cevap quiz_answer_events'e is_correct:true ile yazılır", async () => {
    const { quiz, options } = await insertQuizWithOptions();
    const correctOption = options.find((option) => option.isCorrect);
    if (!correctOption) {
      throw new Error("Beklenen doğru option bulunamadı");
    }
    const userId = await createUser();

    await request(app.getHttpServer()).post(`/quizzes/${quiz.id}/answer`).send({ optionId: correctOption.id, userId });

    const [event] = await db.select().from(quizAnswerEventsTable).where(eq(quizAnswerEventsTable.userId, userId));
    expect(event).toBeDefined();
    expect(event?.selectedOptionId).toBe(correctOption.id);
    expect(event?.isCorrect).toBe(true);
  });

  it("yanlış cevap quiz_answer_events'e is_correct:false ile yazılır", async () => {
    const { quiz, options } = await insertQuizWithOptions();
    const wrongOption = options.find((option) => !option.isCorrect);
    if (!wrongOption) {
      throw new Error("Beklenen yanlış option bulunamadı");
    }
    const userId = await createUser();

    await request(app.getHttpServer()).post(`/quizzes/${quiz.id}/answer`).send({ optionId: wrongOption.id, userId });

    const [event] = await db.select().from(quizAnswerEventsTable).where(eq(quizAnswerEventsTable.userId, userId));
    expect(event).toBeDefined();
    expect(event?.selectedOptionId).toBe(wrongOption.id);
    expect(event?.isCorrect).toBe(false);
  });

  it("client'ın gönderdiği isCorrect alanı yok sayılır — server kendi hesabına göre kaydeder", async () => {
    const { quiz, options } = await insertQuizWithOptions();
    const wrongOption = options.find((option) => !option.isCorrect);
    if (!wrongOption) {
      throw new Error("Beklenen yanlış option bulunamadı");
    }
    const userId = await createUser();

    // Şema'da isCorrect diye bir alan hiç yok — burada göndersek bile zod bunu
    // sessizce eler, service'e hiç ulaşmaz. Yanlış bir option seçilmesine rağmen
    // client "isCorrect: true" iddia ediyor; server bunu yok sayıp kendi
    // hesapladığı false'u hem response'ta hem persisted event'te kullanmalı.
    const response = await request(app.getHttpServer())
      .post(`/quizzes/${quiz.id}/answer`)
      .send({ optionId: wrongOption.id, userId, isCorrect: true });

    expect(response.status).toBe(200);
    expect(response.body.correct).toBe(false);

    const [event] = await db.select().from(quizAnswerEventsTable).where(eq(quizAnswerEventsTable.userId, userId));
    expect(event?.isCorrect).toBe(false);
  });
});
