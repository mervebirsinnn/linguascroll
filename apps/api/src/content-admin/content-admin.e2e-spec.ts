import type { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import type { Pool } from "pg";
import request from "supertest";
import { AppModule } from "../app.module";
import { createTestDatabaseConnection, truncateTestTables } from "../videos/test-database";
import { videosTable } from "../videos/videos.schema";
import { EnrichmentProcessingService } from "./enrichment-processing.service";
import { PublishProcessingService } from "./publish-processing.service";
import { R2StorageService } from "./r2-storage.service";
import { SttProcessingService } from "./stt-processing.service";

const MAX_UPLOAD_SIZE_BYTES = 100 * 1024 * 1024;

describe("POST /content-admin/videos/upload (e2e, gerçek Nest HTTP katmanı + gerçek Postgres, mock R2 — hiçbir gerçek Cloudflare çağrısı yok)", () => {
  let app: INestApplication;
  let db: NodePgDatabase;
  let pool: Pool;

  // R2StorageService TÜMDEN mock'lanıyor (S3Client seviyesinde değil) — bu dosya
  // "upload gerçek HTTP/Nest/DB katmanından geçiyor mu ve videos tablosuna
  // dokunmuyor mu" sorusunu test ediyor; S3'e ATILAN komutun şekli zaten
  // r2-storage.service.spec.ts'in sorumluluğu (iki yerde aynı şeyi test etmiyoruz).
  const stubR2Storage = {
    uploadOriginalVideo: jest.fn(),
    buildPlaybackUrl: jest.fn(),
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(R2StorageService)
      .useValue(stubR2Storage)
      .compile();
    app = moduleRef.createNestApplication();
    await app.init();

    const connection = createTestDatabaseConnection();
    db = connection.db;
    pool = connection.pool;
  });

  beforeEach(async () => {
    await truncateTestTables(db);
    stubR2Storage.uploadOriginalVideo.mockReset().mockResolvedValue({ storageKey: "originals/e2e-test-content/stub-uuid.mp4" });
    stubR2Storage.buildPlaybackUrl.mockReset().mockReturnValue("https://media.example.com/originals/e2e-test-content/stub-uuid.mp4");
  });

  afterAll(async () => {
    await pool.end();
    await app.close();
  });

  it("geçerli bir MP4 upload'ı draft metadata döner ve videos tablosuna HİÇBİR SATIR yazmaz", async () => {
    const response = await request(app.getHttpServer())
      .post("/content-admin/videos/upload")
      .field("contentId", "e2e-test-content")
      .attach("file", Buffer.from("fake-mp4-bytes"), { filename: "clip.mp4", contentType: "video/mp4" })
      .expect(201);

    expect(response.body).toEqual({
      contentId: "e2e-test-content",
      storageKey: "originals/e2e-test-content/stub-uuid.mp4",
      playbackUrl: "https://media.example.com/originals/e2e-test-content/stub-uuid.mp4",
      originalFilename: "clip.mp4",
      sizeBytes: expect.any(Number),
    });
    expect(stubR2Storage.uploadOriginalVideo).toHaveBeenCalledTimes(1);

    // Madde: upload edilen içerik feed'de/`GET /videos`'ta GÖRÜNMEMELİ — bu
    // chunk hiçbir Postgres yazması yapmadığı için bu yapısal olarak garanti
    // (bkz. content-admin.service.ts yorumu), burada gerçek DB'ye karşı doğrulanıyor.
    const rows = await db.select().from(videosTable);
    expect(rows).toHaveLength(0);
  });

  it("dosya eksikse 400 döner, R2'ye hiç gitmez", async () => {
    await request(app.getHttpServer()).post("/content-admin/videos/upload").field("contentId", "e2e-test-content").expect(400);

    expect(stubR2Storage.uploadOriginalVideo).not.toHaveBeenCalled();
  });

  it("video/mp4 dışındaki bir mimetype'ı 400 ile reddeder, R2'ye hiç gitmez", async () => {
    await request(app.getHttpServer())
      .post("/content-admin/videos/upload")
      .field("contentId", "e2e-test-content")
      .attach("file", Buffer.from("not a video"), { filename: "notes.txt", contentType: "text/plain" })
      .expect(400);

    expect(stubR2Storage.uploadOriginalVideo).not.toHaveBeenCalled();
  });

  it(
    "100MB sınırını aşan bir dosyayı 413 ile reddeder (Multer seviyesinde, R2'ye hiç gitmeden)",
    async () => {
      const oversized = Buffer.alloc(MAX_UPLOAD_SIZE_BYTES + 1, 1);
      await request(app.getHttpServer())
        .post("/content-admin/videos/upload")
        .field("contentId", "e2e-test-content")
        .attach("file", oversized, { filename: "big.mp4", contentType: "video/mp4" })
        .expect(413);

      expect(stubR2Storage.uploadOriginalVideo).not.toHaveBeenCalled();
    },
    30000,
  );
});

