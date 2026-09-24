import { EventEmitter } from "node:events";
import type { ChildProcess } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";
import { BadRequestException, NotFoundException, UnprocessableEntityException } from "@nestjs/common";
import { R2ObjectNotFoundError, type R2StorageService } from "./r2-storage.service";
import { parseSttDraft, STT_OUTPUT_ROOT, SttProcessingService } from "./stt-processing.service";

/**
 * Gerçek bir child process HİÇ başlatılmıyor: `spawn`'ın dönüşünü, sadece bu
 * dosyanın kullandığı üç şeyi (`stderr` event emitter, `"error"`, `"exit"`)
 * taklit eden minimal bir `EventEmitter` ile sahteliyoruz — `run-stt-pipeline.ts`
 * kendi testlerinde de gerçek Python/faster-whisper'ı çalıştırmıyor, aynı sınırı
 * burada da koruyoruz (bkz. Chunk 17B teknik inceleme: "gerçek uçtan uca test
 * bu ortamda pratik değil").
 */
function fakeChildProcess(): EventEmitter & { stderr: EventEmitter } {
  const child = new EventEmitter() as EventEmitter & { stderr: EventEmitter };
  child.stderr = new EventEmitter();
  return child;
}

/**
 * `emitAfterSpawn`'ı `spawnFn`'in KENDİ mock implementasyonunun İÇİNE koyuyoruz
 * (bir `queueMicrotask`/`setTimeout` ile testin dışarıdan "tahmin ederek"
 * zamanlaması yerine) — `runSttPipeline` `spawnFn(...)`'i çağırdıktan HEMEN
 * SONRA, hâlâ AYNI senkron çalışma çerçevesinde `child.on("error"/"exit", ...)`
 * listener'larını ekliyor; bu yüzden emit'i `setImmediate` ile (spawnFn'in
 * kendi çağrıldığı anın BİR SONRAKİ event-loop turuna) ertelemek, listener'lar
 * kesinlikle eklenmiş OLDUKTAN SONRA ateşlenmesini garanti ediyor. Bunun
 * dışındaki bir yaklaşım (testin kendi `queueMicrotask`'ı) `downloadToTemp`'in
 * kendi await zincirinin kaç microtask turu sürdüğüne bağlı bir YARIŞ durumu
 * yaratıyordu (gözlemlenen gerçek hata: "exit" listener eklenmeden emit edildiği
 * için promise hiç resolve/reject olmuyor, test timeout'a düşüyordu).
 */
function fakeSpawnReturning(child: EventEmitter & { stderr: EventEmitter }, emitAfterSpawn: () => void): jest.Mock {
  return jest.fn().mockImplementation(() => {
    setImmediate(emitAfterSpawn);
    return child as unknown as ChildProcess;
  });
}

function fakeR2Storage(): jest.Mocked<Pick<R2StorageService, "downloadOriginalVideo">> {
  return { downloadOriginalVideo: jest.fn().mockResolvedValue(undefined) };
}

const CONTENT_ID = "b1-cafe-order";
const STORAGE_KEY = "originals/b1-cafe-order/9f8e7d6c-1111-2222-3333-444455556666.mp4";

