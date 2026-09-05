import type { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { feedPageSchema } from "@linguascroll/shared-types";
import { eq } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import type { Pool } from "pg";
import request from "supertest";
import { AppModule } from "../app.module";
import { usersTable } from "../users/users.schema";
import { createTestDatabaseConnection, truncateTestTables } from "../videos/test-database";
import { videoWatchEventsTable } from "../videos/video-watch-events.schema";
import { videosTable } from "../videos/videos.schema";
import { quizOptionsTable, quizzesTable } from "../quizzes/quizzes.schema";
import { videoWordsTable } from "../words/video-words.schema";
import { wordsTable } from "../words/words.schema";

describe("GET /feed (e2e, gerçek Postgres → Video/Quiz/Personalization Service → FeedService → Controller → HTTP)", () => {
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
    if (!user) {
      throw new Error("Beklenen kullanıcı insert edilemedi");
    }
    return user.id;
  }

  async function createVideo(topic: string, durationMs = 10000): Promise<string> {
    const [video] = await db
      .insert(videosTable)
      .values({ learningLanguage: "en", cefrLevel: "A1", muxAssetId: "mock-mux-asset-1", topic, durationMs })
      .returning();
    if (!video) {
      throw new Error("Beklenen video insert edilemedi");
    }
    return video.id;
  }

  async function createQuiz(question: string): Promise<void> {
    const [quiz] = await db.insert(quizzesTable).values({ question }).returning();
    if (!quiz) {
      throw new Error("Beklenen quiz insert edilemedi");
    }
    // findQuizFeed()/findQuizzesByIds() quiz_options ile INNER JOIN yapıyor —
    // option'sız bir quiz zaten answerable değil, bu yüzden feed'e hiç girmez.
    await db.insert(quizOptionsTable).values([
      { quizId: quiz.id, text: "doğru", isCorrect: true, position: 0 },
      { quizId: quiz.id, text: "yanlış", isCorrect: false, position: 1 },
    ]);
  }

  async function getFeed(userId: string, cursor?: string): Promise<request.Response> {
    return cursor
      ? request(app.getHttpServer()).get(`/feed?userId=${userId}&cursor=${encodeURIComponent(cursor)}`)
      : request(app.getHttpServer()).get(`/feed?userId=${userId}`);
  }

  it("malformed userId için 400 döner", async () => {
    const response = await request(app.getHttpServer()).get("/feed?userId=not-a-uuid");
    expect(response.status).toBe(400);
  });

  it("userId query param'ı hiç yoksa 400 döner", async () => {
    const response = await request(app.getHttpServer()).get("/feed");
    expect(response.status).toBe(400);
  });

  it("var olmayan (ama geçerli UUID biçimli) userId için kontrollü 400 döner, 500 değil", async () => {
    const response = await request(app.getHttpServer()).get("/feed?userId=00000000-0000-4000-8000-000000000099");
    expect(response.status).toBe(400);
  });

  it("DB'de video yokken, geçerli bir user için 200 {items:[], nextCursor:null} döner", async () => {
    const userId = await createUser();
    const response = await getFeed(userId);
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ items: [], nextCursor: null });
  });

  it("küçük katalog (tek sayfaya sığan) → ilk sayfada nextCursor null (bounded session'ın küçük katalogda doğru davranışı)", async () => {
    const userId = await createUser();
    await createVideo("travel");
    await createVideo("career");
    await createVideo("humor");

    const response = await getFeed(userId);
    const page = feedPageSchema.parse(response.body);
    expect(page.nextCursor).toBeNull();
    expect(page.items.length).toBeGreaterThan(0);
  });

  it("video ve quiz item'larını doğru contract ile döner; internal/persistence-only alanlar sızmaz", async () => {
    const userId = await createUser();
    // Interleave policy 3 video → 1 quiz — quiz'in feed'de gerçekten çıkması için
    // en az 3 video gerekiyor, tek video fixture'ı quiz'i asla tetiklemezdi.
    await db.insert(videosTable).values([
      { learningLanguage: "en", cefrLevel: "A1", muxAssetId: "mock-mux-asset-1", topic: "travel", durationMs: 1000 },
      { learningLanguage: "en", cefrLevel: "A1", muxAssetId: "mock-mux-asset-2", topic: "career", durationMs: 1000 },
      { learningLanguage: "en", cefrLevel: "A1", muxAssetId: "mock-mux-asset-3", topic: "humor", durationMs: 1000 },
    ]);
    await createQuiz("feed-e2e-question");

    const response = await getFeed(userId);
    expect(response.status).toBe(200);

    // 1) Contract validation: gerçek feedPageSchema.
    const page = feedPageSchema.parse(response.body);
    const videoItem = page.items.find((item) => item.type === "video");
    const quizItem = page.items.find((item) => item.type === "quiz");
    expect(videoItem).toBeDefined();
    expect(quizItem).toBeDefined();
    if (quizItem?.type === "quiz") {
      expect(quizItem.quiz.question).toBe("feed-e2e-question");
      expect(quizItem.quiz.options).toHaveLength(2);
    }

    // 2) Internal-field leak protection: contract-validation'dan BAĞIMSIZ, explicit
    // property assertion — video tarafında muxAssetId/createdAt VE personalization'ın
    // hiçbir internal metadata'sı (affinity/ranking/exploration), quiz tarafında
    // isCorrect hiçbir item'da olmamalı.
    const rawItems = (response.body as { items: { type: string; video?: object; quiz?: { options: object[] } }[] }).items;
    for (const item of rawItems) {
      if (item.type === "video") {
        expect(item.video).not.toHaveProperty("muxAssetId");
        expect(item.video).not.toHaveProperty("createdAt");
        expect(item.video).not.toHaveProperty("affinityScore");
        expect(item.video).not.toHaveProperty("rankingScore");
        expect(item.video).not.toHaveProperty("watchRatio");
        expect(item.video).not.toHaveProperty("explorationReason");
        expect(item.video).not.toHaveProperty("isExploration");
      }
      if (item.type === "quiz") {
        for (const option of item.quiz?.options ?? []) {
          expect(option).not.toHaveProperty("isCorrect");
        }
      }
    }
  });

  it("3 video : 1 quiz composition, personalization sonrası da korunuyor (regression)", async () => {
    const userId = await createUser();
    await db.insert(videosTable).values([
      { learningLanguage: "en", cefrLevel: "A1", muxAssetId: "mock-mux-asset-1", topic: "travel", durationMs: 1000 },
      { learningLanguage: "en", cefrLevel: "A1", muxAssetId: "mock-mux-asset-1", topic: "career", durationMs: 1000 },
      { learningLanguage: "en", cefrLevel: "A1", muxAssetId: "mock-mux-asset-1", topic: "humor", durationMs: 1000 },
      { learningLanguage: "en", cefrLevel: "A1", muxAssetId: "mock-mux-asset-1", topic: "lifestyle", durationMs: 1000 },
      { learningLanguage: "en", cefrLevel: "A1", muxAssetId: "mock-mux-asset-1", topic: "dating", durationMs: 1000 },
      { learningLanguage: "en", cefrLevel: "A1", muxAssetId: "mock-mux-asset-1", topic: "travel", durationMs: 1000 },
    ]);
    await createQuiz("q1");

    const response = await getFeed(userId);
    expect(response.status).toBe(200);

    const page = feedPageSchema.parse(response.body);
    expect(page.items.map((item) => item.type)).toEqual(["video", "video", "video", "quiz", "video", "video", "video"]);
  });

  it("personalized ranking: gerçek watch history'si travel'e yoğun olan kullanıcı feed'in başında travel görür", async () => {
    const userId = await createUser();
    const travelIds = [await createVideo("travel"), await createVideo("travel"), await createVideo("travel")];
    await createVideo("career");
    await createVideo("humor");

    // Her travel videosu için ~tam oranında (durationMs=10000, watchedMs=10000)
    // watch-event — güçlü, net bir travel affinity'si.
    for (const videoId of travelIds) {
      await db.insert(videoWatchEventsTable).values({ userId, videoId, watchedMs: 10000 });
    }

    const response = await getFeed(userId);
    const page = feedPageSchema.parse(response.body);
    const videoItems = page.items.filter((item) => item.type === "video");

    expect(videoItems[0]).toBeDefined();
    if (videoItems[0]?.type === "video") {
      expect(videoItems[0].video.topic).toBe("travel");
    }
  });

  it("feed response'unda aynı video id iki kez bulunmaz (global dedupe)", async () => {
    const userId = await createUser();
    await createVideo("travel");
    await createVideo("career");
    await createVideo("humor");
    await createVideo("lifestyle");
    await createVideo("dating");

    const response = await getFeed(userId);
    const page = feedPageSchema.parse(response.body);
    const videoIds = page.items.filter((item) => item.type === "video").map((item) => (item.type === "video" ? item.video.id : ""));

    expect(new Set(videoIds).size).toBe(videoIds.length);
  });

  describe("pagination (Chunk 8)", () => {
    /** 20 video (5 topic × 4), cold start (watch history yok) — MAX_SESSION_VIDEOS(27)'yi aşmadığı için tamamı tek session'da, 2 sayfaya yayılır. */
    async function seedMultiPageCatalog(): Promise<void> {
      const topics = ["travel", "career", "humor", "lifestyle", "dating"];
      for (const topic of topics) {
        for (let i = 0; i < 4; i += 1) {
          await createVideo(topic);
        }
      }
      for (let i = 0; i < 3; i += 1) {
        await createQuiz(`multi-page-q${i}`);
      }
    }

    it("continuation frozen order + gerçek HTTP: page1'in nextCursor'ıyla page2 deterministic şekilde devam eder", async () => {
      const userId = await createUser();
      await seedMultiPageCatalog();

      const page1Response = await getFeed(userId);
      const page1 = feedPageSchema.parse(page1Response.body);
      expect(page1.items).toHaveLength(12);
      expect(page1.nextCursor).not.toBeNull();

      const page2Response = await getFeed(userId, page1.nextCursor as string);
      const page2 = feedPageSchema.parse(page2Response.body);
      expect(page2.items.length).toBeGreaterThan(0);

      // Aynı cursor'la TEKRAR istek atmak birebir AYNI page2'yi üretmeli (frozen, deterministic).
      const page2Again = feedPageSchema.parse((await getFeed(userId, page1.nextCursor as string)).body);
      expect(page2Again).toEqual(page2);

      // page1 ve page2'deki video id'leri arasında hiç çakışma yok (global dedupe).
      const page1VideoIds = page1.items.filter((i) => i.type === "video").map((i) => (i.type === "video" ? i.video.id : ""));
      const page2VideoIds = page2.items.filter((i) => i.type === "video").map((i) => (i.type === "video" ? i.video.id : ""));
      expect(page1VideoIds.filter((id) => page2VideoIds.includes(id))).toEqual([]);
    });

    it("cursor userId mismatch → 400 (bir userId'nin cursor'ı başka bir userId ile devam ettirilemez)", async () => {
      const userIdA = await createUser();
      const userIdB = await createUser();
      await seedMultiPageCatalog();

      const page1 = feedPageSchema.parse((await getFeed(userIdA)).body);
      expect(page1.nextCursor).not.toBeNull();

      const response = await getFeed(userIdB, page1.nextCursor as string);
      expect(response.status).toBe(400);
    });

    it("tampered (bozulmuş) cursor → 400", async () => {
      const userId = await createUser();
      await seedMultiPageCatalog();
      const page1 = feedPageSchema.parse((await getFeed(userId)).body);
      const validCursor = page1.nextCursor as string;

      // İmza kısmını elle bozuyoruz — signature artık payload'la uyuşmuyor.
      const tamperedCursor = validCursor.slice(0, -4) + "XXXX";

      const response = await getFeed(userId, tamperedCursor);
      expect(response.status).toBe(400);
    });

    it("malformed cursor (rastgele bir string) → 400", async () => {
      const userId = await createUser();
      const response = await getFeed(userId, "this-is-not-a-real-cursor");
      expect(response.status).toBe(400);
    });

    it("session başladıktan sonra frozen bir video silinirse, sadece o slot atlanır — diğer item'lar aynen resolve olur", async () => {
      const userId = await createUser();
      await seedMultiPageCatalog();

      const page1 = feedPageSchema.parse((await getFeed(userId)).body);
      const cursorForPage2 = page1.nextCursor as string;

      const page2Before = feedPageSchema.parse((await getFeed(userId, cursorForPage2)).body);
      const videoItemToDelete = page2Before.items.find((item) => item.type === "video");
      if (!videoItemToDelete || videoItemToDelete.type !== "video") {
        throw new Error("Test kurgusu bozuk: page2'de silinecek bir video bulunamadı");
      }
      const deletedVideoId = videoItemToDelete.video.id;

      // Bu video'nun hiç watch-event'i yok (hiç izlenmedi) — FK bu silmeyi engellemez.
      await db.delete(videosTable).where(eq(videosTable.id, deletedVideoId));

      const page2After = feedPageSchema.parse((await getFeed(userId, cursorForPage2)).body);

      const afterIds = page2After.items.filter((i) => i.type === "video").map((i) => (i.type === "video" ? i.video.id : ""));
      expect(afterIds).not.toContain(deletedVideoId);

      // Silinen video HARİÇ, page2'nin geri kalan item'ları (sıraları dahil) aynen korunuyor.
      const beforeWithoutDeleted = page2Before.items.filter((item) => !(item.type === "video" && item.video.id === deletedVideoId));
      expect(page2After.items).toEqual(beforeWithoutDeleted);
    });
  });

  describe("vocabulary (Chunk 9)", () => {
    async function createWordForVideo(videoId: string, lemma: string): Promise<string> {
      const [word] = await db.insert(wordsTable).values({ language: "en", lemma, gloss: `${lemma} anlamı` }).returning();
      if (!word) {
        throw new Error("Beklenen kelime insert edilemedi");
      }
      await db.insert(videoWordsTable).values({ videoId, wordId: word.id });
      return word.id;
    }

    it("bir videonun küratörlü vocabulary'si feed response'una gömülü gelir, saved varsayılan false", async () => {
      const userId = await createUser();
      const videoId = await createVideo("travel");
      await createWordForVideo(videoId, "journey");

      const response = await getFeed(userId);
      const page = feedPageSchema.parse(response.body);
      const videoItem = page.items.find((item) => item.type === "video" && item.video.id === videoId);
      if (videoItem?.type !== "video") {
        throw new Error("Test kurgusu bozuk: video item bulunamadı");
      }

      expect(videoItem.video.vocabulary).toEqual([{ word: expect.objectContaining({ lemma: "journey" }), saved: false }]);
    });

    it("vocabulary'si olmayan bir video için boş dizi döner", async () => {
      const userId = await createUser();
      await createVideo("travel");

      const response = await getFeed(userId);
      const page = feedPageSchema.parse(response.body);
      const videoItem = page.items.find((item) => item.type === "video");
      if (videoItem?.type !== "video") {
        throw new Error("Test kurgusu bozuk");
      }
      expect(videoItem.video.vocabulary).toEqual([]);
    });

    it("save → sonraki GET /feed isteğinde aynı kelime saved=true görünür", async () => {
      const userId = await createUser();
      const videoId = await createVideo("travel");
      const wordId = await createWordForVideo(videoId, "journey");

      const saveResponse = await request(app.getHttpServer()).put(`/words/${wordId}/saved`).send({ userId });
      expect(saveResponse.status).toBe(200);

      const response = await getFeed(userId);
      const page = feedPageSchema.parse(response.body);
      const videoItem = page.items.find((item) => item.type === "video" && item.video.id === videoId);
      if (videoItem?.type !== "video") {
        throw new Error("Test kurgusu bozuk");
      }
      expect(videoItem.video.vocabulary[0]?.saved).toBe(true);
    });

    it("unsave → sonraki GET /feed isteğinde aynı kelime saved=false'a döner", async () => {
      const userId = await createUser();
      const videoId = await createVideo("travel");
      const wordId = await createWordForVideo(videoId, "journey");
      await request(app.getHttpServer()).put(`/words/${wordId}/saved`).send({ userId });

      const unsaveResponse = await request(app.getHttpServer()).delete(`/words/${wordId}/saved`).query({ userId });
      expect(unsaveResponse.status).toBe(200);

      const response = await getFeed(userId);
      const page = feedPageSchema.parse(response.body);
      const videoItem = page.items.find((item) => item.type === "video" && item.video.id === videoId);
      if (videoItem?.type !== "video") {
        throw new Error("Test kurgusu bozuk");
      }
      expect(videoItem.video.vocabulary[0]?.saved).toBe(false);
    });

    it("vocabulary sırası deterministic (lemma alfabetik) — regression: mevcut feed davranışı bozulmuyor", async () => {
      const userId = await createUser();
      const videoId = await createVideo("travel");
      await createWordForVideo(videoId, "zebra");
      await createWordForVideo(videoId, "apple");

      const response = await getFeed(userId);
      const page = feedPageSchema.parse(response.body);
      const videoItem = page.items.find((item) => item.type === "video" && item.video.id === videoId);
      if (videoItem?.type !== "video") {
        throw new Error("Test kurgusu bozuk");
      }
      expect(videoItem.video.vocabulary.map((v) => v.word.lemma)).toEqual(["apple", "zebra"]);
    });
  });
});
