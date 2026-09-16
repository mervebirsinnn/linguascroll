import type { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { eq } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import type { Pool } from "pg";
import request from "supertest";
import { AppModule } from "../app.module";
import { usersTable } from "../users/users.schema";
import { createTestDatabaseConnection, truncateTestTables } from "../videos/test-database";
import { videoTranscriptSegmentsTable } from "../videos/transcript-segments.schema";
import { videosTable } from "../videos/videos.schema";
import { videoWordsTable } from "./video-words.schema";
import { wordsTable } from "./words.schema";

/**
 * Chunk 16 — GET /words/saved, GET /words/review, POST /words/:wordId/review,
 * GET /words/progress. words.e2e-spec.ts'teki PUT/DELETE /saved testlerinden
 * AYRI bir dosya — mevcut projede zaten yerleşik desen (her dosya kendi
 * app/db bağlantısını kurar, bkz. quizzes.e2e-spec.ts / feed.e2e-spec.ts).
 */
describe("GET /words/saved, GET /words/review, POST /words/:wordId/review, GET /words/progress (e2e, gerçek Postgres)", () => {
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

  let nextMuxAssetId = 1;
  async function createVideo(): Promise<string> {
    const [video] = await db
      .insert(videosTable)
      .values({ learningLanguage: "en", cefrLevel: "A1", muxAssetId: `mock-mux-asset-${nextMuxAssetId++}`, topic: "travel", durationMs: 1000 })
      .returning();
    if (!video) throw new Error("Beklenen video insert edilemedi");
    return video.id;
  }

  const nextOrdinalByVideo = new Map<string, number>();
  async function createSegment(videoId: string, text = "This is a test sentence."): Promise<string> {
    const ordinal = (nextOrdinalByVideo.get(videoId) ?? 0) + 1;
    nextOrdinalByVideo.set(videoId, ordinal);
    const [segment] = await db
      .insert(videoTranscriptSegmentsTable)
      .values({ videoId, ordinal, startMs: 0, endMs: 1000, text, englishExplanation: "en", turkishExplanation: "tr" })
      .returning();
    if (!segment) throw new Error("Beklenen transcript segment insert edilemedi");
    return segment.id;
  }

  async function createWord(lemma = "journey", gloss = "test gloss"): Promise<string> {
    const [word] = await db.insert(wordsTable).values({ language: "en", lemma, gloss }).returning();
    if (!word) throw new Error("Beklenen kelime insert edilemedi");
    return word.id;
  }

  describe("GET /words/saved", () => {
    it("malformed userId için 400 döner", async () => {
      const response = await request(app.getHttpServer()).get("/words/saved").query({ userId: "not-a-uuid" });
      expect(response.status).toBe(400);
    });

    it("hiç kaydedilmiş kelime yoksa boş dizi döner", async () => {
      const userId = await createUser();
      const response = await request(app.getHttpServer()).get("/words/saved").query({ userId });
      expect(response.status).toBe(200);
      expect(response.body).toEqual([]);
    });

    it("kaydedilmiş bir kelime/phrase (çok kelimeli lemma dahil) memory listesinde görünür", async () => {
      const userId = await createUser();
      const wordId = await createWord("give up", "vazgeçmek");
      await request(app.getHttpServer()).put(`/words/${wordId}/saved`).send({ userId });

      const response = await request(app.getHttpServer()).get("/words/saved").query({ userId });
      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(1);
      expect(response.body[0].word.lemma).toBe("give up");
      expect(response.body[0].sourceSentence).toBeNull();
    });

    it("sourceSegmentId ile kaydedilen kelime gerçek sourceSentence ile döner", async () => {
      const userId = await createUser();
      const video = await createVideo();
      const wordId = await createWord("journey");
      const segmentId = await createSegment(video, "We went on a long journey together.");
      await db.insert(videoWordsTable).values({ videoId: video, wordId });

      const saveResponse = await request(app.getHttpServer()).put(`/words/${wordId}/saved`).send({ userId, sourceSegmentId: segmentId });
      expect(saveResponse.status).toBe(200);

      const response = await request(app.getHttpServer()).get("/words/saved").query({ userId });
      expect(response.body[0].sourceSentence).toBe("We went on a long journey together.");
    });

    it("segmentId video ile TUTARSIZSA save 400 ile reddedilir", async () => {
      const userId = await createUser();
      const videoX = await createVideo();
      const videoY = await createVideo();
      const wordId = await createWord("journey");
      const segmentOnVideoX = await createSegment(videoX);
      // wordId sadece videoY'nin sözlüğünde.
      await db.insert(videoWordsTable).values({ videoId: videoY, wordId });

      const response = await request(app.getHttpServer())
        .put(`/words/${wordId}/saved`)
        .send({ userId, sourceSegmentId: segmentOnVideoX });
      expect(response.status).toBe(400);
    });

    it("unsave edilen kelime memory listesinden kalkar", async () => {
      const userId = await createUser();
      const wordId = await createWord("journey");
      await request(app.getHttpServer()).put(`/words/${wordId}/saved`).send({ userId });
      await request(app.getHttpServer()).delete(`/words/${wordId}/saved`).query({ userId });

      const response = await request(app.getHttpServer()).get("/words/saved").query({ userId });
      expect(response.body).toEqual([]);
    });

    it("kaynak segment sonradan silinirse kayıtlı kelime hayatta kalır, sourceSentence null'a düşer", async () => {
      const userId = await createUser();
      const video = await createVideo();
      const wordId = await createWord("journey");
      const segmentId = await createSegment(video, "We went on a long journey together.");
      await db.insert(videoWordsTable).values({ videoId: video, wordId });
      await request(app.getHttpServer()).put(`/words/${wordId}/saved`).send({ userId, sourceSegmentId: segmentId });

      await db.delete(videoTranscriptSegmentsTable).where(eq(videoTranscriptSegmentsTable.id, segmentId));

      const response = await request(app.getHttpServer()).get("/words/saved").query({ userId });
      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(1);
      expect(response.body[0].sourceSentence).toBeNull();
    });
  });

  describe("GET /words/review + POST /words/:wordId/review", () => {
    it("hiç review edilmemiş kaydedilmiş kelime review session'da (due) görünür", async () => {
      const userId = await createUser();
      const wordId = await createWord("journey");
      await request(app.getHttpServer()).put(`/words/${wordId}/saved`).send({ userId });

      const response = await request(app.getHttpServer()).get("/words/review").query({ userId });
      expect(response.status).toBe(200);
      expect(response.body.map((w: { word: { lemma: string } }) => w.word.lemma)).toEqual(["journey"]);
    });

    it("kaydedilmiş kelime yoksa review session boş döner", async () => {
      const userId = await createUser();
      const response = await request(app.getHttpServer()).get("/words/review").query({ userId });
      expect(response.body).toEqual([]);
    });

    it("review event POST edilince DB'ye kalıcı olarak yazılır — FARKLI bir GET isteğiyle (yeniden sorgu, 'restart') doğrulanır", async () => {
      const userId = await createUser();
      const wordId = await createWord("journey");
      await request(app.getHttpServer()).put(`/words/${wordId}/saved`).send({ userId });

      const postResponse = await request(app.getHttpServer()).post(`/words/${wordId}/review`).send({ userId, correct: true });
      expect(postResponse.status).toBe(200);

      // 1 doğru cevap → +1 gün dolmadan notDue, review session'dan düşmeli.
      const response = await request(app.getHttpServer()).get("/words/review").query({ userId });
      expect(response.body).toEqual([]);
    });

    it("yanlış cevap kelimeyi HEMEN yeniden due yapar", async () => {
      const userId = await createUser();
      const wordId = await createWord("journey");
      await request(app.getHttpServer()).put(`/words/${wordId}/saved`).send({ userId });
      await request(app.getHttpServer()).post(`/words/${wordId}/review`).send({ userId, correct: false });

      const response = await request(app.getHttpServer()).get("/words/review").query({ userId });
      expect(response.body.map((w: { word: { lemma: string } }) => w.word.lemma)).toEqual(["journey"]);
    });

    it("malformed body (correct eksik) için 400 döner", async () => {
      const userId = await createUser();
      const wordId = await createWord("journey");
      const response = await request(app.getHttpServer()).post(`/words/${wordId}/review`).send({ userId });
      expect(response.status).toBe(400);
    });

    it("var olmayan wordId için review POST 404 döner", async () => {
      const userId = await createUser();
      const response = await request(app.getHttpServer())
        .post("/words/00000000-0000-4000-8000-000000000099/review")
        .send({ userId, correct: true });
      expect(response.status).toBe(404);
    });

    it("en fazla 5 kelime döner, sadece gerçekten due olanlar (padding yok)", async () => {
      const userId = await createUser();
      // 2 kelime kaydet, sadece ikisi de due (hiç review edilmemiş) — tam 2 dönmeli.
      const wordAId = await createWord("apple");
      const wordBId = await createWord("banana");
      await request(app.getHttpServer()).put(`/words/${wordAId}/saved`).send({ userId });
      await request(app.getHttpServer()).put(`/words/${wordBId}/saved`).send({ userId });

      const response = await request(app.getHttpServer()).get("/words/review").query({ userId });
      expect(response.body).toHaveLength(2);
    });
  });

  describe("GET /words/progress", () => {
    it("malformed userId için 400 döner", async () => {
      const response = await request(app.getHttpServer()).get("/words/progress").query({ userId: "not-a-uuid" });
      expect(response.status).toBe(400);
    });

    it("hiç kaydedilmiş/review edilmiş kelime yoksa tüm alanlar 0 döner", async () => {
      const userId = await createUser();
      const response = await request(app.getHttpServer()).get("/words/progress").query({ userId });
      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        savedCount: 0,
        reviewedCount: 0,
        rememberedCorrectlyCount: 0,
        savedThisWeek: 0,
        reviewedThisWeek: 0,
        rememberedCorrectlyThisWeek: 0,
      });
    });

    it("gerçek save + review event'lerinden sonra sayılar DB'deki gerçek duruma göre hesaplanır", async () => {
      const userId = await createUser();
      const wordAId = await createWord("journey");
      const wordBId = await createWord("habit");
      await request(app.getHttpServer()).put(`/words/${wordAId}/saved`).send({ userId });
      await request(app.getHttpServer()).put(`/words/${wordBId}/saved`).send({ userId });
      await request(app.getHttpServer()).post(`/words/${wordAId}/review`).send({ userId, correct: true });

      const response = await request(app.getHttpServer()).get("/words/progress").query({ userId });
      expect(response.body.savedCount).toBe(2);
      expect(response.body.reviewedCount).toBe(1);
      expect(response.body.rememberedCorrectlyCount).toBe(1);
    });
  });
});