describe("SttProcessingService.processStt", () => {
  it("storageKey contentId'nin prefix'ine uymuyorsa BadRequestException fırlatır, R2'ye hiç gitmez", async () => {
    const r2Storage = fakeR2Storage();
    const spawnFn = jest.fn();
    const service = new SttProcessingService(r2Storage as unknown as R2StorageService, spawnFn as unknown as typeof import("node:child_process").spawn);

    await expect(service.processStt(CONTENT_ID, "originals/other-content/uuid.mp4")).rejects.toThrow(BadRequestException);
    expect(r2Storage.downloadOriginalVideo).not.toHaveBeenCalled();
    expect(spawnFn).not.toHaveBeenCalled();
  });

  it("R2ObjectNotFoundError'ı NotFoundException'a çevirir, STT subprocess'i hiç başlatmaz", async () => {
    const r2Storage = fakeR2Storage();
    r2Storage.downloadOriginalVideo.mockRejectedValue(new R2ObjectNotFoundError("bulunamadı"));
    const spawnFn = jest.fn();
    const service = new SttProcessingService(r2Storage as unknown as R2StorageService, spawnFn as unknown as typeof import("node:child_process").spawn);

    await expect(service.processStt(CONTENT_ID, STORAGE_KEY)).rejects.toThrow(NotFoundException);
    expect(spawnFn).not.toHaveBeenCalled();
  });

  it("STT subprocess'i doğru argümanlarla (process.execPath, --input, --content-id) çağırır ve indirilen temp dosyayı her koşulda siler", async () => {
    const r2Storage = fakeR2Storage();
    let capturedTempPath = "";
    r2Storage.downloadOriginalVideo.mockImplementation(async (_storageKey: string, destPath: string) => {
      capturedTempPath = destPath;
      fs.writeFileSync(destPath, "fake-mp4-bytes");
    });

    const child = fakeChildProcess();
    const spawnFn = fakeSpawnReturning(child, () => child.emit("exit", 0));
    const service = new SttProcessingService(r2Storage as unknown as R2StorageService, spawnFn as unknown as typeof import("node:child_process").spawn);

    const draftDir = path.join(STT_OUTPUT_ROOT, CONTENT_ID);
    fs.mkdirSync(draftDir, { recursive: true });
    fs.writeFileSync(
      path.join(draftDir, "draft.json"),
      JSON.stringify({
        languageStatus: "ready",
        detectedLanguage: "en",
        languageProbability: 0.95,
        durationMs: 5000,
        segments: [{ ordinal: 1, startMs: 0, endMs: 1000, text: "hello" }],
      }),
    );

    try {
      const result = await service.processStt(CONTENT_ID, STORAGE_KEY);

      expect(spawnFn).toHaveBeenCalledWith(
        process.execPath,
        expect.arrayContaining(["--input", capturedTempPath, "--content-id", CONTENT_ID]),
        expect.objectContaining({ stdio: ["ignore", "pipe", "pipe"] }),
      );
      expect(result).toEqual({
        contentId: CONTENT_ID,
        storageKey: STORAGE_KEY,
        languageStatus: "ready",
        detectedLanguage: "en",
        languageProbability: 0.95,
        durationMs: 5000,
        segments: [{ ordinal: 1, startMs: 0, endMs: 1000, text: "hello" }],
      });
      expect(fs.existsSync(capturedTempPath)).toBe(false);
    } finally {
      fs.rmSync(draftDir, { recursive: true, force: true });
    }
  });

  it("Chunk 17D — draft.json'ı storageKey ile zenginleştirip DİSKE GERİ YAZAR (provenance zincirinin başlangıcı, enrich endpoint'inin sonra okuyacağı alan)", async () => {
    const r2Storage = fakeR2Storage();
    r2Storage.downloadOriginalVideo.mockImplementation(async (_storageKey: string, destPath: string) => {
      fs.writeFileSync(destPath, "fake-mp4-bytes");
    });

    const child = fakeChildProcess();
    const spawnFn = fakeSpawnReturning(child, () => child.emit("exit", 0));
    const service = new SttProcessingService(r2Storage as unknown as R2StorageService, spawnFn as unknown as typeof import("node:child_process").spawn);

    const draftDir = path.join(STT_OUTPUT_ROOT, CONTENT_ID);
    const draftPath = path.join(draftDir, "draft.json");
    fs.mkdirSync(draftDir, { recursive: true });
    fs.writeFileSync(
      draftPath,
      JSON.stringify({
        contentId: CONTENT_ID,
        sourceFile: "/tmp/original-stt-source.mp4",
        languageStatus: "ready",
        detectedLanguage: "en",
        languageProbability: 0.95,
        durationMs: 5000,
        segments: [{ ordinal: 1, startMs: 0, endMs: 1000, text: "hello" }],
      }),
    );

    try {
      await service.processStt(CONTENT_ID, STORAGE_KEY);

      const onDisk = JSON.parse(fs.readFileSync(draftPath, "utf-8"));
      expect(onDisk.storageKey).toBe(STORAGE_KEY);
      // scripts/stt'nin KENDİ yazdığı alanlar (sourceFile dahil) korunuyor —
      // sadece storageKey EKLENDİ, hiçbir şey silinmedi/değişmedi.
      expect(onDisk.sourceFile).toBe("/tmp/original-stt-source.mp4");
      expect(onDisk.contentId).toBe(CONTENT_ID);
    } finally {
      fs.rmSync(draftDir, { recursive: true, force: true });
    }
  });

  it("subprocess non-zero exit code ile biterse UnprocessableEntityException fırlatır (stderr tail dahil), temp dosyayı yine de siler", async () => {
    const r2Storage = fakeR2Storage();
    let capturedTempPath = "";
    r2Storage.downloadOriginalVideo.mockImplementation(async (_storageKey: string, destPath: string) => {
      capturedTempPath = destPath;
      fs.writeFileSync(destPath, "fake-mp4-bytes");
    });

    const child = fakeChildProcess();
    const spawnFn = fakeSpawnReturning(child, () => {
      child.stderr.emit("data", Buffer.from("HATA: ffmpeg bulunamadı\n"));
      child.emit("exit", 1);
    });
    const service = new SttProcessingService(r2Storage as unknown as R2StorageService, spawnFn as unknown as typeof import("node:child_process").spawn);

    await expect(service.processStt(CONTENT_ID, STORAGE_KEY)).rejects.toThrow(UnprocessableEntityException);
    expect(fs.existsSync(capturedTempPath)).toBe(false);
  });

  it('spawn "error" event\'i fırlatırsa (ör. node binary bulunamadı) UnprocessableEntityException\'a çevirir', async () => {
    const r2Storage = fakeR2Storage();
    r2Storage.downloadOriginalVideo.mockImplementation(async (_storageKey: string, destPath: string) => {
      fs.writeFileSync(destPath, "fake-mp4-bytes");
    });

    const child = fakeChildProcess();
    const spawnFn = fakeSpawnReturning(child, () => child.emit("error", new Error("ENOENT")));
    const service = new SttProcessingService(r2Storage as unknown as R2StorageService, spawnFn as unknown as typeof import("node:child_process").spawn);

    await expect(service.processStt(CONTENT_ID, STORAGE_KEY)).rejects.toThrow(UnprocessableEntityException);
  });
});

