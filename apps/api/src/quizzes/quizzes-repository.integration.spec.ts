import { eq } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import type { Pool } from "pg";
import { createTestDatabaseConnection, truncateTestTables } from "../videos/test-database";
import { videoTranscriptSegmentsTable } from "../videos/transcript-segments.schema";
import { videosTable } from "../videos/videos.schema";
import { QuizzesRepository } from "./quizzes-repository";
import { quizOptionsTable, quizzesTable } from "./quizzes.schema";

describe("QuizzesRepository (integration, gerçek Postgres)", () => {
  let db: NodePgDatabase;
  let pool: Pool;
  let repository: QuizzesRepository;

  beforeAll(() => {
    const connection = createTestDatabaseConnection();
    db = connection.db;
    pool = connection.pool;
    repository = new QuizzesRepository(db);
  });

  beforeEach(async () => {
    await truncateTestTables(db);
  });

  afterAll(async () => {
    await pool.end();
  });

  let nextMuxAssetId = 1;
  /**
   * Chunk 10 — quiz artık bir transcript segment'e (dolayısıyla bir videoya) bağlı olmak ZORUNDA.
   * Chunk 12: videos.mux_asset_id artık UNIQUE (bkz. videos.schema.ts) — bu
   * testte bu helper birden fazla kez çağrıldığı için sabit bir literal artık
   * çakışır, her çağrı kendi benzersiz id'sini üretmeli.
   */
  async function createVideoWithSegment(topic = "travel"): Promise<{ videoId: string; segmentId: string }> {
    const [video] = await db
      .insert(videosTable)
      .values({ learningLanguage: "en", cefrLevel: "A1", muxAssetId: `mock-mux-asset-${nextMuxAssetId++}`, topic, durationMs: 1000 })
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
    return { videoId: video.id, segmentId: segment.id };
  }

  async function insertQuiz(segmentId: string, question: string) {
    const [quiz] = await db.insert(quizzesTable).values({ question, sourceTranscriptSegmentId: segmentId }).returning();
    if (!quiz) {
      throw new Error("Beklenen quiz insert edilemedi");
    }
    return quiz;
  }

  it("DB row'larını isCorrect DAHİL internal Quiz'e map eder, option'ları position'a göre sıralar", async () => {
    const { segmentId } = await createVideoWithSegment();
    const quiz = await insertQuiz(segmentId, "test soru");

    await db.insert(quizOptionsTable).values([
      { quizId: quiz.id, text: "ikinci", isCorrect: false, position: 1 },
      { quizId: quiz.id, text: "birinci", isCorrect: true, position: 0 },
    ]);

    const found = await repository.findQuizById(quiz.id);

    expect(found).not.toBeNull();
    expect(found?.question).toBe("test soru");
    expect(found?.sourceSegmentId).toBe(segmentId);
    expect(found?.options.map((option) => option.text)).toEqual(["birinci", "ikinci"]);
    expect(found?.options[0]?.isCorrect).toBe(true);
    expect(found?.options[1]?.isCorrect).toBe(false);
  });

  it("var olmayan quiz için null döner", async () => {
    const found = await repository.findQuizById("00000000-0000-4000-8000-000000000099");
    expect(found).toBeNull();
  });

  it("DB partial unique index, aynı quiz için iki doğru cevabı ENGELLER (en fazla bir garanti)", async () => {
    const { segmentId } = await createVideoWithSegment();
    const quiz = await insertQuiz(segmentId, "test soru");

    await db.insert(quizOptionsTable).values({ quizId: quiz.id, text: "a", isCorrect: true, position: 0 });

    await expect(
      db.insert(quizOptionsTable).values({ quizId: quiz.id, text: "b", isCorrect: true, position: 1 }),
    ).rejects.toThrow();
  });

  describe("findQuizzesForVideos (Chunk 10 — quiz→segment→video eşleşmesi)", () => {
    it("bir quiz, GERÇEKTEN kendi source segment'inin videosuna eşleşir, başka bir videoya değil", async () => {
      const { videoId: videoA, segmentId: segmentA } = await createVideoWithSegment("travel");
      const { videoId: videoB } = await createVideoWithSegment("career");
      const quizA = await insertQuiz(segmentA, "video A sorusu");
      await db.insert(quizOptionsTable).values([
        { quizId: quizA.id, text: "doğru", isCorrect: true, position: 0 },
        { quizId: quizA.id, text: "yanlış", isCorrect: false, position: 1 },
      ]);

      const results = await repository.findQuizzesForVideos([videoA, videoB]);

      expect(results).toHaveLength(1);
      expect(results[0]?.videoId).toBe(videoA);
      expect(results[0]?.quiz.question).toBe("video A sorusu");
    });

    it("videoIds listesinde olmayan bir videonun quiz'i dönmez", async () => {
      const { segmentId } = await createVideoWithSegment("travel");
      const quiz = await insertQuiz(segmentId, "ilgisiz soru");
      await db.insert(quizOptionsTable).values([
        { quizId: quiz.id, text: "doğru", isCorrect: true, position: 0 },
        { quizId: quiz.id, text: "yanlış", isCorrect: false, position: 1 },
      ]);

      const { videoId: unrelatedVideo } = await createVideoWithSegment("humor");
      const results = await repository.findQuizzesForVideos([unrelatedVideo]);

      expect(results).toEqual([]);
    });

    it("boş videoIds için sorgu hiç atmadan boş dizi döner", async () => {
      const results = await repository.findQuizzesForVideos([]);
      expect(results).toEqual([]);
    });

    it("bir segment silinince, ona bağlı quiz de CASCADE ile silinir", async () => {
      const { segmentId } = await createVideoWithSegment();
      const quiz = await insertQuiz(segmentId, "silinecek quiz");

      await db.delete(videoTranscriptSegmentsTable).where(eq(videoTranscriptSegmentsTable.id, segmentId));

      const found = await repository.findQuizById(quiz.id);
      expect(found).toBeNull();
    });
  });
});
