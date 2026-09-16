import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
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
import { publishContent } from "./publish-content";
import type { PublishDraft } from "./publish-draft.schema";
import {
  findExistingVideoId,
  publishVocabularyForContentId,
  publishVocabularyToExistingVideo,
  VocabularyPublishTargetNotFoundError,
} from "./publish-vocabulary";

function makeDraft(overrides: Partial<PublishDraft> = {}): PublishDraft {
  return {
    contentId: "a1final1",
    muxAssetId: "local-dog-three-words",
    sourceFile: "/tmp/a1final1.mp4",
    durationMs: 20900,
    topic: "humor",
    cefrLevel: "A1",
    // 3 segment (THIN_TRANSCRIPT_MIN_SEGMENTS = 3, bkz. content-quality-gate.ts)
    // — publishVocabularyForContentId testlerinin fixture'ı YANLIŞLIKLA
    // "thinTranscript" needsReview'ına düşmesin diye, publish-content.spec.ts'in
    // 2-segmentlik fixture'ından (o testler quality gate'i hiç çalıştırmıyor)
    // KASITLI olarak farklı.
    segments: [
      { ordinal: 1, startMs: 0, endMs: 2740, text: "My dog is very cute.", englishExplanation: "en1", turkishExplanation: "tr1" },
      { ordinal: 2, startMs: 3340, endMs: 4920, text: "He knows three words.", englishExplanation: "en2", turkishExplanation: "tr2" },
      { ordinal: 3, startMs: 5000, endMs: 6500, text: "That is the whole story.", englishExplanation: "en3", turkishExplanation: "tr3" },
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
    quality: { status: "pass", issues: [] },
    ...overrides,
  };
}

/** `duplicateQuizOptions` → reject; publish-content.spec.ts'teki REJECT_DRAFT ile AYNI teknik. */
function rejectDraft(): PublishDraft {
  return makeDraft({
    quiz: {
      segmentOrdinal: 2,
      question: "How many words does he know?",
      options: [
        { text: "Three", isCorrect: true },
        { text: "THREE", isCorrect: false },
        { text: "Four", isCorrect: false },
        { text: "None", isCorrect: false },
      ],
    },
  });
}

/** `emptyVocabulary` → warning (needsReview, reject değil). */
function needsReviewDraft(): PublishDraft {
  return makeDraft({ vocabulary: [] });
}

describe("publish-vocabulary (integration, gerçek Postgres)", () => {
  let db: NodePgDatabase;
  let pool: Pool;
  let tmpRoot: string;
  let mapPath: string;

  beforeAll(() => {
    const connection = createTestDatabaseConnection();
    db = connection.db;
    pool = connection.pool;
  });

  beforeEach(async () => {
    await truncateTestTables(db);
    tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "publish-vocabulary-integration-"));
    mapPath = path.join(tmpRoot, "map.json");
    fs.writeFileSync(mapPath, JSON.stringify({ "a1final1": "local-dog-three-words" }), "utf-8");
  });

  afterEach(() => {
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  });

  afterAll(async () => {
    await pool.end();
  });

  describe("findExistingVideoId", () => {
    it("mevcut muxAssetId için video id döner", async () => {
      const { videoId } = await publishContent(db, makeDraft());
      await expect(findExistingVideoId(db, "local-dog-three-words")).resolves.toBe(videoId);
    });

    it("mevcut olmayan muxAssetId için VocabularyPublishTargetNotFoundError fırlatır", async () => {
      await expect(findExistingVideoId(db, "local-does-not-exist")).rejects.toThrow(VocabularyPublishTargetNotFoundError);
    });
  });

  describe("publishVocabularyToExistingVideo", () => {
    it("mevcut bir videoya SADECE words/video_words yazar", async () => {
      const { videoId } = await publishContent(db, makeDraft({ vocabulary: [] })); // baştan vocabulary YOK

      await publishVocabularyToExistingVideo(db, "local-dog-three-words", [{ lemma: "cute", gloss: "sevimli" }]);

      const words = await db.select().from(wordsTable);
      expect(words).toHaveLength(1);
      expect(words[0]?.lemma).toBe("cute");

      const videoWords = await db.select().from(videoWordsTable).where(eq(videoWordsTable.videoId, videoId));
      expect(videoWords).toHaveLength(1);
      expect(videoWords[0]?.wordId).toBe(words[0]?.id);
    });

    it("case-insensitive lemma dedup: mevcut \"Cute\" varsa yeni bir words satırı açmaz", async () => {
      await publishContent(db, makeDraft({ vocabulary: [] }));
      await db.insert(wordsTable).values({ id: "10000000-0000-4000-8000-000000000001", language: "en", lemma: "Cute", gloss: "eski gloss" });

      await publishVocabularyToExistingVideo(db, "local-dog-three-words", [{ lemma: "cute", gloss: "sevimli" }]);

      const words = await db.select().from(wordsTable);
      expect(words).toHaveLength(1);
      expect(words[0]?.id).toBe("10000000-0000-4000-8000-000000000001");
    });

    it("idempotency: aynı content-id/vocabulary iki kez publish edilirse video_words'te duplicate oluşmaz", async () => {
      const { videoId } = await publishContent(db, makeDraft({ vocabulary: [] }));

      await publishVocabularyToExistingVideo(db, "local-dog-three-words", [{ lemma: "cute", gloss: "sevimli" }]);
      await publishVocabularyToExistingVideo(db, "local-dog-three-words", [{ lemma: "cute", gloss: "sevimli" }]);

      const words = await db.select().from(wordsTable);
      expect(words).toHaveLength(1);
      const videoWords = await db.select().from(videoWordsTable).where(eq(videoWordsTable.videoId, videoId));
      expect(videoWords).toHaveLength(1);
    });

    it("mevcut olmayan bir video hedeflenirse hiçbir satır yazmadan throw eder", async () => {
      await expect(publishVocabularyToExistingVideo(db, "local-does-not-exist", [{ lemma: "cute", gloss: "sevimli" }])).rejects.toThrow(
        VocabularyPublishTargetNotFoundError,
      );
      expect(await db.select().from(wordsTable)).toHaveLength(0);
    });
  });

  describe("publishVocabularyForContentId — quality gate wiring", () => {
    it("reject → hiçbir DB write yapılmadan engellenir", async () => {
      await publishContent(db, makeDraft({ vocabulary: [] }));

      await expect(publishVocabularyForContentId(db, "a1final1", rejectDraft(), false, mapPath)).rejects.toThrow();

      expect(await db.select().from(wordsTable)).toHaveLength(0);
      expect(await db.select().from(videoWordsTable)).toHaveLength(0);
    });

    it("needsReview + --acknowledge-needs-review YOK → engellenir, DB write yapılmaz", async () => {
      await publishContent(db, makeDraft({ vocabulary: [] }));

      await expect(publishVocabularyForContentId(db, "a1final1", needsReviewDraft(), false, mapPath)).rejects.toThrow();

      expect(await db.select().from(wordsTable)).toHaveLength(0);
    });

    it("needsReview + --acknowledge-needs-review VAR → izin verilir", async () => {
      await publishContent(db, makeDraft({ vocabulary: [] }));

      // needsReviewDraft() gate'i "emptyVocabulary" (needsReview, reject değil)
      // uyarısıyla düşürüyor — vocabulary'nin kendisi de boş olduğu için,
      // ack ile geçmesi "persist edilecek 0 vocabulary item var" anlamına gelir.
      const result = await publishVocabularyForContentId(db, "a1final1", needsReviewDraft(), true, mapPath);
      expect(result.muxAssetId).toBe("local-dog-three-words");
      expect(await db.select().from(wordsTable)).toHaveLength(0);
    });
  });

  describe("KORUMA — videos/segments/learningPoints/quizzes değişmez", () => {
    it("vocabulary backfill sadece words/video_words'ü değiştirir, geri kalan HER ŞEY byte-for-byte aynı kalır", async () => {
      const { videoId } = await publishContent(db, makeDraft({ vocabulary: [] }));

      const videoBefore = await db.select().from(videosTable).where(eq(videosTable.id, videoId));
      const segmentsBefore = await db
        .select()
        .from(videoTranscriptSegmentsTable)
        .where(eq(videoTranscriptSegmentsTable.videoId, videoId))
        .orderBy(videoTranscriptSegmentsTable.ordinal);
      const learningPointsBefore = await db
        .select()
        .from(transcriptSegmentLearningPointsTable)
        .where(eq(transcriptSegmentLearningPointsTable.transcriptSegmentId, segmentsBefore[0]!.id));
      const quizzesBefore = await db.select().from(quizzesTable);
      const quizOptionsBefore = await db.select().from(quizOptionsTable).where(eq(quizOptionsTable.quizId, quizzesBefore[0]!.id));

      const { videoId: resultVideoId, muxAssetId } = await publishVocabularyForContentId(
        db,
        "a1final1",
        makeDraft({ vocabulary: [{ lemma: "cute", gloss: "sevimli" }] }),
        false,
        mapPath,
      );
      expect(resultVideoId).toBe(videoId);
      expect(muxAssetId).toBe("local-dog-three-words");

      const videoAfter = await db.select().from(videosTable).where(eq(videosTable.id, videoId));
      const segmentsAfter = await db
        .select()
        .from(videoTranscriptSegmentsTable)
        .where(eq(videoTranscriptSegmentsTable.videoId, videoId))
        .orderBy(videoTranscriptSegmentsTable.ordinal);
      const learningPointsAfter = await db
        .select()
        .from(transcriptSegmentLearningPointsTable)
        .where(eq(transcriptSegmentLearningPointsTable.transcriptSegmentId, segmentsAfter[0]!.id));
      const quizzesAfter = await db.select().from(quizzesTable);
      const quizOptionsAfter = await db.select().from(quizOptionsTable).where(eq(quizOptionsTable.quizId, quizzesAfter[0]!.id));

      expect(videoAfter).toEqual(videoBefore);
      expect(segmentsAfter).toEqual(segmentsBefore);
      expect(learningPointsAfter).toEqual(learningPointsBefore);
      expect(quizzesAfter).toEqual(quizzesBefore);
      expect(quizOptionsAfter).toEqual(quizOptionsBefore);

      // Değişmesi GEREKEN tek şey: words/video_words.
      const words = await db.select().from(wordsTable);
      expect(words.map((w) => w.lemma)).toEqual(["cute"]);
      const videoWords = await db.select().from(videoWordsTable).where(eq(videoWordsTable.videoId, videoId));
      expect(videoWords).toHaveLength(1);
    });
  });
});
