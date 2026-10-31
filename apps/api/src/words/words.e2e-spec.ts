import { randomUUID } from "node:crypto";
import type { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { eq } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import type { Pool } from "pg";
import request from "supertest";
import { AppModule } from "../app.module";
import { bearerFor, withTestAuth } from "../auth/test-auth";
import { usersTable } from "../users/users.schema";
import { createTestDatabaseConnection, truncateTestTables } from "../videos/test-database";
import { videoTranscriptSegmentsTable } from "../videos/transcript-segments.schema";
import { videosTable } from "../videos/videos.schema";
import { segmentWordGlossesTable } from "./segment-word-glosses.schema";
import { userSavedWordsTable } from "./user-saved-words.schema";
import { wordsTable } from "./words.schema";

describe("PUT/DELETE /words/:wordId/saved (e2e, gerçek Postgres → WordsService → Controller → HTTP)", () => {
  let app: INestApplication;
  let db: NodePgDatabase;
  let pool: Pool;

  beforeAll(async () => {
    const moduleRef = await withTestAuth(Test.createTestingModule({ imports: [AppModule] })).compile();
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

  async function createUser(): Promise<string> {
    // 2026-10-27 — firebase_uid = id: test token'ı (bearerFor(userId)) bu kullanıcıya çözülür.
    const id = randomUUID();
    const [user] = await db.insert(usersTable).values({ id, firebaseUid: id }).returning();
    if (!user) throw new Error("Beklenen kullanıcı insert edilemedi");
    return user.id;
  }

  async function createWord(): Promise<string> {
    const [word] = await db.insert(wordsTable).values({ language: "en", lemma: "journey", gloss: "test gloss" }).returning();
    if (!word) throw new Error("Beklenen kelime insert edilemedi");
    return word.id;
  }

  it("malformed wordId için 400 döner", async () => {
    const userId = await createUser();
    const response = await request(app.getHttpServer()).put("/words/not-a-uuid/saved").set("Authorization", bearerFor(userId)).send({});
    expect(response.status).toBe(400);
  });

  it("malformed body (geçersiz sourceSegmentId) için 400 döner", async () => {
    const wordId = await createWord();
    const userId = await createUser();
    const response = await request(app.getHttpServer()).put(`/words/${wordId}/saved`).set("Authorization", bearerFor(userId)).send({ sourceSegmentId: "not-a-uuid" });
    expect(response.status).toBe(400);
  });

  // 2026-10-27 — kimlik body/query'den değil token'dan.
  it("token yoksa kaydetme/silme 401 döner; body'deki userId ile başkası adına işlem yapılamaz", async () => {
    const wordId = await createWord();
    const victim = await createUser();
    expect((await request(app.getHttpServer()).put(`/words/${wordId}/saved`).send({ userId: victim })).status).toBe(401);
    expect((await request(app.getHttpServer()).delete(`/words/${wordId}/saved`).query({ userId: victim })).status).toBe(401);
  });

  it("var olmayan (ama geçerli UUID biçimli) wordId için kontrollü 404 döner, 500 değil", async () => {
    const userId = await createUser();
    const response = await request(app.getHttpServer())
      .put("/words/00000000-0000-4000-8000-000000000099/saved")
      .set("Authorization", bearerFor(userId)).send({});
    expect(response.status).toBe(404);
  });

  it("save başarılı olur ve satır gerçekten DB'de oluşur", async () => {
    const userId = await createUser();
    const wordId = await createWord();

    const response = await request(app.getHttpServer()).put(`/words/${wordId}/saved`).set("Authorization", bearerFor(userId)).send({});
    expect(response.status).toBe(200);

    const rows = await db.select().from(userSavedWordsTable).where(eq(userSavedWordsTable.wordId, wordId));
    expect(rows).toHaveLength(1);
  });

  it("aynı save isteği iki kez (duplicate PUT) — ikincisi de 500 değil, başarılı; tek satır kalır", async () => {
    const userId = await createUser();
    const wordId = await createWord();

    const first = await request(app.getHttpServer()).put(`/words/${wordId}/saved`).set("Authorization", bearerFor(userId)).send({});
    const second = await request(app.getHttpServer()).put(`/words/${wordId}/saved`).set("Authorization", bearerFor(userId)).send({});
    expect(first.status).toBe(200);
    expect(second.status).toBe(200);

    const rows = await db.select().from(userSavedWordsTable).where(eq(userSavedWordsTable.wordId, wordId));
    expect(rows).toHaveLength(1);
  });

  it("unsave başarılı olur, satır DB'den silinir", async () => {
    const userId = await createUser();
    const wordId = await createWord();
    await request(app.getHttpServer()).put(`/words/${wordId}/saved`).set("Authorization", bearerFor(userId)).send({});

    const response = await request(app.getHttpServer()).delete(`/words/${wordId}/saved`).set("Authorization", bearerFor(userId));
    expect(response.status).toBe(200);

    const rows = await db.select().from(userSavedWordsTable).where(eq(userSavedWordsTable.wordId, wordId));
    expect(rows).toHaveLength(0);
  });

  it("hiç kaydedilmemiş bir kelimede unsave (idempotent no-op) — 500 değil, başarılı", async () => {
    const userId = await createUser();
    const wordId = await createWord();

    const response = await request(app.getHttpServer()).delete(`/words/${wordId}/saved`).set("Authorization", bearerFor(userId));
    expect(response.status).toBe(200);
  });
});

describe("GET /words/glosses (e2e, gerçek Postgres → WordGlossesService → Controller → HTTP)", () => {
  let app: INestApplication;
  let db: NodePgDatabase;
  let pool: Pool;

  beforeAll(async () => {
    const moduleRef = await withTestAuth(Test.createTestingModule({ imports: [AppModule] })).compile();
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

  it("malformed videoId için 400 döner", async () => {
    const response = await request(app.getHttpServer()).get("/words/glosses?videoId=not-a-uuid");
    expect(response.status).toBe(400);
  });

  it("videoId yoksa 400 döner", async () => {
    const response = await request(app.getHttpServer()).get("/words/glosses");
    expect(response.status).toBe(400);
  });

  it("anlamı olmayan (veya var olmayan) video için 200 ve boş obje döner", async () => {
    const response = await request(app.getHttpServer()).get("/words/glosses?videoId=00000000-0000-4000-8000-000000000009");
    expect(response.status).toBe(200);
    expect(response.body).toEqual({});
  });

  it("üretilmiş anlamları segmentId -> kelime -> anlam olarak döner", async () => {
    const [video] = await db
      .insert(videosTable)
      .values({ learningLanguage: "en", cefrLevel: "A1", muxAssetId: "mock-glosses-e2e", topic: "travel", durationMs: 60000 })
      .returning();
    const [segment] = await db
      .insert(videoTranscriptSegmentsTable)
      .values({ videoId: video!.id, ordinal: 1, startMs: 0, endMs: 500, text: "home", englishExplanation: "e", turkishExplanation: "t" })
      .returning({ id: videoTranscriptSegmentsTable.id });
    await db.insert(segmentWordGlossesTable).values({ segmentId: segment!.id, word: "home", gloss: "ev" });

    const response = await request(app.getHttpServer()).get(`/words/glosses?videoId=${video!.id}`);
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ [segment!.id]: { home: "ev" } });
  });
});
