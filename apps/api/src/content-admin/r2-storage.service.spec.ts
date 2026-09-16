import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { Readable } from "node:stream";
import type { ConfigService } from "@nestjs/config";
import { GetObjectCommand, PutObjectCommand, type S3Client } from "@aws-sdk/client-s3";
import { R2ConfigError, R2ObjectNotFoundError, R2StorageService } from "./r2-storage.service";

/**
 * Gerçek bir Cloudflare ağ çağrısı YOK: `S3Client`'ın `send`'i jest.fn() ile
 * mock'lanıyor (kullanıcı kararı — bkz. görev talimatı). `configService.get` de
 * sabit bir map'ten okuyan basit bir stub; ne Nest DI container'ı ne de gerçek
 * ConfigModule burada devrede — R2StorageService `@Optional()` ikinci
 * constructor argümanı sayesinde Nest DI'dan tamamen bağımsız, doğrudan
 * `new` ile test edilebiliyor (bkz. o dosyadaki yorum).
 */
function fakeConfigService(env: Record<string, string | undefined>): ConfigService {
  return { get: (key: string) => env[key] } as unknown as ConfigService;
}

function fakeS3Client(): { send: jest.Mock } & S3Client {
  return { send: jest.fn().mockResolvedValue({}) } as unknown as { send: jest.Mock } & S3Client;
}

const FULL_ENV = {
  R2_ACCOUNT_ID: "acc123",
  R2_ACCESS_KEY_ID: "key123",
  R2_SECRET_ACCESS_KEY: "secret123",
  R2_BUCKET_NAME: "linguascroll-videos",
  R2_PUBLIC_BASE_URL: "https://media.example.com",
};

describe("R2StorageService.uploadOriginalVideo", () => {
  it("PutObjectCommand'ı doğru bucket/key/contentType ile, tek çağrı olarak gönderir", async () => {
    const s3Client = fakeS3Client();
    const service = new R2StorageService(fakeConfigService(FULL_ENV), s3Client);
    const buffer = Buffer.from("fake-mp4-bytes");

    const { storageKey } = await service.uploadOriginalVideo({
      contentId: "b1-cafe-order",
      buffer,
      contentType: "video/mp4",
    });

    expect(storageKey).toMatch(/^originals\/b1-cafe-order\/[0-9a-f-]+\.mp4$/);
    expect(s3Client.send).toHaveBeenCalledTimes(1);
    const sentCommand = s3Client.send.mock.calls[0]![0] as PutObjectCommand;
    expect(sentCommand).toBeInstanceOf(PutObjectCommand);
    expect(sentCommand.input).toEqual({
      Bucket: "linguascroll-videos",
      Key: storageKey,
      Body: buffer,
      ContentType: "video/mp4",
    });
  });

  it("R2_BUCKET_NAME tanımlı değilse R2ConfigError fırlatır, S3'e hiç istek atmaz", async () => {
    const s3Client = fakeS3Client();
    const service = new R2StorageService(fakeConfigService({ ...FULL_ENV, R2_BUCKET_NAME: undefined }), s3Client);

    await expect(
      service.uploadOriginalVideo({ contentId: "b1-cafe-order", buffer: Buffer.from("x"), contentType: "video/mp4" }),
    ).rejects.toThrow(R2ConfigError);
    expect(s3Client.send).not.toHaveBeenCalled();
  });
});

describe("R2StorageService.buildPlaybackUrl", () => {
  it("R2_PUBLIC_BASE_URL trailing slash içermese de key'i kaybetmeden birleştirir", () => {
    const service = new R2StorageService(fakeConfigService({ ...FULL_ENV, R2_PUBLIC_BASE_URL: "https://media.example.com" }));
    expect(service.buildPlaybackUrl("originals/b1-cafe-order/uuid.mp4")).toBe(
      "https://media.example.com/originals/b1-cafe-order/uuid.mp4",
    );
  });

  it("R2_PUBLIC_BASE_URL trailing slash içerse de AYNI sonucu üretir (deterministik)", () => {
    const service = new R2StorageService(fakeConfigService({ ...FULL_ENV, R2_PUBLIC_BASE_URL: "https://media.example.com/" }));
    expect(service.buildPlaybackUrl("originals/b1-cafe-order/uuid.mp4")).toBe(
      "https://media.example.com/originals/b1-cafe-order/uuid.mp4",
    );
  });

  it("R2_PUBLIC_BASE_URL tanımlı değilse R2ConfigError fırlatır", () => {
    const service = new R2StorageService(fakeConfigService({ ...FULL_ENV, R2_PUBLIC_BASE_URL: undefined }));
    expect(() => service.buildPlaybackUrl("originals/x/y.mp4")).toThrow(R2ConfigError);
  });
});

describe("R2StorageService.downloadOriginalVideo", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "r2-download-test-"));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("GetObjectCommand'ı doğru bucket/key ile gönderir ve stream'i hedef dosyaya yazar", async () => {
    const fakeBytes = Buffer.from("fake-mp4-bytes");
    const s3Client = {
      send: jest.fn().mockResolvedValue({ Body: Readable.from(fakeBytes) }),
    } as unknown as { send: jest.Mock } & S3Client;
    const service = new R2StorageService(fakeConfigService(FULL_ENV), s3Client);
    const destPath = path.join(tmpDir, "downloaded.mp4");

    await service.downloadOriginalVideo("originals/b1-cafe-order/uuid.mp4", destPath);

    expect(s3Client.send).toHaveBeenCalledTimes(1);
    const sentCommand = s3Client.send.mock.calls[0]![0] as GetObjectCommand;
    expect(sentCommand).toBeInstanceOf(GetObjectCommand);
    expect(sentCommand.input).toEqual({ Bucket: "linguascroll-videos", Key: "originals/b1-cafe-order/uuid.mp4" });
    expect(fs.readFileSync(destPath)).toEqual(fakeBytes);
  });

  it('S3 "NoSuchKey" hatasını R2ObjectNotFoundError\'a çevirir, hiçbir dosya yazmaz', async () => {
    const noSuchKeyError = Object.assign(new Error("The specified key does not exist."), { name: "NoSuchKey" });
    const s3Client = { send: jest.fn().mockRejectedValue(noSuchKeyError) } as unknown as { send: jest.Mock } & S3Client;
    const service = new R2StorageService(fakeConfigService(FULL_ENV), s3Client);
    const destPath = path.join(tmpDir, "downloaded.mp4");

    await expect(service.downloadOriginalVideo("originals/b1-cafe-order/missing.mp4", destPath)).rejects.toThrow(
      R2ObjectNotFoundError,
    );
    expect(fs.existsSync(destPath)).toBe(false);
  });

  it("R2_BUCKET_NAME tanımlı değilse R2ConfigError fırlatır, S3'e hiç istek atmaz", async () => {
    const s3Client = { send: jest.fn() } as unknown as { send: jest.Mock } & S3Client;
    const service = new R2StorageService(fakeConfigService({ ...FULL_ENV, R2_BUCKET_NAME: undefined }), s3Client);

    await expect(service.downloadOriginalVideo("originals/b1-cafe-order/uuid.mp4", path.join(tmpDir, "x.mp4"))).rejects.toThrow(
      R2ConfigError,
    );
    expect(s3Client.send).not.toHaveBeenCalled();
  });
});
