import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import type { PlayableVideo } from "@linguascroll/shared-types";
import { eq } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import type { Pool } from "pg";
import { rankVideos } from "../personalization/personalization-ranking";
import { createTestDatabaseConnection, truncateTestTables } from "../videos/test-database";
import { VideosRepository } from "../videos/videos-repository";
import { videosTable } from "../videos/videos.schema";
import { promoteDraftToApproved } from "./approved-artifact";
import type { PublishDraft } from "./publish-draft.schema";
import { PublishAlreadyExistsError, PublishPipelineError, publishApprovedContent, type PublishStorage } from "./publish-content";

/**
 * `publishApprovedContent` — CLI/HTTP ortak use-case'in gerçek Postgres entegrasyonu: yerel (dev) mod, R2-backed mod ve
 * "contentId prefix'i davranışsal değildir" kanıtı. (R2 upload→DB→telafi/idempotency senaryoları HTTP servisi üzerinden
 * publish-processing.service.integration.spec.ts'te; burada storage doğrudan mock'lanır.)
 */
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

describe("publishApprovedContent (integration, gerçek Postgres)", () => {
  let db: NodePgDatabase;
  let pool: Pool;
  let tmp: string;
  let approvedDir: string;
  let mediaSourceDir: string;
  let mediaDir: string;

  const approve = (draft: PublishDraft) =>
    promoteDraftToApproved(draft, {
      contentId: draft.contentId,
      acknowledgeNeedsReview: false,
      note: null,
      overwrite: false,
      media: { localFileName: `${draft.contentId}.mp4` },
      approvedDir,
    });
  const putMedia = (contentId: string) => fs.writeFileSync(path.join(mediaSourceDir, `${contentId}.mp4`), "fake video bytes");
  const options = (extra: object = {}) => ({ mode: "local" as const, storage: null, approvedDir, mediaSourceDir, mediaDir, ...extra });

  beforeAll(() => {
    const connection = createTestDatabaseConnection();
    db = connection.db;
    pool = connection.pool;
  });
  beforeEach(async () => {
    await truncateTestTables(db);
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), "publish-approved-"));
    approvedDir = path.join(tmp, "approved");
    mediaSourceDir = path.join(tmp, "source");
    mediaDir = path.join(tmp, "public-media");
    fs.mkdirSync(mediaSourceDir);
  });
  afterEach(() => {
    fs.rmSync(tmp, { recursive: true, force: true });
  });
  afterAll(async () => {
    await pool.end();
  });

  describe("yerel (dev) mod", () => {
    it("medyayı artifact'teki media.localFileName'den okur, muxAssetId-türevi adla public/media'ya kopyalar, storage_key NULL", async () => {
      approve(makeDraft("loc-clip"));
      putMedia("loc-clip");

      const result = await publishApprovedContent(db, "loc-clip", options());

      expect(result.mediaMode).toBe("local-copy");
      expect(fs.readFileSync(path.join(mediaDir, "loc-clip.mp4"), "utf-8")).toBe("fake video bytes");
      const [video] = await db.select().from(videosTable).where(eq(videosTable.id, result.videoId));
      expect(video?.storageKey).toBeNull();
    });

    it("kaynak dosya yoksa PublishPipelineError; DB ve public/media boş", async () => {
      approve(makeDraft("loc-missing"));
      await expect(publishApprovedContent(db, "loc-missing", options())).rejects.toThrow(PublishPipelineError);
      expect(await db.select().from(videosTable)).toHaveLength(0);
      expect(fs.existsSync(mediaDir)).toBe(false);
    });

    it("r2 modunda storage yapılandırılmamışsa reddedilir (sessizce yerel kopyaya düşmez)", async () => {
      approve(makeDraft("loc-mov"));
      putMedia("loc-mov");
      await expect(publishApprovedContent(db, "loc-mov", options({ mode: "r2", storage: null }))).rejects.toThrow(/storage/);
      expect(await db.select().from(videosTable)).toHaveLength(0);
    });

    it("zaten yayımlanmışsa idempotency kontrolü yan etkiden ÖNCE çalışır: yerel kopya oluşmaz", async () => {
      approve(makeDraft("loc-race"));
      putMedia("loc-race");
      await db.insert(videosTable).values({ learningLanguage: "en", cefrLevel: "A1", muxAssetId: "local-loc-race", topic: "humor", durationMs: 1000 });

      await expect(publishApprovedContent(db, "loc-race", options())).rejects.toThrow(PublishAlreadyExistsError);
      expect(fs.existsSync(path.join(mediaDir, "loc-race.mp4"))).toBe(false);
    });
  });

  describe("R2-backed artifact (storageKey dolu)", () => {
    it("storage kullanılmaz; storage_key DB'ye yazılır", async () => {
      const storage: PublishStorage = { uploadOriginalVideo: jest.fn(), deleteOriginalVideo: jest.fn() };
      approve(makeDraft("r2-clip", { storageKey: "originals/r2-clip/9f8e7d6c-1111-2222-3333-444455556666.mp4" }));

      const result = await publishApprovedContent(db, "r2-clip", options({ mode: "r2", storage }));

      expect(result.mediaMode).toBe("existing-r2");
      expect(storage.uploadOriginalVideo).not.toHaveBeenCalled();
      const [video] = await db.select().from(videosTable).where(eq(videosTable.id, result.videoId));
      expect(video?.storageKey).toBe("originals/r2-clip/9f8e7d6c-1111-2222-3333-444455556666.mp4");
    });
  });

  describe("CEFR / contentId: davranış cefrLevel'dan gelir, contentId prefix'inden DEĞİL", () => {
    it("a1-* prefix'li içerik B2 olarak, c1-* prefix'li içerik A1 olarak yayınlanır ve ranking cefrLevel'ı izler", async () => {
      const storage: PublishStorage = { uploadOriginalVideo: jest.fn(), deleteOriginalVideo: jest.fn() };
      approve(makeDraft("a1-fake-prefix-clip", { cefrLevel: "B2", storageKey: "originals/a1-fake-prefix-clip/9f8e7d6c-1111-2222-3333-444455556666.mp4" }));
      approve(makeDraft("c1-fake-prefix-clip", { cefrLevel: "A1", storageKey: "originals/c1-fake-prefix-clip/9f8e7d6c-1111-2222-3333-444455556667.mp4" }));
      await publishApprovedContent(db, "a1-fake-prefix-clip", options({ mode: "r2", storage }));
      await publishApprovedContent(db, "c1-fake-prefix-clip", options({ mode: "r2", storage }));

      const rows = await db.select().from(videosTable);
      const byMux = new Map(rows.map((row) => [row.muxAssetId, row]));
      expect(byMux.get("local-a1-fake-prefix-clip")?.cefrLevel).toBe("B2"); // prefix "a1" ama gerçek seviye B2
      expect(byMux.get("local-c1-fake-prefix-clip")?.cefrLevel).toBe("A1"); // prefix "c1" ama gerçek seviye A1
      // contentId hiçbir yerde saklanmaz: videos tablosunda böyle bir kolon yok.
      expect(Object.keys(rows[0]!)).not.toContain("contentId");

      const videos = await new VideosRepository(db).findVideos();
      const playable: PlayableVideo[] = videos.map((video) => ({ ...video, playbackUrl: "https://media.example.com/x.mp4" }));
      const idOf = (mux: string) => byMux.get(mux)!.id;
      const preferB2 = rankVideos(playable, new Map(), { level: "B2", topics: [] });
      const preferA1 = rankVideos(playable, new Map(), { level: "A1", topics: [] });
      expect(preferB2[0]!.id).toBe(idOf("local-a1-fake-prefix-clip"));
      expect(preferA1[0]!.id).toBe(idOf("local-c1-fake-prefix-clip"));
    });
  });
});
