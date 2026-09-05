import type { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { playableVideoSchema } from "@linguascroll/shared-types";
import { eq } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import type { Pool } from "pg";
import request from "supertest";
import { AppModule } from "../app.module";
import { usersTable } from "../users/users.schema";
import { createTestDatabaseConnection, truncateTestTables } from "./test-database";
import { videoWatchEventsTable } from "./video-watch-events.schema";
import { videosTable } from "./videos.schema";

describe("GET /videos (e2e, gerçek Postgres → Drizzle → Repository → Service → Controller → HTTP)", () => {
  let app: INestApplication;
  let db: NodePgDatabase;
  let pool: Pool;

  beforeAll(async () => {
    // process.env.DATABASE_URL'in TEST_DATABASE_URL'e köprülenmesi jest.setup.ts'te,
    // bu dosya (ve dolayısıyla AppModule) import edilmeden ÖNCE yapılıyor — bkz.
    // jest.setup.ts'teki gerekçe. Production kodu (AppModule/DatabaseModule)
    // TEST_DATABASE_URL'in varlığını hiç bilmiyor, sadece DATABASE_URL okuyor.
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
    // app.close(), main.ts'teki enableShutdownHooks() ile aynı zinciri tetikler:
    // DatabaseModule.onModuleDestroy() → pool.end(). Bu, Chunk 4A'da "gerçek
    // SIGTERM ile test edemedim" dediğimiz graceful shutdown'ı, farklı ama gerçek
    // bir yoldan otomatik olarak doğrular.
    await app.close();
  });

  it("DB boşken 200 [] döner", async () => {
    const response = await request(app.getHttpServer()).get("/videos");

    expect(response.status).toBe(200);
    expect(response.body).toEqual([]);
  });

  it("videoları PlayableVideo contract'ı ile döner, muxAssetId/createdAt sızdırmaz", async () => {
    // muxAssetId, resolvePlaybackUrl'ün TANIDIĞI bir değer olmak zorunda — bilinmeyen
    // bir muxAssetId artık (bilinçli olarak) fail-fast throw ediyor, sessizce
    // fallback'e düşmüyor. Bu yüzden gerçek mock eşlemesindeki bir id kullanıyoruz.
    await db.insert(videosTable).values({
      learningLanguage: "en",
      cefrLevel: "B1",
      muxAssetId: "mock-mux-asset-3",
      topic: "travel",
      durationMs: 5000,
    });

    const response = await request(app.getHttpServer()).get("/videos");
    expect(response.status).toBe(200);

    // 1) Contract validation: gerçek playableVideoSchema, elle yazılmış bir
    // assertion değil — üretim şemasının ta kendisi.
    const parsed = playableVideoSchema.array().parse(response.body);
    expect(parsed).toHaveLength(1);
    const [video] = parsed;
    if (!video) {
      throw new Error("Beklenen video bulunamadı");
    }
    expect(video.playbackUrl).toEqual(expect.any(String));
    expect(video.learningLanguage).toBe("en");
    expect(video.cefrLevel).toBe("B1");
    expect(video.topic).toBe("travel");
    expect(video.durationMs).toBe(5000);

    // 2) Internal-field leak protection: contract-validation'dan BAĞIMSIZ, explicit
    // property assertion. Şema'nın kendisi yarın yanlışlıkla muxAssetId/createdAt/
    // vocabulary eklerse, (1) bunu yakalamaz ama bu ikinci kontrol yine de patlar.
    for (const item of response.body as unknown[]) {
      expect(item).not.toHaveProperty("muxAssetId");
      expect(item).not.toHaveProperty("createdAt");
      expect(item).not.toHaveProperty("vocabulary");
    }
  });

  it("Chunk 9 review düzeltmesi: doğrudan /videos projeksiyonu SAHTE bir vocabulary alanı TAŞIMIYOR (VideosService vocabulary'den habersiz)", async () => {
    const [video] = await db
      .insert(videosTable)
      .values({ learningLanguage: "en", cefrLevel: "A1", muxAssetId: "mock-mux-asset-1", topic: "travel", durationMs: 1000 })
      .returning();
    if (!video) {
      throw new Error("Beklenen video insert edilemedi");
    }

    const response = await request(app.getHttpServer()).get("/videos");
    expect(response.status).toBe(200);

    // playableVideoSchema (base contract) vocabulary alanı tanımlamıyor — bu yüzden
    // response'ta fazladan bir `vocabulary` anahtarı varsa bile Zod onu sessizce
    // stripler; asıl kanıt HAM response body'de bu alanın hiç bulunmaması.
    const [rawVideo] = response.body as { vocabulary?: unknown }[];
    expect(rawVideo).not.toHaveProperty("vocabulary");
  });
});

describe("POST /videos/:videoId/watch-events (e2e, gerçek Postgres)", () => {
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
    const [user] = await db.insert(usersTable).values({}).returning();
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
      .send({ userId, watchedMs: 4200 });

    expect(response.status).toBe(201);

    const events = await db.select().from(videoWatchEventsTable).where(eq(videoWatchEventsTable.userId, userId));
    expect(events).toHaveLength(1);
    expect(events[0]?.videoId).toBe(videoId);
    expect(events[0]?.watchedMs).toBe(4200);
  });

  it("aynı video için iki ayrı exposure iki ayrı satır olarak kabul edilir", async () => {
    const videoId = await createVideo();
    const userId = await createUser();

    await request(app.getHttpServer()).post(`/videos/${videoId}/watch-events`).send({ userId, watchedMs: 1000 });
    await request(app.getHttpServer()).post(`/videos/${videoId}/watch-events`).send({ userId, watchedMs: 2000 });

    const events = await db.select().from(videoWatchEventsTable).where(eq(videoWatchEventsTable.userId, userId));
    expect(events).toHaveLength(2);
    expect(events.map((event) => event.watchedMs).sort()).toEqual([1000, 2000]);
  });

  it("malformed videoId (geçersiz UUID) için 400 döner", async () => {
    const userId = await createUser();

    const response = await request(app.getHttpServer())
      .post("/videos/not-a-uuid/watch-events")
      .send({ userId, watchedMs: 1000 });

    expect(response.status).toBe(400);
  });

  it("var olmayan videoId için 404 döner", async () => {
    const userId = await createUser();

    const response = await request(app.getHttpServer())
      .post("/videos/00000000-0000-4000-8000-000000000099/watch-events")
      .send({ userId, watchedMs: 1000 });

    expect(response.status).toBe(404);
  });

  it("malformed userId (geçersiz UUID) için 400 döner", async () => {
    const videoId = await createVideo();

    const response = await request(app.getHttpServer())
      .post(`/videos/${videoId}/watch-events`)
      .send({ userId: "not-a-uuid", watchedMs: 1000 });

    expect(response.status).toBe(400);
  });

  it("var olmayan (ama geçerli UUID biçimli) userId için kontrollü 400 döner, 500 değil", async () => {
    const videoId = await createVideo();

    const response = await request(app.getHttpServer())
      .post(`/videos/${videoId}/watch-events`)
      .send({ userId: "00000000-0000-4000-8000-000000000099", watchedMs: 1000 });

    expect(response.status).toBe(400);
  });
});