describe("POST /content-admin/videos/:contentId/process-stt (e2e, gerçek Nest HTTP katmanı — STT/R2 tamamen mock, gerçek Python/faster-whisper hiç çalışmaz)", () => {
  let app: INestApplication;
  let pool: Pool;

  // SttProcessingService TÜMDEN mock'lanıyor — bu dosya "route/validation/HTTP
  // katmanı doğru mu" sorusunu test ediyor; gerçek R2 indirme + subprocess
  // orkestrasyonu stt-processing.service.spec.ts'in sorumluluğu (iki yerde
  // aynı şeyi test etmiyoruz, run-stt-pipeline.ts'in kendi testlerindeki
  // "gerçek Python bu ortamda pratik değil" sınırıyla tutarlı).
  const stubSttProcessing = { processStt: jest.fn() };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(SttProcessingService)
      .useValue(stubSttProcessing)
      .compile();
    app = moduleRef.createNestApplication();
    await app.init();

    const connection = createTestDatabaseConnection();
    pool = connection.pool;
  });

  beforeEach(() => {
    stubSttProcessing.processStt.mockReset().mockResolvedValue({
      contentId: "e2e-test-content",
      storageKey: "originals/e2e-test-content/stub-uuid.mp4",
      languageStatus: "ready",
      detectedLanguage: "en",
      languageProbability: 0.95,
      durationMs: 5000,
      segments: [{ ordinal: 1, startMs: 0, endMs: 1000, text: "hello" }],
    });
  });

  afterAll(async () => {
    await pool.end();
    await app.close();
  });

  it("geçerli contentId + storageKey ile SttProcessingService'i çağırır ve draft'ı döner", async () => {
    const response = await request(app.getHttpServer())
      .post("/content-admin/videos/e2e-test-content/process-stt")
      .send({ storageKey: "originals/e2e-test-content/stub-uuid.mp4" })
      .expect(201);

    expect(stubSttProcessing.processStt).toHaveBeenCalledWith(
      "e2e-test-content",
      "originals/e2e-test-content/stub-uuid.mp4",
    );
    expect(response.body).toEqual({
      contentId: "e2e-test-content",
      storageKey: "originals/e2e-test-content/stub-uuid.mp4",
      languageStatus: "ready",
      detectedLanguage: "en",
      languageProbability: 0.95,
      durationMs: 5000,
      segments: [{ ordinal: 1, startMs: 0, endMs: 1000, text: "hello" }],
    });
  });

  it("geçersiz (kebab-case olmayan) bir contentId'yi 400 ile reddeder, servise hiç gitmez", async () => {
    await request(app.getHttpServer())
      .post("/content-admin/videos/Not_Valid/process-stt")
      .send({ storageKey: "originals/Not_Valid/uuid.mp4" })
      .expect(400);

    expect(stubSttProcessing.processStt).not.toHaveBeenCalled();
  });

  it("storageKey body'de eksikse 400 döner, servise hiç gitmez", async () => {
    await request(app.getHttpServer()).post("/content-admin/videos/e2e-test-content/process-stt").send({}).expect(400);

    expect(stubSttProcessing.processStt).not.toHaveBeenCalled();
  });
});

