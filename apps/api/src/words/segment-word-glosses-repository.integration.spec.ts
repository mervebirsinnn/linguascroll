import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import type { Pool } from "pg";
import { createTestDatabaseConnection, truncateTestTables } from "../videos/test-database";
import { videoTranscriptSegmentsTable } from "../videos/transcript-segments.schema";
import { videosTable } from "../videos/videos.schema";
import { SegmentWordGlossesRepository } from "./segment-word-glosses-repository";

describe("SegmentWordGlossesRepository (integration, gerçek Postgres)", () => {
  let db: NodePgDatabase;
  let pool: Pool;
  let repository: SegmentWordGlossesRepository;

  beforeAll(() => {
    const connection = createTestDatabaseConnection();
    db = connection.db;
    pool = connection.pool;
    repository = new SegmentWordGlossesRepository(db);
  });

  beforeEach(async () => {
    await truncateTestTables(db);
  });

  afterAll(async () => {
    await pool.end();
  });

  let nextMuxAssetId = 1;
  async function createVideoWithSegments(count: number): Promise<{ videoId: string; segmentIds: string[] }> {
    const [video] = await db
      .insert(videosTable)
      .values({ learningLanguage: "en", cefrLevel: "A1", muxAssetId: `mock-glosses-${nextMuxAssetId++}`, topic: "travel", durationMs: 60000 })
      .returning();
    if (!video) throw new Error("Video insert edilemedi");
    const segments = await db
      .insert(videoTranscriptSegmentsTable)
      .values(
        Array.from({ length: count }, (_, index) => ({
          videoId: video.id,
          ordinal: index + 1,
          startMs: index * 1000,
          endMs: index * 1000 + 500,
          text: `segment ${index + 1}`,
          englishExplanation: "e",
          turkishExplanation: "t",
        })),
      )
      .returning({ id: videoTranscriptSegmentsTable.id });
    return { videoId: video.id, segmentIds: segments.map((segment) => segment.id) };
  }

  it("videonun anlamlarını segmentId -> kelime -> anlam olarak döner, başka videonunkini karıştırmaz", async () => {
    const first = await createVideoWithSegments(2);
    const second = await createVideoWithSegments(1);
    await repository.insertMany([
      { segmentId: first.segmentIds[0]!, word: "home", gloss: "ev" },
      { segmentId: first.segmentIds[1]!, word: "home", gloss: "yuva" },
      { segmentId: second.segmentIds[0]!, word: "other", gloss: "diğer" },
    ]);

    expect(await repository.findForVideo(first.videoId)).toEqual({
      [first.segmentIds[0]!]: { home: "ev" },
      [first.segmentIds[1]!]: { home: "yuva" },
    });
  });

  it("anlamı olmayan video için boş obje döner", async () => {
    const { videoId } = await createVideoWithSegments(1);
    expect(await repository.findForVideo(videoId)).toEqual({});
    expect(await repository.hasAnyForVideo(videoId)).toBe(false);
  });

  it("insertMany idempotent: aynı (segment, kelime) tekrar eklenince hata vermez ve ilk anlamı korur", async () => {
    const { videoId, segmentIds } = await createVideoWithSegments(1);
    await repository.insertMany([{ segmentId: segmentIds[0]!, word: "home", gloss: "ev" }]);
    await repository.insertMany([{ segmentId: segmentIds[0]!, word: "home", gloss: "değişti" }]);

    expect(await repository.findForVideo(videoId)).toEqual({ [segmentIds[0]!]: { home: "ev" } });
    expect(await repository.hasAnyForVideo(videoId)).toBe(true);
  });

  it("insertMany boş listeyle sorgu atmadan döner", async () => {
    await expect(repository.insertMany([])).resolves.toBeUndefined();
  });
});
