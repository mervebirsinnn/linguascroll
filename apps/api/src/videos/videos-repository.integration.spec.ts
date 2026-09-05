import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import type { Pool } from "pg";
import { createTestDatabaseConnection, truncateTestTables } from "./test-database";
import { VideosRepository } from "./videos-repository";
import { videosTable } from "./videos.schema";

describe("VideosRepository (integration, gerçek Postgres)", () => {
  let db: NodePgDatabase;
  let pool: Pool;
  let repository: VideosRepository;

  beforeAll(() => {
    const connection = createTestDatabaseConnection();
    db = connection.db;
    pool = connection.pool;
    repository = new VideosRepository(db);
  });

  beforeEach(async () => {
    // Her test bilinen, boş bir state'ten başlar — testler birbirine bağımlı değil.
    await truncateTestTables(db);
  });

  afterAll(async () => {
    // Bu testin kendi açtığı pool'u kendisi kapatıyor (dev seed script'iyle aynı
    // disiplin) — suite bittikten sonra asılı bağlantı kalmaz.
    await pool.end();
  });

  it("boş tabloda boş dizi döner (hata değil)", async () => {
    const videos = await repository.findVideos();
    expect(videos).toEqual([]);
  });

  it("DB satırını Video'ya dönüştürür ve createdAt'i domain modeline sızdırmaz", async () => {
    await db.insert(videosTable).values({
      learningLanguage: "en",
      cefrLevel: "A1",
      muxAssetId: "test-mux-asset",
      topic: "travel",
      durationMs: 1000,
    });

    const videos = await repository.findVideos();

    expect(videos).toHaveLength(1);
    const [video] = videos;
    if (!video) {
      throw new Error("Beklenen video bulunamadı");
    }

    expect(video.learningLanguage).toBe("en");
    expect(video.cefrLevel).toBe("A1");
    expect(video.muxAssetId).toBe("test-mux-asset");
    expect(video.topic).toBe("travel");
    expect(video.durationMs).toBe(1000);
    expect(typeof video.id).toBe("string");
    expect(video).not.toHaveProperty("createdAt");
  });

  it("findVideoById, var olan bir video için Video döner", async () => {
    const [inserted] = await db
      .insert(videosTable)
      .values({
        learningLanguage: "en",
        cefrLevel: "A1",
        muxAssetId: "test-mux-asset",
        topic: "travel",
        durationMs: 1000,
      })
      .returning();
    if (!inserted) {
      throw new Error("Beklenen video insert edilemedi");
    }

    const found = await repository.findVideoById(inserted.id);

    expect(found?.id).toBe(inserted.id);
    expect(found?.topic).toBe("travel");
  });

  it("findVideoById, var olmayan bir video için null döner", async () => {
    const found = await repository.findVideoById("00000000-0000-4000-8000-000000000099");
    expect(found).toBeNull();
  });

  it("DB, topic_check dışındaki bir topic değerini reddeder (Chunk 7 controlled taxonomy)", async () => {
    await expect(
      db.insert(videosTable).values({
        learningLanguage: "en",
        cefrLevel: "A1",
        muxAssetId: "test-mux-asset",
        // "greetings" artık geçerli bir topic değil — legacy vocabulary, migration'da
        // remap edildi (bkz. drizzle/0003_*.sql).
        topic: "greetings",
        durationMs: 1000,
      }),
    ).rejects.toThrow();
  });

  it("DB, duration_ms = 0'ı reddeder (Chunk 7: > 0 invariant)", async () => {
    await expect(
      db.insert(videosTable).values({
        learningLanguage: "en",
        cefrLevel: "A1",
        muxAssetId: "test-mux-asset",
        topic: "travel",
        durationMs: 0,
      }),
    ).rejects.toThrow();
  });
});
