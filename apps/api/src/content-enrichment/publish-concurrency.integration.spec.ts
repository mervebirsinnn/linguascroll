import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import type { ConfigService } from "@nestjs/config";
import { DeleteObjectCommand, PutObjectCommand, type S3Client } from "@aws-sdk/client-s3";
import { eq } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import type { Pool } from "pg";
import { R2StorageService } from "../content-admin/r2-storage.service";
import { createTestDatabaseConnection, truncateTestTables } from "../videos/test-database";
import { videosTable } from "../videos/videos.schema";
import { promoteDraftToApproved } from "./approved-artifact";
import type { PublishDraft } from "./publish-draft.schema";
import { PublishAlreadyExistsError, publishApprovedContent, type PublishStorage } from "./publish-content";

/**
 * Eşzamanlı R2 publish sahipliği: iki publish AYNI content/mux için başlar. Her deneme benzersiz R2 anahtarı kullanır,
 * DB'de yalnızca biri kayıt oluşturur, kaybeden SADECE kendi yüklediği anahtarı siler, kazananın DB'nin referans verdiği
 * nesne ASLA silinmez. Gerçek Postgres + mock S3. Zamanlama tesadüfe bırakılmaz: iki işlem, upload ÖNCESİNDE bir barrier'da
 * buluşturulur (iki attempt de idempotency kontrolünü geçmiş olur), sonra ikisi birlikte bırakılır.
 */
const R2_ENV: Record<string, string> = { R2_ACCOUNT_ID: "a", R2_ACCESS_KEY_ID: "b", R2_SECRET_ACCESS_KEY: "c", R2_BUCKET_NAME: "bucket", R2_PUBLIC_BASE_URL: "https://x" };
const fakeConfig = { get: (key: string) => R2_ENV[key] } as unknown as ConfigService;

/** N katılımcı gelene kadar bekleten, sonra hepsini serbest bırakan deterministik barrier. */
function createBarrier(parties: number) {
  let arrived = 0;
  let release!: () => void;
  const opened = new Promise<void>((resolve) => {
    release = resolve;
  });
  return {
    async wait(): Promise<void> {
      arrived += 1;
      if (arrived === parties) {
        release();
      }
      await opened;
    },
    get arrived() {
      return arrived;
    },
  };
}

function makeDraft(contentId: string): PublishDraft {
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
  };
}

