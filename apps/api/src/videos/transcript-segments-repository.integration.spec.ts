import { eq } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import type { Pool } from "pg";
import { createTestDatabaseConnection, truncateTestTables } from "./test-database";
import { transcriptSegmentLearningPointsTable } from "./transcript-segment-learning-points.schema";
import { TranscriptSegmentsRepository } from "./transcript-segments-repository";
import { videoTranscriptSegmentsTable } from "./transcript-segments.schema";
import { videosTable } from "./videos.schema";

describe("TranscriptSegmentsRepository (integration, gerçek Postgres)", () => {
  let db: NodePgDatabase;
  let pool: Pool;
  let repository: TranscriptSegmentsRepository;

  beforeAll(() => {
    const connection = createTestDatabaseConnection();
    db = connection.db;
    pool = connection.pool;
    repository = new TranscriptSegmentsRepository(db);
  });

  beforeEach(async () => {
    await truncateTestTables(db);
  });

  afterAll(async () => {
    await pool.end();
  });

  let nextMuxAssetId = 1;
  // Chunk 12: videos.mux_asset_id artık UNIQUE (bkz. videos.schema.ts) — bu
  // testte createVideo() birden fazla kez çağrıldığı için sabit bir literal
  // artık çakışır, her çağrı kendi benzersiz id'sini üretmeli.
  async function createVideo(topic = "travel"): Promise<string> {
    const [video] = await db
      .insert(videosTable)
      .values({ learningLanguage: "en", cefrLevel: "A1", muxAssetId: `mock-mux-asset-${nextMuxAssetId++}`, topic, durationMs: 60000 })
      .returning();
    if (!video) {
      throw new Error("Beklenen video insert edilemedi");
    }
    return video.id;
  }

  it("bir videonun segment'lerini ordinal sırasına göre döner (start_ms'e göre DEĞİL)", async () => {
    const videoId = await createVideo();
    // Bilinçli olarak ordinal ile start_ms'i TERS ilişkilendiriyoruz — dönüş
    // sırasının ordinal'e dayandığını (start_ms'e değil) kanıtlamak için.
    await db.insert(videoTranscriptSegmentsTable).values([
      { videoId, ordinal: 2, startMs: 0, endMs: 500, text: "ikinci ama start_ms küçük", englishExplanation: "e2", turkishExplanation: "t2" },
      { videoId, ordinal: 1, startMs: 1000, endMs: 1500, text: "birinci ama start_ms büyük", englishExplanation: "e1", turkishExplanation: "t1" },
    ]);

    const result = await repository.findSegmentsForVideos([videoId]);
    const segments = result.get(videoId) ?? [];

    expect(segments.map((s) => s.ordinal)).toEqual([1, 2]);
    expect(segments[0]?.text).toBe("birinci ama start_ms büyük");
  });

  it("bir segment'in learning point'lerini nested olarak, ordinal sırasına göre taşır", async () => {
    const videoId = await createVideo();
    const [segment] = await db
      .insert(videoTranscriptSegmentsTable)
      .values({ videoId, ordinal: 1, startMs: 0, endMs: 1000, text: "text", englishExplanation: "e", turkishExplanation: "t" })
      .returning();
    if (!segment) {
      throw new Error("Beklenen segment insert edilemedi");
    }

    await db.insert(transcriptSegmentLearningPointsTable).values([
      { transcriptSegmentId: segment.id, type: "grammar", expression: "ikinci", englishExplanation: "e", turkishExplanation: "t", ordinal: 2, exampleEn: null, exampleTr: null },
      { transcriptSegmentId: segment.id, type: "phrase", expression: "birinci", englishExplanation: "e", turkishExplanation: "t", ordinal: 1, exampleEn: "example", exampleTr: "örnek" },
    ]);

    const result = await repository.findSegmentsForVideos([videoId]);
    const [found] = result.get(videoId) ?? [];

    expect(found?.learningPoints.map((lp) => lp.expression)).toEqual(["birinci", "ikinci"]);
    expect(found?.learningPoints[0]).toEqual(
      expect.objectContaining({ type: "phrase", exampleEn: "example", exampleTr: "örnek" }),
    );
  });

  it("learning point'i olmayan bir segment için learningPoints boş dizi döner (LEFT JOIN)", async () => {
    const videoId = await createVideo();
    await db
      .insert(videoTranscriptSegmentsTable)
      .values({ videoId, ordinal: 1, startMs: 0, endMs: 1000, text: "text", englishExplanation: "e", turkishExplanation: "t" });

    const result = await repository.findSegmentsForVideos([videoId]);
    const [found] = result.get(videoId) ?? [];

    expect(found?.learningPoints).toEqual([]);
  });

  it("birden fazla video için TEK bir batch çağrıda doğru şekilde gruplar (N+1 yok)", async () => {
    const videoIdA = await createVideo("travel");
    const videoIdB = await createVideo("career");
    await db.insert(videoTranscriptSegmentsTable).values([
      { videoId: videoIdA, ordinal: 1, startMs: 0, endMs: 500, text: "A1", englishExplanation: "e", turkishExplanation: "t" },
      { videoId: videoIdB, ordinal: 1, startMs: 0, endMs: 500, text: "B1", englishExplanation: "e", turkishExplanation: "t" },
    ]);

    const result = await repository.findSegmentsForVideos([videoIdA, videoIdB]);

    expect(result.get(videoIdA)?.map((s) => s.text)).toEqual(["A1"]);
    expect(result.get(videoIdB)?.map((s) => s.text)).toEqual(["B1"]);
  });

  it("segment'i olmayan bir video Map'te hiç anahtar olarak bulunmaz", async () => {
    const videoId = await createVideo();
    const result = await repository.findSegmentsForVideos([videoId]);
    expect(result.has(videoId)).toBe(false);
  });

  it("boş videoIds için sorgu hiç atmadan boş Map döner", async () => {
    const result = await repository.findSegmentsForVideos([]);
    expect(result.size).toBe(0);
  });

  it("CHECK constraint: end_ms <= start_ms olan bir segment reddedilir", async () => {
    const videoId = await createVideo();
    await expect(
      db.insert(videoTranscriptSegmentsTable).values({
        videoId,
        ordinal: 1,
        startMs: 1000,
        endMs: 1000,
        text: "geçersiz",
        englishExplanation: "e",
        turkishExplanation: "t",
      }),
    ).rejects.toThrow();
  });

  it("CHECK constraint: negatif start_ms reddedilir", async () => {
    const videoId = await createVideo();
    await expect(
      db.insert(videoTranscriptSegmentsTable).values({
        videoId,
        ordinal: 1,
        startMs: -1,
        endMs: 500,
        text: "geçersiz",
        englishExplanation: "e",
        turkishExplanation: "t",
      }),
    ).rejects.toThrow();
  });

  it("UNIQUE(video_id, ordinal): aynı videoda aynı ordinal iki kez olamaz", async () => {
    const videoId = await createVideo();
    await db
      .insert(videoTranscriptSegmentsTable)
      .values({ videoId, ordinal: 1, startMs: 0, endMs: 500, text: "ilk", englishExplanation: "e", turkishExplanation: "t" });

    await expect(
      db
        .insert(videoTranscriptSegmentsTable)
        .values({ videoId, ordinal: 1, startMs: 1000, endMs: 1500, text: "çakışan", englishExplanation: "e", turkishExplanation: "t" }),
    ).rejects.toThrow();
  });

  it("video silinince segment'i de CASCADE ile silinir", async () => {
    const videoId = await createVideo();
    await db
      .insert(videoTranscriptSegmentsTable)
      .values({ videoId, ordinal: 1, startMs: 0, endMs: 500, text: "text", englishExplanation: "e", turkishExplanation: "t" });

    await db.delete(videosTable).where(eq(videosTable.id, videoId));

    const result = await repository.findSegmentsForVideos([videoId]);
    expect(result.has(videoId)).toBe(false);
  });
});
