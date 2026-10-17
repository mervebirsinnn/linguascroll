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
  describe("findVideos kategori predicate'i (feed kapsamı)", () => {
    const attribution = { title: "t", credit: "c", sourceUrl: "https://example.com/s", license: "CC BY 3.0", licenseUrl: "https://example.com/l", changes: "x" };
    let nextAsset = 1;
    async function insert(category: "general" | "animation" | "ielts"): Promise<void> {
      await db.insert(videosTable).values({
        learningLanguage: "en",
        cefrLevel: category === "ielts" ? "C1" : "A1",
        muxAssetId: `scope-asset-${nextAsset++}`,
        topic: "travel",
        durationMs: 1000,
        category,
        attribution: category === "animation" ? attribution : null,
      });
    }

    async function seedMixed(): Promise<void> {
      await insert("general");
      await insert("animation");
      await insert("animation");
      await insert("ielts");
      await insert("ielts");
      await insert("ielts");
    }

    it("category verilirse yalnızca o kategorinin satırları DÖNER (kapsam dışı satırlar application katmanına gelmez)", async () => {
      await seedMixed();
      expect((await repository.findVideos({ category: "ielts" })).map((v) => v.category)).toEqual(["ielts", "ielts", "ielts"]);
      expect((await repository.findVideos({ category: "animation" })).map((v) => v.category)).toEqual(["animation", "animation"]);
      expect((await repository.findVideos({ category: "general" })).map((v) => v.category)).toEqual(["general"]);
    });

    it("category verilmezse (feed 'all') predicate yoktur ve hepsi döner", async () => {
      await seedMixed();
      expect(await repository.findVideos()).toHaveLength(6);
      expect(await repository.findVideos({})).toHaveLength(6);
    });

    it("filtre SQL'de uygulanır: gönderilen sorguda kategori predicate'i var (JS tarafında süzme DEĞİL); 'all' sorgusunda yok", async () => {
      await seedMixed();
      const spy = jest.spyOn(pool, "query");
      let sqlTexts: string[];
      try {
        await repository.findVideos({ category: "ielts" });
        await repository.findVideos();
        // mockRestore() çağrı kayıtlarını SİLER: önce oku, sonra geri yükle.
        sqlTexts = spy.mock.calls.map((call) => {
          const first = call[0] as unknown;
          return typeof first === "string" ? first : String((first as { text?: string }).text ?? "");
        });
      } finally {
        spy.mockRestore();
      }
      const selects = sqlTexts.filter((text) => /from "videos"/i.test(text));
      expect(selects).toHaveLength(2);
      expect(selects[0]).toMatch(/where\s+"videos"\."category"\s*=\s*\$1/i);
      expect(selects[1]).not.toMatch(/where/i);
    });
  });
});
