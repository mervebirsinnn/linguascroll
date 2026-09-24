import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { ConflictException, UnprocessableEntityException } from "@nestjs/common";
import { eq } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import type { Pool } from "pg";
import { createTestDatabaseConnection, truncateTestTables } from "../videos/test-database";
import { videosTable } from "../videos/videos.schema";
import { resolveEnrichedOutputPath } from "../content-enrichment/enrich-transcript";
import { resolveMediaDestination } from "../content-enrichment/publish-content";
import type { PublishDraft } from "../content-enrichment/publish-draft.schema";
import { PublishProcessingService } from "./publish-processing.service";

/**
 * Integration (gerçek Postgres) — publish-content.integration.spec.ts'in
 * `publishContent`/`assertNotAlreadyPublished` için kullandığı AYNI desen:
 * PublishProcessingService gerçek DB'ye dokunan reused fonksiyonları orkestre
 * ediyor, bu yüzden fake bir drizzle `db` mock'lamak (fluent query builder'ı
 * taklit etmek) yerine gerçek test veritabanına karşı test edilir.
 */
function makeDraft(contentId: string, overrides: Partial<PublishDraft> = {}): PublishDraft {
  return {
    contentId,
    muxAssetId: `local-${contentId}`,
    sourceFile: "/tmp/should-not-be-used-unless-overridden.mp4",
    storageKey: null,
    durationMs: 5000,
    topic: "humor",
    cefrLevel: "A1",
    segments: [
      { ordinal: 1, startMs: 0, endMs: 1000, text: "She loves reading books.", englishExplanation: "She enjoys reading very much.", turkishExplanation: "Okumaktan çok hoşlanıyor." },
      { ordinal: 2, startMs: 1000, endMs: 2000, text: "They went to the market yesterday.", englishExplanation: "They visited the market the day before.", turkishExplanation: "Bir önceki gün pazara gittiler." },
      { ordinal: 3, startMs: 2000, endMs: 3000, text: "He fixed his old bicycle.", englishExplanation: "He repaired his old bike.", turkishExplanation: "Eski bisikletini tamir etti." },
    ],
    vocabulary: [{ lemma: "market", gloss: "pazar" }],
    learningPoints: [],
    quiz: {
      segmentOrdinal: 1,
      question: "What does she love doing?",
      options: [
        { text: "Reading books", isCorrect: true },
        { text: "Cooking food", isCorrect: false },
        { text: "Playing games", isCorrect: false },
        { text: "Watching movies", isCorrect: false },
      ],
    },
    quality: { status: "pass", issues: [] }, // publishProcessingService FRESH evaluateContentQuality çalıştırır, bu alan okunmuyor
    ...overrides,
  };
}

function writeEnrichedFile(draft: PublishDraft): void {
  const outputPath = resolveEnrichedOutputPath(draft.contentId);
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(draft, null, 2));
}

function cleanupEnrichedFile(contentId: string): void {
  fs.rmSync(path.dirname(resolveEnrichedOutputPath(contentId)), { recursive: true, force: true });
}

function cleanupCopiedMedia(muxAssetId: string): void {
  fs.rmSync(resolveMediaDestination(muxAssetId), { force: true });
}

