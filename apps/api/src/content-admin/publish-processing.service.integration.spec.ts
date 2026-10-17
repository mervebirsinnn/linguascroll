import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { ConflictException, ServiceUnavailableException, UnprocessableEntityException } from "@nestjs/common";
import type { ConfigService } from "@nestjs/config";
import { DeleteObjectCommand, PutObjectCommand, type S3Client } from "@aws-sdk/client-s3";
import { eq } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import type { Pool } from "pg";
import { createTestDatabaseConnection, truncateTestTables } from "../videos/test-database";
import { videosTable } from "../videos/videos.schema";
import { promoteDraftToApproved } from "../content-enrichment/approved-artifact";
import { resolveEnrichedOutputPath } from "../content-enrichment/enrich-transcript";
import { resolveMediaDestination } from "../content-enrichment/publish-content";
import type { PublishDraft } from "../content-enrichment/publish-draft.schema";
import { PublishProcessingService } from "./publish-processing.service";
import { R2StorageService } from "./r2-storage.service";

/**
 * Integration (gerçek Postgres): HTTP publish, CLI ile AYNI use-case'i (`publishApprovedContent`) kullanır ve
 * YALNIZCA approved artifact'ten yayımlar. S3 istemcisi mock'lanır (gerçek R2 çağrısı yok); DB gerçektir, bu
 * yüzden "R2 başarılı + DB başarısız" yarışı gerçek unique-constraint ihlaliyle üretilir.
 */
const R2_ENV: Record<string, string> = {
  R2_ACCOUNT_ID: "acc",
  R2_ACCESS_KEY_ID: "key",
  R2_SECRET_ACCESS_KEY: "secret",
  R2_BUCKET_NAME: "bucket",
  R2_PUBLIC_BASE_URL: "https://media.example.com",
};
const fakeConfig = (env: Record<string, string | undefined>): ConfigService => ({ get: (key: string) => env[key] }) as unknown as ConfigService;

function makeDraft(contentId: string, overrides: Partial<PublishDraft> = {}): PublishDraft {
  return {
    contentId,
    muxAssetId: `local-${contentId}`,
    sourceFile: `${contentId}.mp4`,
    storageKey: null,
    durationMs: 5000,
    topic: "humor",
    cefrLevel: "B2",
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
    quality: { status: "pass", issues: [] },
    ...overrides,
  };
}

