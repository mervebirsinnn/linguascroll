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
import { createTestDatabaseConnection, truncateTestTables } from "./test-database";
import { videoWatchEventsTable } from "./video-watch-events.schema";
import { videosTable } from "./videos.schema";

describe("/videos (e2e, gerçek Postgres → Drizzle → Repository → Service → Controller → HTTP)", () => {
  let app: INestApplication;
  let db: NodePgDatabase;
  let pool: Pool;

  beforeAll(async () => {
    // process.env.DATABASE_URL'in TEST_DATABASE_URL'e köprülenmesi jest.setup.ts'te,
    // bu dosya (ve dolayısıyla AppModule) import edilmeden ÖNCE yapılıyor — bkz.
    // jest.setup.ts'teki gerekçe. Production kodu (AppModule/DatabaseModule)
    // TEST_DATABASE_URL'in varlığını hiç bilmiyor, sadece DATABASE_URL okuyor.
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
    // app.close(), main.ts'teki enableShutdownHooks() ile aynı zinciri tetikler:
    // DatabaseModule.onModuleDestroy() → pool.end(). Bu, Chunk 4A'da "gerçek
    // SIGTERM ile test edemedim" dediğimiz graceful shutdown'ı, farklı ama gerçek
    // bir yoldan otomatik olarak doğrular.
    await app.close();
  });

  // 2026-10-27 — `GET /videos` KALDIRILDI: tüm kataloğu oynatılabilir URL'leriyle,
  // kimlik/hak kontrolü olmadan dönüyordu — ücretsiz hak sınırını tamamen deliyordu.
  // Mobile hiç kullanmıyordu (feed + playback-access kullanıyor). Bu test endpoint'in
  // yanlışlıkla geri gelmesini yakalar.
  it("GET /videos artık yok (404) — kataloğu URL'leriyle sızdıran endpoint kaldırıldı", async () => {
    await db.insert(videosTable).values({
      learningLanguage: "en",
      cefrLevel: "B1",
      muxAssetId: "local-ordering-food",
      topic: "travel",
      durationMs: 5000,
    });

    const response = await request(app.getHttpServer()).get("/videos");
    expect(response.status).toBe(404);
  });
});

describe("POST /videos/:videoId/watch-events (e2e, gerçek Postgres)", () => {
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

  async function createVideo(): Promise<string> {
    const [video] = await db
      .insert(videosTable)
      .values({
        learningLanguage: "en",
        cefrLevel: "A1",
        muxAssetId: "mock-mux-asset-1",
        topic: "travel",
        durationMs: 10000,
      })
      .returning();
    if (!video) {
      throw new Error("Beklenen video insert edilemedi");
    }
    return video.id;
  }

  async function createUser(): Promise<string> {
    // 2026-10-27 — firebase_uid = id: test token'ı (bearerFor(userId)) bu kullanıcıya çözülür.
    const id = randomUUID();
    const [user] = await db.insert(usersTable).values({ id, firebaseUid: id }).returning();
    if (!user) {
      throw new Error("Beklenen kullanıcı insert edilemedi");
    }
    return user.id;
  }

  it("geçerli videoId/userId için 201 döner ve watched_ms'i persist eder", async () => {
    const videoId = await createVideo();
    const userId = await createUser();

    const response = await request(app.getHttpServer())
      .post(`/videos/${videoId}/watch-events`)
      .set("Authorization", bearerFor(userId)).send({ watchedMs: 4200 });

    expect(response.status).toBe(201);

    const events = await db.select().from(videoWatchEventsTable).where(eq(videoWatchEventsTable.userId, userId));
    expect(events).toHaveLength(1);
    expect(events[0]?.videoId).toBe(videoId);
    expect(events[0]?.watchedMs).toBe(4200);
  });

  it("aynı video için iki ayrı exposure iki ayrı satır olarak kabul edilir", async () => {
    const videoId = await createVideo();
    const userId = await createUser();

    await request(app.getHttpServer()).post(`/videos/${videoId}/watch-events`).set("Authorization", bearerFor(userId)).send({ watchedMs: 1000 });
    await request(app.getHttpServer()).post(`/videos/${videoId}/watch-events`).set("Authorization", bearerFor(userId)).send({ watchedMs: 2000 });

    const events = await db.select().from(videoWatchEventsTable).where(eq(videoWatchEventsTable.userId, userId));
    expect(events).toHaveLength(2);
    expect(events.map((event) => event.watchedMs).sort()).toEqual([1000, 2000]);
  });

  it("malformed videoId (geçersiz UUID) için 400 döner", async () => {
    const userId = await createUser();

    const response = await request(app.getHttpServer())
      .post("/videos/not-a-uuid/watch-events")
      .set("Authorization", bearerFor(userId)).send({ watchedMs: 1000 });

    expect(response.status).toBe(400);
  });

  it("var olmayan videoId için 404 döner", async () => {
    const userId = await createUser();

    const response = await request(app.getHttpServer())
      .post("/videos/00000000-0000-4000-8000-000000000099/watch-events")
      .set("Authorization", bearerFor(userId)).send({ watchedMs: 1000 });

    expect(response.status).toBe(404);
  });

  // 2026-10-27 — kimlik body'den değil token'dan.
  it("token yoksa 401 döner ve hiçbir satır yazılmaz", async () => {
    const videoId = await createVideo();

    const response = await request(app.getHttpServer()).post(`/videos/${videoId}/watch-events`).send({ watchedMs: 1000 });

    expect(response.status).toBe(401);
    expect(await db.select().from(videoWatchEventsTable)).toHaveLength(0);
  });

  it("body'deki userId yok sayılır: olay token sahibine yazılır, başka kullanıcıya değil", async () => {
    const videoId = await createVideo();
    const owner = await createUser();
    const other = await createUser();

    const response = await request(app.getHttpServer())
      .post(`/videos/${videoId}/watch-events`)
      .set("Authorization", bearerFor(owner))
      .send({ userId: other, watchedMs: 1000 });

    expect(response.status).toBe(201);
    expect(await db.select().from(videoWatchEventsTable).where(eq(videoWatchEventsTable.userId, other))).toHaveLength(0);
    expect(await db.select().from(videoWatchEventsTable).where(eq(videoWatchEventsTable.userId, owner))).toHaveLength(1);
  });
});
