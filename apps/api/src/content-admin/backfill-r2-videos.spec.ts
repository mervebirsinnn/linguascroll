import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { HeadObjectCommand, PutObjectCommand, type S3Client } from "@aws-sdk/client-s3";
import type { Database } from "../database/database.module";
import { BackfillError, backfillOneVideo, deriveContentId, parseArgs, resolveLocalMediaPath } from "./backfill-r2-videos";

describe("parseArgs", () => {
  it("--video-id verilmezse undefined döner (tüm storage_key NULL videolar hedeflenir)", () => {
    expect(parseArgs([])).toEqual({ videoId: undefined });
  });

  it("--video-id'yi ayrıştırır", () => {
    expect(parseArgs(["--video-id", "abc-123"])).toEqual({ videoId: "abc-123" });
  });

  it("bilinmeyen argümanda BackfillError fırlatır", () => {
    expect(() => parseArgs(["--unknown"])).toThrow(BackfillError);
  });
});

describe("deriveContentId", () => {
  it('"local-" önekini soyar', () => {
    expect(deriveContentId("local-baking-bread")).toBe("baking-bread");
  });

  it('"local-" önekiyle başlamıyorsa BackfillError fırlatır', () => {
    expect(() => deriveContentId("mux-abc123")).toThrow(BackfillError);
  });
});

describe("resolveLocalMediaPath", () => {
  it('"local-<slug>" muxAssetId\'sinden <mediaDir>/<slug>.mp4 türetir', () => {
    expect(resolveLocalMediaPath("local-dog-three-words", "/media")).toBe(path.join("/media", "dog-three-words.mp4"));
  });
});

function fakeS3Client(overrides?: Partial<{ send: jest.Mock }>): { send: jest.Mock } & S3Client {
  return { send: jest.fn().mockResolvedValue({}), ...overrides } as unknown as { send: jest.Mock } & S3Client;
}

/**
 * `r2-storage.service.spec.ts`'teki "gerçek ağ çağrısı yok, S3Client.send
 * mock'lanır" desenini takip ediyor. `db` tarafı için de aynı minimalist stub
 * yaklaşımı: `backfillOneVideo`'nun kullandığı TEK zincir (`update().set().where().returning()`)
 * dışında hiçbir şeyi taklit etmiyoruz — gerçek Drizzle davranışı (SQL üretimi,
 * gerçek UPDATE) burada DEĞİL, canary'nin gerçek DB'ye karşı çalıştırılmasıyla
 * doğrulanıyor.
 */
function fakeDb(returning: Array<{ id: string }>): { db: Database; updateCalls: unknown[] } {
  const updateCalls: unknown[] = [];
  const chain = {
    set: (values: unknown) => {
      updateCalls.push(values);
      return chain;
    },
    where: () => chain,
    returning: async () => returning,
  };
  const db = { update: () => chain } as unknown as Database;
  return { db, updateCalls };
}

describe("backfillOneVideo", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "backfill-r2-test-"));
    fs.writeFileSync(path.join(tmpDir, "baking-bread.mp4"), "fake-mp4-bytes");
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("storage_key zaten doluysa hiçbir S3/DB çağrısı yapmadan skip döner", async () => {
    const s3Client = fakeS3Client();
    const { db } = fakeDb([]);

    const result = await backfillOneVideo(
      db,
      s3Client,
      "linguascroll-videos",
      { id: "v1", muxAssetId: "local-baking-bread", storageKey: "originals/baking-bread/existing.mp4" },
      tmpDir,
    );

    expect(result).toEqual({
      videoId: "v1",
      muxAssetId: "local-baking-bread",
      status: "skipped-already-has-storage-key",
      storageKey: "originals/baking-bread/existing.mp4",
    });
    expect(s3Client.send).not.toHaveBeenCalled();
  });

  it("yerel dosya yoksa failed döner, S3'e hiç istek atmaz", async () => {
    const s3Client = fakeS3Client();
    const { db } = fakeDb([]);

    const result = await backfillOneVideo(db, s3Client, "linguascroll-videos", { id: "v1", muxAssetId: "local-missing-video", storageKey: null }, tmpDir);

    expect(result.status).toBe("failed");
    expect(result.error).toMatch(/bulunamadı/);
    expect(s3Client.send).not.toHaveBeenCalled();
  });

  it("upload+head başarılıysa PutObject sonra HeadObject gönderir ve storage_key'i UPDATE eder", async () => {
    const s3Client = fakeS3Client();
    const { db, updateCalls } = fakeDb([{ id: "v1" }]);

    const result = await backfillOneVideo(db, s3Client, "linguascroll-videos", { id: "v1", muxAssetId: "local-baking-bread", storageKey: null }, tmpDir);

    expect(result.status).toBe("uploaded");
    expect(result.storageKey).toMatch(/^originals\/baking-bread\/[0-9a-f-]+\.mp4$/);
    expect(s3Client.send).toHaveBeenCalledTimes(2);
    expect(s3Client.send.mock.calls[0]![0]).toBeInstanceOf(PutObjectCommand);
    expect(s3Client.send.mock.calls[1]![0]).toBeInstanceOf(HeadObjectCommand);
    expect(updateCalls).toEqual([{ storageKey: result.storageKey }]);
  });

  it("PutObject başarısız olursa failed döner, DB'ye hiç UPDATE gitmez", async () => {
    const s3Client = fakeS3Client({ send: jest.fn().mockRejectedValue(new Error("network error")) });
    const { db, updateCalls } = fakeDb([{ id: "v1" }]);

    const result = await backfillOneVideo(db, s3Client, "linguascroll-videos", { id: "v1", muxAssetId: "local-baking-bread", storageKey: null }, tmpDir);

    expect(result.status).toBe("failed");
    expect(result.error).toBe("network error");
    expect(updateCalls).toEqual([]);
  });

  it("HeadObject (varlık doğrulaması) başarısız olursa failed döner, DB'ye hiç UPDATE gitmez", async () => {
    const send = jest.fn().mockResolvedValueOnce({}).mockRejectedValueOnce(new Error("not found"));
    const s3Client = fakeS3Client({ send });
    const { db, updateCalls } = fakeDb([{ id: "v1" }]);

    const result = await backfillOneVideo(db, s3Client, "linguascroll-videos", { id: "v1", muxAssetId: "local-baking-bread", storageKey: null }, tmpDir);

    expect(result.status).toBe("failed");
    expect(updateCalls).toEqual([]);
  });

  it("UPDATE 0 satır etkilerse (satır beklenmedik şekilde zaten dolu) BackfillError fırlatır", async () => {
    const s3Client = fakeS3Client();
    const { db } = fakeDb([]);

    await expect(
      backfillOneVideo(db, s3Client, "linguascroll-videos", { id: "v1", muxAssetId: "local-baking-bread", storageKey: null }, tmpDir),
    ).rejects.toThrow(BackfillError);
  });
});