describe("PublishProcessingService.publish (integration, gerçek Postgres)", () => {
  let db: NodePgDatabase;
  let pool: Pool;
  let tmp: string;
  let approvedDir: string;
  let mediaSourceDir: string;
  let mediaDir: string;
  let send: jest.Mock;
  let uploadedKeys: string[];

  const CONTENT_ID = "pp-clip";

  const makeService = (config: Record<string, string | undefined> = R2_ENV) => {
    const s3 = { send } as unknown as S3Client;
    return new PublishProcessingService(db, new R2StorageService(fakeConfig(config), s3), { approvedDir, mediaSourceDir, mediaDir });
  };
  const approve = (draft: PublishDraft, extra: { acknowledge?: boolean } = {}) =>
    promoteDraftToApproved(draft, {
      contentId: draft.contentId,
      acknowledgeNeedsReview: extra.acknowledge ?? false,
      note: extra.acknowledge ? "bilinçli" : null,
      overwrite: false,
      media: { localFileName: `${draft.contentId}.mp4` },
      approvedDir,
    });
  const putMedia = (contentId = CONTENT_ID) => fs.writeFileSync(path.join(mediaSourceDir, `${contentId}.mp4`), "fake video bytes");
  const sentCommands = (type: new (...args: never[]) => unknown) => send.mock.calls.map((call) => call[0] as { input: { Key?: string } }).filter((command) => command instanceof type);

  beforeAll(() => {
    const connection = createTestDatabaseConnection();
    db = connection.db;
    pool = connection.pool;
  });

  beforeEach(async () => {
    await truncateTestTables(db);
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), "publish-processing-"));
    approvedDir = path.join(tmp, "approved");
    mediaSourceDir = path.join(tmp, "source");
    mediaDir = path.join(tmp, "public-media");
    fs.mkdirSync(mediaSourceDir);
    uploadedKeys = [];
    send = jest.fn().mockImplementation(async (command: unknown) => {
      if (command instanceof PutObjectCommand) {
        uploadedKeys.push(command.input.Key as string);
      }
      return {};
    });
  });

  afterEach(() => {
    fs.rmSync(tmp, { recursive: true, force: true });
    fs.rmSync(path.dirname(resolveEnrichedOutputPath(CONTENT_ID)), { recursive: true, force: true });
  });

  afterAll(async () => {
    await pool.end();
  });

  describe("approved sınırı (output ASLA okunmaz)", () => {
    it("approved yoksa reddedilir (422), R2'ye ve DB'ye hiçbir yazma olmaz", async () => {
      await expect(makeService().publish(CONTENT_ID)).rejects.toThrow(UnprocessableEntityException);
      expect(send).not.toHaveBeenCalled();
      expect(await db.select().from(videosTable)).toHaveLength(0);
    });

    it("output/<id>/enriched.json MEVCUT ama approved YOKSA yine reddedilir", async () => {
      const outputPath = resolveEnrichedOutputPath(CONTENT_ID);
      fs.mkdirSync(path.dirname(outputPath), { recursive: true });
      fs.writeFileSync(outputPath, JSON.stringify(makeDraft(CONTENT_ID), null, 2));
      putMedia();

      await expect(makeService().publish(CONTENT_ID)).rejects.toThrow(UnprocessableEntityException);
      expect(send).not.toHaveBeenCalled();
      expect(await db.select().from(videosTable)).toHaveLength(0);
    });

    it("geçersiz approved şeması reddedilir (422)", async () => {
      fs.mkdirSync(approvedDir, { recursive: true });
      fs.writeFileSync(path.join(approvedDir, `${CONTENT_ID}.json`), JSON.stringify({ schemaVersion: 2, approval: {}, media: {}, draft: {} }));
      putMedia();
      await expect(makeService().publish(CONTENT_ID)).rejects.toThrow(UnprocessableEntityException);
      expect(await db.select().from(videosTable)).toHaveLength(0);
    });

    it("bayat quality/acknowledgement (terfiden sonra içerik bozuldu) reddedilir (409)", async () => {
      approve(makeDraft(CONTENT_ID));
      putMedia();
      const filePath = path.join(approvedDir, `${CONTENT_ID}.json`);
      const artifact = JSON.parse(fs.readFileSync(filePath, "utf-8"));
      artifact.draft.vocabulary = [{ lemma: "umbrella", gloss: "şemsiye" }]; // yeni, acknowledge edilmemiş uyarı
      fs.writeFileSync(filePath, JSON.stringify(artifact));

      await expect(makeService().publish(CONTENT_ID)).rejects.toThrow(ConflictException);
      expect(send).not.toHaveBeenCalled();
      expect(await db.select().from(videosTable)).toHaveLength(0);
    });

    it("geçerli approved artifact kabul edilir; dosya R2'ye yüklenir, DB storage_key ile yazılır, public/media'ya yazılmaz", async () => {
      approve(makeDraft(CONTENT_ID));
      putMedia();

      const result = await makeService().publish(CONTENT_ID);

      const [video] = await db.select().from(videosTable).where(eq(videosTable.id, result.videoId));
      expect(result.muxAssetId).toBe(`local-${CONTENT_ID}`);
      expect(video?.cefrLevel).toBe("B2");
      expect(uploadedKeys).toHaveLength(1);
      expect(uploadedKeys[0]).toMatch(new RegExp(`^originals/${CONTENT_ID}/[0-9a-f-]+\\.mp4$`));
      expect(video?.storageKey).toBe(uploadedKeys[0]);
      expect(fs.existsSync(resolveMediaDestination(`local-${CONTENT_ID}`))).toBe(false);
      expect(fs.existsSync(mediaDir)).toBe(false);
    });

    it("needsReview içerik, artifact'te içerik bazlı ack varsa yayımlanır (HTTP isteği ack veremez)", async () => {
      approve(makeDraft(CONTENT_ID, { vocabulary: [] }), { acknowledge: true }); // emptyVocabulary → needsReview
      putMedia();
      await expect(makeService().publish(CONTENT_ID)).resolves.toEqual({ videoId: expect.any(String), muxAssetId: `local-${CONTENT_ID}` });
    });

    it("artifact zaten R2-backed ise (storageKey dolu) yeniden upload yapılmaz ve yerel dosya gerekmez", async () => {
      approve(makeDraft(CONTENT_ID, { storageKey: `originals/${CONTENT_ID}/9f8e7d6c-1111-2222-3333-444455556666.mp4` }));
      const result = await makeService().publish(CONTENT_ID);
      const [video] = await db.select().from(videosTable).where(eq(videosTable.id, result.videoId));
      expect(video?.storageKey).toBe(`originals/${CONTENT_ID}/9f8e7d6c-1111-2222-3333-444455556666.mp4`);
      expect(send).not.toHaveBeenCalled();
    });
  });

  describe("R2/DB sırası, idempotency ve telafi", () => {
    it("zaten yayımlanmış içerik: 409 ve R2'ye HİÇ upload yapılmaz (retry yan etkisiz)", async () => {
      approve(makeDraft(CONTENT_ID));
      putMedia();
      const service = makeService();
      await service.publish(CONTENT_ID);
      send.mockClear();

      await expect(service.publish(CONTENT_ID)).rejects.toThrow(ConflictException);
      expect(send).not.toHaveBeenCalled();
      expect(await db.select().from(videosTable)).toHaveLength(1);
    });

    it("R2 başarılı + DB başarısız: yüklenen nesne silinir (telafi), DB'de bu publish'ten satır kalmaz", async () => {
      approve(makeDraft(CONTENT_ID));
      putMedia();
      // Yarış: upload sırasında başka bir yazıcı aynı mux_asset_id'yi ekler → publishContent unique ihlaliyle düşer.
      send.mockImplementation(async (command: unknown) => {
        if (command instanceof PutObjectCommand) {
          uploadedKeys.push(command.input.Key as string);
          await db.insert(videosTable).values({ learningLanguage: "en", cefrLevel: "A1", muxAssetId: `local-${CONTENT_ID}`, topic: "humor", durationMs: 1000 });
        }
        return {};
      });

      await expect(makeService().publish(CONTENT_ID)).rejects.toThrow();

      const deletes = sentCommands(DeleteObjectCommand);
      expect(uploadedKeys).toHaveLength(1);
      expect(deletes).toHaveLength(1);
      expect(deletes[0]!.input.Key).toBe(uploadedKeys[0]);
      const rows = await db.select().from(videosTable);
      expect(rows).toHaveLength(1); // yalnızca yarışı kazanan satır
      expect(rows[0]!.storageKey).toBeNull(); // bizim storage_key'imiz DB'ye hiç yazılmadı
    });

    it("telafiden sonra retry başarılı olur: tek video, yeni R2 anahtarı, ilk anahtar silinmiş", async () => {
      approve(makeDraft(CONTENT_ID));
      putMedia();
      let raced = false;
      send.mockImplementation(async (command: unknown) => {
        if (command instanceof PutObjectCommand) {
          uploadedKeys.push(command.input.Key as string);
          if (!raced) {
            raced = true;
            await db.insert(videosTable).values({ learningLanguage: "en", cefrLevel: "A1", muxAssetId: `local-${CONTENT_ID}`, topic: "humor", durationMs: 1000 });
          }
        }
        return {};
      });
      const service = makeService();
      await expect(service.publish(CONTENT_ID)).rejects.toThrow();
      await db.delete(videosTable).where(eq(videosTable.muxAssetId, `local-${CONTENT_ID}`)); // yarışı kazanan yazıcı geri alındı

      const result = await service.publish(CONTENT_ID);

      expect(uploadedKeys).toHaveLength(2);
      expect(uploadedKeys[0]).not.toBe(uploadedKeys[1]);
      const deleted = sentCommands(DeleteObjectCommand).map((command) => command.input.Key);
      expect(deleted).toEqual([uploadedKeys[0]]); // yalnızca başarısız denemenin nesnesi silindi
      const [video] = await db.select().from(videosTable).where(eq(videosTable.id, result.videoId));
      expect(video?.storageKey).toBe(uploadedKeys[1]);
      expect(await db.select().from(videosTable)).toHaveLength(1);
    });

    it("telafi silmesi de başarısız olursa yetim R2 anahtarı hatada raporlanır (sessiz yetim yok)", async () => {
      approve(makeDraft(CONTENT_ID));
      putMedia();
      send.mockImplementation(async (command: unknown) => {
        if (command instanceof PutObjectCommand) {
          uploadedKeys.push(command.input.Key as string);
          await db.insert(videosTable).values({ learningLanguage: "en", cefrLevel: "A1", muxAssetId: `local-${CONTENT_ID}`, topic: "humor", durationMs: 1000 });
        }
        if (command instanceof DeleteObjectCommand) {
          throw new Error("R2 delete down");
        }
        return {};
      });

      const failure = makeService().publish(CONTENT_ID);
      await expect(failure).rejects.toThrow(UnprocessableEntityException);
      await expect(failure).rejects.toThrow(new RegExp(`yetim nesne.*${uploadedKeys[0]!.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`));
    });

    it("R2 yapılandırması yoksa 503; DB'ye yazılmaz", async () => {
      approve(makeDraft(CONTENT_ID));
      putMedia();
      await expect(makeService({}).publish(CONTENT_ID)).rejects.toThrow(ServiceUnavailableException);
      expect(await db.select().from(videosTable)).toHaveLength(0);
    });

    it("kaynak medya yoksa 422; R2'ye ve DB'ye yazılmaz", async () => {
      approve(makeDraft(CONTENT_ID)); // putMedia() çağrılmadı
      await expect(makeService().publish(CONTENT_ID)).rejects.toThrow(UnprocessableEntityException);
      expect(send).not.toHaveBeenCalled();
      expect(await db.select().from(videosTable)).toHaveLength(0);
    });
  });

  describe("statik sınır: HTTP katmanı output'a erişemez", () => {
    const sources = ["publish-processing.service.ts", "content-admin.controller.ts", "publish.schema.ts"].map((file) => fs.readFileSync(path.join(__dirname, file), "utf-8"));

    it.each(["enriched.json", "loadPublishDraft", "resolveEnrichedPath", "resolveEnrichedOutputPath", "ENRICHMENT_OUTPUT_DIR", "content-enrichment/output", "--from-output", "fromOutput", "ALLOW_UNAPPROVED_CONTENT_PUBLISH"])(
      'HTTP publish kaynakları "%s" içermez',
      (needle) => {
        for (const source of sources) {
          // yalnızca yorum satırlarındaki açıklayıcı anılar serbest: kod satırlarında geçmemeli
          const codeOnly = source.split("\n").filter((line) => !/^\s*(\/\/|\*|\/\*)/.test(line)).join("\n");
          expect(codeOnly).not.toContain(needle);
        }
      },
    );
  });
});
