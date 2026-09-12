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
import { transcriptSegmentLearningPointsTable } from "../videos/transcript-segment-learning-points.schema";
import { videoTranscriptSegmentsTable } from "../videos/transcript-segments.schema";
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

  let nextMuxAssetId = 1;
  // Chunk 12: videos.mux_asset_id artık UNIQUE (bkz. videos.schema.ts) — bu
  // testte createVideo() birden fazla kez çağrıldığı için sabit bir literal
  // artık çakışır, her çağrı kendi benzersiz id'sini üretmeli.
  async function createVideo(topic: string, durationMs = 10000): Promise<string> {
    const [video] = await db
      .insert(videosTable)
      .values({ learningLanguage: "en", cefrLevel: "A1", muxAssetId: `local-working-out-again-${nextMuxAssetId++}`, topic, durationMs })
      .returning();
    if (!video) {
      throw new Error("Beklenen video insert edilemedi");
    }
    return video.id;
  }

  /** Chunk 10 — bir segment yoksa quiz artık var olamaz (source_transcript_segment_id NOT NULL). */
  async function createSegment(videoId: string, ordinal = 1): Promise<string> {
    const [segment] = await db
      .insert(videoTranscriptSegmentsTable)
      .values({
        videoId,
        ordinal,
        startMs: 0,
        endMs: 1000,
        text: `segment-${ordinal}`,
        englishExplanation: "english explanation",
        turkishExplanation: "türkçe açıklama",
      })
      .returning();
    if (!segment) {
      throw new Error("Beklenen transcript segment insert edilemedi");
    }
    return segment.id;
  }

  /**
   * Chunk 10 — quiz artık HANGİ videodan geldiğini (segment üzerinden) taşımak
   * zorunda: `videoId` parametresi bu yüzden zorunlu (eski generic/video-bağımsız
   * quiz artık DB seviyesinde imkansız).
   */
  async function createQuiz(question: string, videoId: string): Promise<void> {
    const segmentId = await createSegment(videoId);
    const [quiz] = await db.insert(quizzesTable).values({ question, sourceTranscriptSegmentId: segmentId }).returning();
    if (!quiz) {
      throw new Error("Beklenen quiz insert edilemedi");
    }
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

  async function getFeedWithPreference(userId: string, level?: string, topics?: string): Promise<request.Response> {
    const params = new URLSearchParams({ userId });
    if (level) params.set("level", level);
    if (topics) params.set("topics", topics);
    return request(app.getHttpServer()).get(`/feed?${params.toString()}`);
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
    // Interleave policy (Chunk 14) 4 video → 1 quiz — quiz'in feed'de gerçekten
    // çıkması için hem 4 video (bir grup tamamlanmalı) HEM de quiz'in o gruptaki
    // bir videodan kaynaklanması gerekiyor (source-matching, bkz. feed.service.ts).
    const [_videoId1, _videoId2, _videoId3, videoId4] = await Promise.all([
      createVideo("travel"),
      createVideo("career"),
      createVideo("humor"),
      createVideo("lifestyle"),
    ]);
    await createQuiz("feed-e2e-question", videoId4);

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

  it("4 video : 1 quiz composition (Chunk 14), personalization sonrası da korunuyor (regression)", async () => {
    const userId = await createUser();
    // BEŞ FARKLI topic (her biri bir video) — PersonalizationRepository cold-start
    // için COLD_START_TOPIC_ORDER'ı (travel,lifestyle,humor,career,dating) izliyor
    // (bkz. personalization-ranking.ts); aynı topic'ten iki video olsaydı aralarındaki
    // sıra video.id'ye (rastgele UUID) göre belirlenirdi — bu testin "hangi video
    // hangi grupta" iddiasını rastgeleliğe bağımlı kılardı. Farklı topic'lerle final
    // sıra TAM olarak deterministic: travel, lifestyle, humor, career, dating.
    const travelId = await createVideo("travel");
    await createVideo("lifestyle");
    await createVideo("humor");
    await createVideo("career");
    await createVideo("dating");
    // Quiz SADECE travel videosuna (grubun İLK, dördüncü değil, videosuna) bağlı
    // — (travel,lifestyle,humor,career) grubu tamamlanınca geriye doğru arama
    // travel'i bulup eşleştirmeli; dating tek başına kalan (eksik) grup, quiz'siz.
    await createQuiz("q1", travelId);

    const response = await getFeed(userId);
    expect(response.status).toBe(200);

    const page = feedPageSchema.parse(response.body);
    expect(page.items.map((item) => item.type)).toEqual(["video", "video", "video", "video", "quiz", "video"]);
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
    /**
     * 20 video (5 topic × 4), cold start (watch history yok) — MAX_SESSION_VIDEOS(27)'yi
     * aşmadığı için tamamı tek session'da, 2 sayfaya yayılır. Quiz BİLİNÇLİ OLARAK
     * YOK — bu describe bloğu sadece VİDEO pagination/dedupe/cursor davranışını
     * doğruluyor, quiz-source-matching'in kendi testleri yukarıda ayrı.
     */
    async function seedMultiPageCatalog(): Promise<void> {
      const topics = ["travel", "career", "humor", "lifestyle", "dating"];
      for (const topic of topics) {
        for (let i = 0; i < 4; i += 1) {
          await createVideo(topic);
        }
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

  describe("transcript segments (Chunk 10)", () => {
    it("bir videonun transcript segment'i (learning point dahil) feed response'una gömülü gelir", async () => {
      const userId = await createUser();
      const videoId = await createVideo("travel");
      const segmentId = await createSegment(videoId);
      await db.insert(transcriptSegmentLearningPointsTable).values({
        transcriptSegmentId: segmentId,
        type: "phrase",
        expression: "ended up + V-ing",
        englishExplanation: "reaching an unplanned result",
        turkishExplanation: "beklenmedik bir sonuca ulaşmak",
        exampleEn: "I ended up working late.",
        exampleTr: "Sonunda geç saate kadar çalıştım.",
        ordinal: 1,
      });

      const response = await getFeed(userId);
      const page = feedPageSchema.parse(response.body);
      const videoItem = page.items.find((item) => item.type === "video" && item.video.id === videoId);
      if (videoItem?.type !== "video") {
        throw new Error("Test kurgusu bozuk: video item bulunamadı");
      }

      expect(videoItem.video.segments).toHaveLength(1);
      expect(videoItem.video.segments[0]?.text).toBe("segment-1");
      expect(videoItem.video.segments[0]?.learningPoints).toEqual([
        expect.objectContaining({ type: "phrase", expression: "ended up + V-ing" }),
      ]);
    });

    it("transcript'i olmayan bir video için boş dizi döner", async () => {
      const userId = await createUser();
      await createVideo("travel");

      const response = await getFeed(userId);
      const page = feedPageSchema.parse(response.body);
      const videoItem = page.items.find((item) => item.type === "video");
      if (videoItem?.type !== "video") {
        throw new Error("Test kurgusu bozuk");
      }
      expect(videoItem.video.segments).toEqual([]);
    });

    it("segment'ler ordinal sırasına göre döner", async () => {
      const userId = await createUser();
      const videoId = await createVideo("travel");
      // Bilinçli olarak TERS sırada insert ediyoruz — dönüş sırasının insert
      // sırasına değil `ordinal`e dayandığını kanıtlamak için.
      await createSegment(videoId, 2);
      await createSegment(videoId, 1);

      const response = await getFeed(userId);
      const page = feedPageSchema.parse(response.body);
      const videoItem = page.items.find((item) => item.type === "video" && item.video.id === videoId);
      if (videoItem?.type !== "video") {
        throw new Error("Test kurgusu bozuk");
      }
      expect(videoItem.video.segments.map((s) => s.ordinal)).toEqual([1, 2]);
    });

    it("quiz gerçekten kendi source segment'ine bağlı — cevap sonrası bile quiz'in kendi kimliği bozulmuyor", async () => {
      const userId = await createUser();
      const videoId1 = await createVideo("travel");
      // Chunk 14: 4:1 cadence — quiz'in feed'de görünmesi için bir grubun (4 video)
      // tamamlanması gerekiyor.
      await createVideo("career");
      await createVideo("humor");
      await createVideo("lifestyle");
      await createQuiz("hangi segment?", videoId1);

      const page = feedPageSchema.parse((await getFeed(userId)).body);
      const quizItem = page.items.find((item) => item.type === "quiz");
      expect(quizItem).toBeDefined();
      if (quizItem?.type !== "quiz") {
        throw new Error("Test kurgusu bozuk");
      }
      expect(quizItem.quiz.question).toBe("hangi segment?");
    });
  });

  describe("preference (Chunk 15 — level/topics query param'ları)", () => {
    it("geçerli level/topics ile 200 döner, ranking gerçekten çalışır", async () => {
      const userId = await createUser();
      await createVideo("travel");
      await createVideo("career");

      const response = await getFeedWithPreference(userId, "B1", "travel,dating");
      expect(response.status).toBe(200);
      feedPageSchema.parse(response.body); // contract'ı bozmuyor
    });

    it("malformed level/topics REQUEST'İ REDDETMEZ — sessizce yok sayılıp 200 döner (userId'nin AKSİNE)", async () => {
      const userId = await createUser();
      await createVideo("travel");

      const response = await getFeedWithPreference(userId, "not-a-real-level", "not-a-real-topic,also-invalid");
      expect(response.status).toBe(200);
      feedPageSchema.parse(response.body);
    });
  });
});