describe("PublishProcessingService.publish (integration, gerçek Postgres)", () => {
  let db: NodePgDatabase;
  let pool: Pool;
  let service: PublishProcessingService;

  beforeAll(() => {
    const connection = createTestDatabaseConnection();
    db = connection.db;
    pool = connection.pool;
    service = new PublishProcessingService(db);
  });

  beforeEach(async () => {
    await truncateTestTables(db);
  });

  afterAll(async () => {
    await pool.end();
  });

  describe("local/offline regresyon (storageKey null) — mevcut copyMediaFile davranışı AYNEN korunuyor", () => {
    const CONTENT_ID = "pp-local-test";
    let sourceFile: string;

    beforeEach(() => {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "publish-processing-local-"));
      sourceFile = path.join(tmpDir, "input.mp4");
      fs.writeFileSync(sourceFile, "fake video bytes");
      writeEnrichedFile(makeDraft(CONTENT_ID, { sourceFile }));
    });

    afterEach(() => {
      cleanupEnrichedFile(CONTENT_ID);
      cleanupCopiedMedia(`local-${CONTENT_ID}`);
    });

    it("storageKey yoksa dosyayı public/media'ya kopyalar ve video'yu publish eder", async () => {
      const result = await service.publish(CONTENT_ID, false);

      expect(result.muxAssetId).toBe(`local-${CONTENT_ID}`);
      const [video] = await db.select().from(videosTable).where(eq(videosTable.id, result.videoId));
      expect(video?.storageKey).toBeNull();
      expect(fs.existsSync(resolveMediaDestination(`local-${CONTENT_ID}`))).toBe(true);
    });

    it("sourceFile yoksa (storageKey null) UnprocessableEntityException fırlatır, DB'ye hiçbir satır yazmaz", async () => {
      writeEnrichedFile(makeDraft(CONTENT_ID, { sourceFile: "/tmp/definitely-does-not-exist-anywhere.mp4" }));

      await expect(service.publish(CONTENT_ID, false)).rejects.toThrow(UnprocessableEntityException);
      expect(await db.select().from(videosTable)).toHaveLength(0);
    });
  });

  describe("R2-backed publish (storageKey dolu)", () => {
    const CONTENT_ID = "pp-r2-test";

    afterEach(() => {
      cleanupEnrichedFile(CONTENT_ID);
    });

    it("copyMediaFile HİÇ ÇAĞRILMAZ (sourceFile kasıtlı olarak var OLMAYAN bir dosya, yine de publish başarılı olur) ve storageKey DB'ye persist edilir", async () => {
      writeEnrichedFile(
        makeDraft(CONTENT_ID, {
          sourceFile: "/tmp/this-file-was-never-created-proves-copy-skipped.mp4",
          storageKey: "originals/pp-r2-test/9f8e7d6c-uuid.mp4",
        }),
      );

      const result = await service.publish(CONTENT_ID, false);

      const [video] = await db.select().from(videosTable).where(eq(videosTable.id, result.videoId));
      expect(video?.storageKey).toBe("originals/pp-r2-test/9f8e7d6c-uuid.mp4");
      // copyMediaFile hiç çağrılmadığının kanıtı: hedef dosya asla oluşmadı.
      expect(fs.existsSync(resolveMediaDestination(video!.muxAssetId))).toBe(false);
    });
  });

  describe("Quality Gate wiring", () => {
    const CONTENT_ID = "pp-quality-test";

    afterEach(() => {
      cleanupEnrichedFile(CONTENT_ID);
      cleanupCopiedMedia(`local-${CONTENT_ID}`);
    });

    it("pass → acknowledgeNeedsReview olmadan da publish eder", async () => {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "publish-processing-quality-"));
      const sourceFile = path.join(tmpDir, "input.mp4");
      fs.writeFileSync(sourceFile, "fake video bytes");
      writeEnrichedFile(makeDraft(CONTENT_ID, { sourceFile }));

      await expect(service.publish(CONTENT_ID, false)).resolves.toEqual({ videoId: expect.any(String), muxAssetId: `local-${CONTENT_ID}` });
    });

    it("needsReview + acknowledgeNeedsReview=false → ConflictException, DB'ye hiçbir satır yazmaz", async () => {
      writeEnrichedFile(makeDraft(CONTENT_ID, { vocabulary: [] })); // emptyVocabulary → needsReview

      await expect(service.publish(CONTENT_ID, false)).rejects.toThrow(ConflictException);
      expect(await db.select().from(videosTable)).toHaveLength(0);
    });

    it("needsReview + acknowledgeNeedsReview=true → publish eder", async () => {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "publish-processing-quality-ack-"));
      const sourceFile = path.join(tmpDir, "input.mp4");
      fs.writeFileSync(sourceFile, "fake video bytes");
      writeEnrichedFile(makeDraft(CONTENT_ID, { sourceFile, vocabulary: [] }));

      await expect(service.publish(CONTENT_ID, true)).resolves.toEqual({ videoId: expect.any(String), muxAssetId: `local-${CONTENT_ID}` });
    });

    it("reject → acknowledgeNeedsReview=true OLSA BİLE ConflictException, DB'ye hiçbir satır yazmaz", async () => {
      writeEnrichedFile(
        makeDraft(CONTENT_ID, {
          quiz: {
            segmentOrdinal: 1,
            question: "What does she love doing?",
            options: [
              { text: "Reading books", isCorrect: true },
              { text: "READING BOOKS", isCorrect: false }, // duplicateQuizOptions → reject
              { text: "Playing games", isCorrect: false },
              { text: "Watching movies", isCorrect: false },
            ],
          },
        }),
      );

      await expect(service.publish(CONTENT_ID, true)).rejects.toThrow(ConflictException);
      expect(await db.select().from(videosTable)).toHaveLength(0);
    });
  });

  describe("idempotency", () => {
    const CONTENT_ID = "pp-idempotency-test";

    afterEach(() => {
      cleanupEnrichedFile(CONTENT_ID);
      cleanupCopiedMedia(`local-${CONTENT_ID}`);
    });

    it("aynı içeriği İKİNCİ KEZ publish etmeye çalışmak ConflictException fırlatır, duplicate video üretmez", async () => {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "publish-processing-idempotency-"));
      const sourceFile = path.join(tmpDir, "input.mp4");
      fs.writeFileSync(sourceFile, "fake video bytes");
      writeEnrichedFile(makeDraft(CONTENT_ID, { sourceFile }));

      await service.publish(CONTENT_ID, false);
      await expect(service.publish(CONTENT_ID, false)).rejects.toThrow(ConflictException);

      const videos = await db.select().from(videosTable);
      expect(videos).toHaveLength(1);
    });
  });

  it("enriched.json bulunamazsa UnprocessableEntityException fırlatır", async () => {
    await expect(service.publish("pp-does-not-exist", false)).rejects.toThrow(UnprocessableEntityException);
  });
});
