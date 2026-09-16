import { BadRequestException } from "@nestjs/common";
import { ContentAdminService } from "./content-admin.service";
import type { R2StorageService } from "./r2-storage.service";
import type { UploadVideoRequest } from "./upload-video.schema";

function fakeR2Storage(): jest.Mocked<Pick<R2StorageService, "uploadOriginalVideo" | "buildPlaybackUrl">> {
  return {
    uploadOriginalVideo: jest.fn().mockResolvedValue({ storageKey: "originals/b1-cafe-order/uuid.mp4" }),
    buildPlaybackUrl: jest.fn().mockReturnValue("https://media.example.com/originals/b1-cafe-order/uuid.mp4"),
  };
}

function fakeFile(overrides: Partial<Express.Multer.File> = {}): Express.Multer.File {
  return {
    buffer: Buffer.from("fake-mp4-bytes"),
    mimetype: "video/mp4",
    originalname: "clip.mp4",
    size: 14,
    fieldname: "file",
    encoding: "7bit",
    stream: undefined as unknown as Express.Multer.File["stream"],
    destination: "",
    filename: "",
    path: "",
    ...overrides,
  };
}

const VALID_BODY: UploadVideoRequest = { contentId: "b1-cafe-order" };

describe("ContentAdminService.uploadDraftVideo", () => {
  it("geçerli bir MP4 upload'ını R2'ye yollar ve draft metadata döner", async () => {
    const r2Storage = fakeR2Storage();
    const service = new ContentAdminService(r2Storage as unknown as R2StorageService);
    const file = fakeFile();

    const result = await service.uploadDraftVideo(file, VALID_BODY);

    expect(r2Storage.uploadOriginalVideo).toHaveBeenCalledWith({
      contentId: "b1-cafe-order",
      buffer: file.buffer,
      contentType: "video/mp4",
    });
    expect(result).toEqual({
      contentId: "b1-cafe-order",
      storageKey: "originals/b1-cafe-order/uuid.mp4",
      playbackUrl: "https://media.example.com/originals/b1-cafe-order/uuid.mp4",
      originalFilename: "clip.mp4",
      sizeBytes: 14,
    });
  });

  it("dosya yoksa R2'ye hiç gitmeden BadRequestException fırlatır", async () => {
    const r2Storage = fakeR2Storage();
    const service = new ContentAdminService(r2Storage as unknown as R2StorageService);

    await expect(service.uploadDraftVideo(undefined, VALID_BODY)).rejects.toThrow(BadRequestException);
    expect(r2Storage.uploadOriginalVideo).not.toHaveBeenCalled();
  });

  it("video/mp4 dışındaki bir mimetype'ı R2'ye hiç göndermeden reddeder", async () => {
    const r2Storage = fakeR2Storage();
    const service = new ContentAdminService(r2Storage as unknown as R2StorageService);
    const file = fakeFile({ mimetype: "text/plain", originalname: "notes.txt" });

    await expect(service.uploadDraftVideo(file, VALID_BODY)).rejects.toThrow(BadRequestException);
    expect(r2Storage.uploadOriginalVideo).not.toHaveBeenCalled();
  });

  it("boş (0 byte) bir dosyayı reddeder", async () => {
    const r2Storage = fakeR2Storage();
    const service = new ContentAdminService(r2Storage as unknown as R2StorageService);
    const file = fakeFile({ size: 0, buffer: Buffer.alloc(0) });

    await expect(service.uploadDraftVideo(file, VALID_BODY)).rejects.toThrow(BadRequestException);
    expect(r2Storage.uploadOriginalVideo).not.toHaveBeenCalled();
  });
});