describe("eşzamanlı R2 publish sahipliği (gerçek Postgres + mock S3, barrier ile kontrollü)", () => {
  let db: NodePgDatabase;
  let pool: Pool;
  let tmp: string;
  let approvedDir: string;
  let mediaSourceDir: string;
  const CONTENT_ID = "race-clip";

  beforeAll(() => {
    const connection = createTestDatabaseConnection();
    db = connection.db;
    pool = connection.pool;
  });
  beforeEach(async () => {
    await truncateTestTables(db);
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), "publish-race-"));
    approvedDir = path.join(tmp, "approved");
    mediaSourceDir = path.join(tmp, "source");
    fs.mkdirSync(mediaSourceDir);
    promoteDraftToApproved(makeDraft(CONTENT_ID), {
      contentId: CONTENT_ID,
      acknowledgeNeedsReview: false,
      note: null,
      overwrite: false,
      media: { localFileName: `${CONTENT_ID}.mp4` },
      approvedDir,
    });
    fs.writeFileSync(path.join(mediaSourceDir, `${CONTENT_ID}.mp4`), "fake video bytes");
  });
  afterEach(() => {
    fs.rmSync(tmp, { recursive: true, force: true });
  });
  afterAll(async () => {
    await pool.end();
  });

  /** İki publish'i upload ÖNCESİNDE aynı barrier noktasında buluşturan, S3'ü mock'layan storage. */
  function raceHarness() {
    const puts: string[] = [];
    const deletes: string[] = [];
    const s3 = {
      send: jest.fn(async (command: unknown) => {
        if (command instanceof PutObjectCommand) {
          puts.push(command.input.Key as string);
        } else if (command instanceof DeleteObjectCommand) {
          deletes.push(command.input.Key as string);
        }
        return {};
      }),
    } as unknown as S3Client;
    const real = new R2StorageService(fakeConfig, s3);
    const barrier = createBarrier(2);
    const storage: PublishStorage = {
      uploadOriginalVideo: async (params) => {
        await barrier.wait(); // iki attempt de idempotency kontrolünü geçip upload'a gelmeden ilerlemez
        return real.uploadOriginalVideo(params);
      },
      deleteOriginalVideo: (key) => real.deleteOriginalVideo(key),
    };
    return { storage, puts, deletes, barrier };
  }

  const run = (storage: PublishStorage) => publishApprovedContent(db, CONTENT_ID, { mode: "r2", storage, approvedDir, mediaSourceDir });

  it("her deneme benzersiz anahtar kullanır; yalnızca biri DB kaydı oluşturur; kaybeden yalnızca kendi anahtarını siler; kazananın nesnesi silinmez", async () => {
    const { storage, puts, deletes, barrier } = raceHarness();

    const [first, second] = await Promise.allSettled([run(storage), run(storage)]);

    // barrier: iki işlem de upload noktasına ulaştı (zamanlama tesadüfi değil)
    expect(barrier.arrived).toBe(2);
    expect(puts).toHaveLength(2);
    expect(new Set(puts).size).toBe(2); // benzersiz anahtarlar
    for (const key of puts) {
      expect(key).toMatch(new RegExp(`^originals/${CONTENT_ID}/[0-9a-f-]{36}\\.mp4$`));
    }

    const outcomes = [first, second];
    const winners = outcomes.filter((o): o is PromiseFulfilledResult<Awaited<ReturnType<typeof run>>> => o.status === "fulfilled");
    const losers = outcomes.filter((o): o is PromiseRejectedResult => o.status === "rejected");
    expect(winners).toHaveLength(1);
    expect(losers).toHaveLength(1);
    expect(losers[0]!.reason).toBeInstanceOf(PublishAlreadyExistsError); // ham pg hatası değil → HTTP'de 409

    const winnerKey = winners[0]!.value.storageKey!;
    const loserKey = puts.find((key) => key !== winnerKey)!;
    expect(puts).toContain(winnerKey);

    // DB: tek satır ve kazananın anahtarını referans veriyor
    const rows = await db.select().from(videosTable).where(eq(videosTable.muxAssetId, `local-${CONTENT_ID}`));
    expect(rows).toHaveLength(1);
    expect(rows[0]!.storageKey).toBe(winnerKey);

    // sahiplik: kaybeden yalnızca KENDİ anahtarını sildi; kazananın DB'nin referans verdiği nesne asla silinmedi
    expect(deletes).toEqual([loserKey]);
    expect(deletes).not.toContain(winnerKey);
    expect(rows.map((row) => row.storageKey)).not.toContain(loserKey);
  });

  it("aynı yarış 5 kez tekrarında da sahiplik değişmezleri korunur (barrier ile deterministik, timing'e bağlı değil)", async () => {
    for (let round = 0; round < 5; round++) {
      await truncateTestTables(db);
      const { storage, puts, deletes } = raceHarness();

      const results = await Promise.allSettled([run(storage), run(storage)]);

      const fulfilled = results.filter((r): r is PromiseFulfilledResult<Awaited<ReturnType<typeof run>>> => r.status === "fulfilled");
      expect(fulfilled).toHaveLength(1);
      const winnerKey = fulfilled[0]!.value.storageKey!;
      expect(new Set(puts).size).toBe(2);
      expect(deletes).toHaveLength(1);
      expect(deletes[0]).not.toBe(winnerKey);
      expect(puts).toContain(deletes[0]);
      const [row] = await db.select().from(videosTable);
      expect(row!.storageKey).toBe(winnerKey);
    }
  });
});