describe("POST /content-admin/videos/:contentId/enrich (e2e, gerçek Nest HTTP katmanı — enrichment tamamen mock, gerçek Gemini hiç çağrılmaz)", () => {
  let app: INestApplication;
  let pool: Pool;

  // EnrichmentProcessingService TÜMDEN mock'lanıyor — bu dosya "route/validation/
  // HTTP katmanı doğru mu" sorusunu test ediyor; gerçek draft.json okuma + Gemini +
  // Quality Gate orkestrasyonu enrichment-processing.service.spec.ts'in sorumluluğu.
  const stubEnrichmentProcessing = { enrich: jest.fn() };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(EnrichmentProcessingService)
      .useValue(stubEnrichmentProcessing)
      .compile();
    app = moduleRef.createNestApplication();
    await app.init();

    const connection = createTestDatabaseConnection();
    pool = connection.pool;
  });

  beforeEach(() => {
    stubEnrichmentProcessing.enrich.mockReset().mockResolvedValue({
      contentId: "e2e-test-content",
      muxAssetId: "local-hello-greeting",
      durationMs: 5000,
      topic: "lifestyle",
      cefrLevel: "A1",
      segments: [{ ordinal: 1, startMs: 0, endMs: 1000, text: "hello", englishExplanation: "A greeting.", turkishExplanation: "Bir selamlama." }],
      vocabulary: [],
      learningPoints: [],
      quiz: {
        segmentOrdinal: 1,
        question: "What does 'hello' mean?",
        options: [
          { text: "A greeting", isCorrect: true },
          { text: "A farewell", isCorrect: false },
          { text: "A question", isCorrect: false },
          { text: "An apology", isCorrect: false },
        ],
      },
      quality: { status: "pass", issues: [] },
    });
  });

  afterAll(async () => {
    await pool.end();
    await app.close();
  });

  it("geçerli contentId ile EnrichmentProcessingService'i çağırır ve enriched draft'ı döner", async () => {
    const response = await request(app.getHttpServer())
      .post("/content-admin/videos/e2e-test-content/enrich")
      .send()
      .expect(201);

    expect(stubEnrichmentProcessing.enrich).toHaveBeenCalledWith("e2e-test-content");
    expect(response.body.contentId).toBe("e2e-test-content");
    expect(response.body.quality).toEqual({ status: "pass", issues: [] });
    expect(response.body).not.toHaveProperty("sourceFile");
  });

  it("geçersiz (kebab-case olmayan) bir contentId'yi 400 ile reddeder, servise hiç gitmez", async () => {
    await request(app.getHttpServer()).post("/content-admin/videos/Not_Valid/enrich").send().expect(400);

    expect(stubEnrichmentProcessing.enrich).not.toHaveBeenCalled();
  });
});

describe("POST /content-admin/videos/:contentId/publish (e2e, gerçek Nest HTTP katmanı — orchestration tamamen mock, gerçek publish-content.ts akışı publish-processing.service.integration.spec.ts'in sorumluluğu)", () => {
  let app: INestApplication;
  let pool: Pool;

  // PublishProcessingService TÜMDEN mock'lanıyor — bu dosya "route/validation/HTTP
  // katmanı (contentId/acknowledgeNeedsReview parse'ı) doğru mu" sorusunu test
  // ediyor; gerçek quality-gate/idempotency/medya/DB orkestrasyonu
  // publish-processing.service.integration.spec.ts'in sorumluluğu.
  const stubPublishProcessing = { publish: jest.fn() };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PublishProcessingService)
      .useValue(stubPublishProcessing)
      .compile();
    app = moduleRef.createNestApplication();
    await app.init();

    const connection = createTestDatabaseConnection();
    pool = connection.pool;
  });

  beforeEach(() => {
    stubPublishProcessing.publish.mockReset().mockResolvedValue({
      videoId: "00000000-0000-4000-8000-000000000001",
      muxAssetId: "local-hello-greeting",
    });
  });

  afterAll(async () => {
    await pool.end();
    await app.close();
  });

  it("body olmadan çağrılırsa acknowledgeNeedsReview=false ile PublishProcessingService'i çağırır", async () => {
    const response = await request(app.getHttpServer()).post("/content-admin/videos/e2e-test-content/publish").send().expect(201);

    expect(stubPublishProcessing.publish).toHaveBeenCalledWith("e2e-test-content", false);
    expect(response.body).toEqual({ videoId: "00000000-0000-4000-8000-000000000001", muxAssetId: "local-hello-greeting" });
  });

  it("acknowledgeNeedsReview=true gövdeyle çağrılırsa aynen taşır", async () => {
    await request(app.getHttpServer())
      .post("/content-admin/videos/e2e-test-content/publish")
      .send({ acknowledgeNeedsReview: true })
      .expect(201);

    expect(stubPublishProcessing.publish).toHaveBeenCalledWith("e2e-test-content", true);
  });

  it("geçersiz (kebab-case olmayan) bir contentId'yi 400 ile reddeder, servise hiç gitmez", async () => {
    await request(app.getHttpServer()).post("/content-admin/videos/Not_Valid/publish").send().expect(400);

    expect(stubPublishProcessing.publish).not.toHaveBeenCalled();
  });

  it("geçersiz bir acknowledgeNeedsReview tipini 400 ile reddeder, servise hiç gitmez", async () => {
    await request(app.getHttpServer())
      .post("/content-admin/videos/e2e-test-content/publish")
      .send({ acknowledgeNeedsReview: "yes" })
      .expect(400);

    expect(stubPublishProcessing.publish).not.toHaveBeenCalled();
  });
});
