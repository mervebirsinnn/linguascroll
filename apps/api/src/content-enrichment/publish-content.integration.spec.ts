import { eq } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import type { Pool } from "pg";
import { createTestDatabaseConnection, truncateTestTables } from "../videos/test-database";
import { transcriptSegmentLearningPointsTable } from "../videos/transcript-segment-learning-points.schema";
import { videoTranscriptSegmentsTable } from "../videos/transcript-segments.schema";
import { videosTable } from "../videos/videos.schema";
import { videoWordsTable } from "../words/video-words.schema";
import { wordsTable } from "../words/words.schema";
import { quizOptionsTable, quizzesTable } from "../quizzes/quizzes.schema";
import type { PublishDraft } from "./publish-draft.schema";
import { assertNotAlreadyPublished, PublishAlreadyExistsError, publishContent, PublishPipelineError } from "./publish-content";

function makeDraft(overrides: Partial<PublishDraft> = {}): PublishDraft {
  return {
    contentId: "a1final1",
    muxAssetId: "local-dog-three-words",
    sourceFile: "/tmp/a1final1.mp4",
    durationMs: 20900,
    topic: "humor",
    cefrLevel: "A1",
    segments: [
      { ordinal: 1, startMs: 0, endMs: 2740, text: "My dog is very cute.", englishExplanation: "en1", turkishExplanation: "tr1" },
      { ordinal: 2, startMs: 3340, endMs: 4920, text: "He knows three words.", englishExplanation: "en2", turkishExplanation: "tr2" },
    ],
    vocabulary: [{ lemma: "cute", gloss: "sevimli" }],
    learningPoints: [
      {
        segmentOrdinal: 1,
        type: "phrase",
        expression: "very cute",
        englishExplanation: "en-lp",
        turkishExplanation: "tr-lp",
        exampleEn: null,
        exampleTr: null,
      },
    ],
    quiz: {
      segmentOrdinal: 2,
      question: "How many words does he know?",
      options: [
        { text: "Three", isCorrect: true },
        { text: "Two", isCorrect: false },
        { text: "Four", isCorrect: false },
        { text: "None", isCorrect: false },
      ],
    },
    // publishContent() bu alanı hiç OKUMUYOR (Chunk 13 — enforcement
    // assertPassesQualityGate'te, ayrı testlerde kapsanıyor) — burada sadece
    // PublishDraft'ın tip şeklini sağlamak için statik bir "pass" değeri.
    quality: { status: "pass", issues: [] },
    ...overrides,
  };
}

describe("publishContent (integration, gerçek Postgres)", () => {
  let db: NodePgDatabase;
  let pool: Pool;

  beforeAll(() => {
    const connection = createTestDatabaseConnection();
    db = connection.db;
    pool = connection.pool;
  });

  beforeEach(async () => {
    await truncateTestTables(db);
  });

  afterAll(async () => {
    await pool.end();
  });

  it("video/segment/learning-point/vocabulary/quiz'i tek transaction'da, doğru ilişkilerle insert eder", async () => {
    const { videoId } = await publishContent(db, makeDraft());

    const [video] = await db.select().from(videosTable).where(eq(videosTable.id, videoId));
    expect(video?.muxAssetId).toBe("local-dog-three-words");
    expect(video?.topic).toBe("humor");
    expect(video?.cefrLevel).toBe("A1");

    const segments = await db
      .select()
      .from(videoTranscriptSegmentsTable)
      .where(eq(videoTranscriptSegmentsTable.videoId, videoId))
      .orderBy(videoTranscriptSegmentsTable.ordinal);
    expect(segments).toHaveLength(2);
    expect(segments[0]?.englishExplanation).toBe("en1");

    const learningPoints = await db
      .select()
      .from(transcriptSegmentLearningPointsTable)
      .where(eq(transcriptSegmentLearningPointsTable.transcriptSegmentId, segments[0]!.id));
    expect(learningPoints).toHaveLength(1);
    expect(learningPoints[0]?.expression).toBe("very cute");

    const words = await db.select().from(wordsTable);
    expect(words).toHaveLength(1);
    expect(words[0]?.lemma).toBe("cute");

    const videoWords = await db.select().from(videoWordsTable).where(eq(videoWordsTable.videoId, videoId));
    expect(videoWords).toHaveLength(1);
    expect(videoWords[0]?.wordId).toBe(words[0]?.id);

    const quizzes = await db.select().from(quizzesTable).where(eq(quizzesTable.sourceTranscriptSegmentId, segments[1]!.id));
    expect(quizzes).toHaveLength(1);
    const options = await db.select().from(quizOptionsTable).where(eq(quizOptionsTable.quizId, quizzes[0]!.id));
    expect(options).toHaveLength(4);
    expect(options.filter((option) => option.isCorrect)).toHaveLength(1);
  });

  it("madde 8 — aynı (language, lower(lemma)) zaten varsa yeni bir words satırı açmaz, mevcut id'yi reuse eder", async () => {
    await db.insert(wordsTable).values({ id: "10000000-0000-4000-8000-000000000001", language: "en", lemma: "Cute", gloss: "eski gloss" });

    const { videoId } = await publishContent(db, makeDraft());

    const words = await db.select().from(wordsTable);
    expect(words).toHaveLength(1); // yeni satır YOK — mevcut "Cute" reuse edildi
    expect(words[0]?.id).toBe("10000000-0000-4000-8000-000000000001");

    const videoWords = await db.select().from(videoWordsTable).where(eq(videoWordsTable.videoId, videoId));
    expect(videoWords[0]?.wordId).toBe("10000000-0000-4000-8000-000000000001");
  });

  it("madde 13/14 — segment referansı olmayan bir quiz (defense-in-depth) transaction'ı TAMAMEN rollback eder, hiçbir satır kalmaz", async () => {
    const brokenDraft = makeDraft({ quiz: { ...makeDraft().quiz, segmentOrdinal: 99 } });

    await expect(publishContent(db, brokenDraft)).rejects.toThrow(PublishPipelineError);

    expect(await db.select().from(videosTable)).toHaveLength(0);
    expect(await db.select().from(videoTranscriptSegmentsTable)).toHaveLength(0);
    expect(await db.select().from(wordsTable)).toHaveLength(0);
  });

  describe("assertNotAlreadyPublished", () => {
    it("aynı muxAssetId zaten publish edilmişse PublishAlreadyExistsError fırlatır", async () => {
      await publishContent(db, makeDraft());

      await expect(assertNotAlreadyPublished(db, "local-dog-three-words")).rejects.toThrow(PublishAlreadyExistsError);
    });

    it("henüz publish edilmemiş bir muxAssetId için throw etmez", async () => {
      await expect(assertNotAlreadyPublished(db, "local-unused-slug")).resolves.toBeUndefined();
    });

    it("madde 13 — aynı içeriği İKİ KEZ publish etmeye çalışmak duplicate video/segment üretmez", async () => {
      await publishContent(db, makeDraft());
      await expect(assertNotAlreadyPublished(db, "local-dog-three-words")).rejects.toThrow(PublishAlreadyExistsError);

      const videos = await db.select().from(videosTable);
      expect(videos).toHaveLength(1);
    });
  });
});
