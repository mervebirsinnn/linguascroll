import type { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { eq } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import type { Pool } from "pg";
import request from "supertest";
import { AppModule } from "../app.module";
import { usersTable } from "../users/users.schema";
import { createTestDatabaseConnection, truncateTestTables } from "../videos/test-database";
import { userSavedWordsTable } from "./user-saved-words.schema";
import { wordsTable } from "./words.schema";

describe("PUT/DELETE /words/:wordId/saved (e2e, gerçek Postgres → WordsService → Controller → HTTP)", () => {
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

  async function createUser(): Promise<string> {
    const [user] = await db.insert(usersTable).values({}).returning();
    if (!user) throw new Error("Beklenen kullanıcı insert edilemedi");
    return user.id;
  }

  async function createWord(): Promise<string> {
    const [word] = await db.insert(wordsTable).values({ language: "en", lemma: "journey", gloss: "test gloss" }).returning();
    if (!word) throw new Error("Beklenen kelime insert edilemedi");
    return word.id;
  }

  it("malformed wordId için 400 döner", async () => {
    const response = await request(app.getHttpServer()).put("/words/not-a-uuid/saved").send({ userId: await createUser() });
    expect(response.status).toBe(400);
  });

  it("malformed body (userId yok/geçersiz) için 400 döner", async () => {
    const wordId = await createWord();
    const response = await request(app.getHttpServer()).put(`/words/${wordId}/saved`).send({ userId: "not-a-uuid" });
    expect(response.status).toBe(400);
  });

  it("var olmayan (ama geçerli UUID biçimli) userId için kontrollü 400 döner, 500 değil", async () => {
    const wordId = await createWord();
    const response = await request(app.getHttpServer())
      .put(`/words/${wordId}/saved`)
      .send({ userId: "00000000-0000-4000-8000-000000000099" });
    expect(response.status).toBe(400);
  });

  it("var olmayan (ama geçerli UUID biçimli) wordId için kontrollü 404 döner, 500 değil", async () => {
    const userId = await createUser();
    const response = await request(app.getHttpServer())
      .put("/words/00000000-0000-4000-8000-000000000099/saved")
      .send({ userId });
    expect(response.status).toBe(404);
  });

  it("save başarılı olur ve satır gerçekten DB'de oluşur", async () => {
    const userId = await createUser();
    const wordId = await createWord();

    const response = await request(app.getHttpServer()).put(`/words/${wordId}/saved`).send({ userId });
    expect(response.status).toBe(200);

    const rows = await db.select().from(userSavedWordsTable).where(eq(userSavedWordsTable.wordId, wordId));
    expect(rows).toHaveLength(1);
  });

  it("aynı save isteği iki kez (duplicate PUT) — ikincisi de 500 değil, başarılı; tek satır kalır", async () => {
    const userId = await createUser();
    const wordId = await createWord();

    const first = await request(app.getHttpServer()).put(`/words/${wordId}/saved`).send({ userId });
    const second = await request(app.getHttpServer()).put(`/words/${wordId}/saved`).send({ userId });
    expect(first.status).toBe(200);
    expect(second.status).toBe(200);

    const rows = await db.select().from(userSavedWordsTable).where(eq(userSavedWordsTable.wordId, wordId));
    expect(rows).toHaveLength(1);
  });

  it("unsave başarılı olur, satır DB'den silinir", async () => {
    const userId = await createUser();
    const wordId = await createWord();
    await request(app.getHttpServer()).put(`/words/${wordId}/saved`).send({ userId });

    const response = await request(app.getHttpServer()).delete(`/words/${wordId}/saved`).query({ userId });
    expect(response.status).toBe(200);

    const rows = await db.select().from(userSavedWordsTable).where(eq(userSavedWordsTable.wordId, wordId));
    expect(rows).toHaveLength(0);
  });

  it("hiç kaydedilmemiş bir kelimede unsave (idempotent no-op) — 500 değil, başarılı", async () => {
    const userId = await createUser();
    const wordId = await createWord();

    const response = await request(app.getHttpServer()).delete(`/words/${wordId}/saved`).query({ userId });
    expect(response.status).toBe(200);
  });
});