describe("parseSttDraft", () => {
  it("geçerli bir draft.json içeriğini ProcessSttResponse'a dönüştürür, sourceFile'ı response'a DAHİL ETMEZ", () => {
    const rawDraft = {
      contentId: CONTENT_ID,
      sourceFile: "/tmp/linguascroll-stt-input/should-not-leak.mp4",
      languageStatus: "ready",
      detectedLanguage: "en",
      languageProbability: 0.9,
      durationMs: 3000,
      segments: [{ ordinal: 1, startMs: 0, endMs: 500, text: "hi" }],
    };

    const result = parseSttDraft(rawDraft, CONTENT_ID, STORAGE_KEY);

    expect(result).toEqual({
      contentId: CONTENT_ID,
      storageKey: STORAGE_KEY,
      languageStatus: "ready",
      detectedLanguage: "en",
      languageProbability: 0.9,
      durationMs: 3000,
      segments: [{ ordinal: 1, startMs: 0, endMs: 500, text: "hi" }],
    });
    expect(result).not.toHaveProperty("sourceFile");
  });

  it("draft.json beklenen şekilde değilse UnprocessableEntityException fırlatır", () => {
    expect(() => parseSttDraft({ languageStatus: "ready" }, CONTENT_ID, STORAGE_KEY)).toThrow(UnprocessableEntityException);
  });
});
