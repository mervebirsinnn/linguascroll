import { randomUUID } from "node:crypto";
import { spawn } from "node:child_process";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { BadRequestException, Injectable, NotFoundException, Optional, UnprocessableEntityException } from "@nestjs/common";
import { isOwnedOriginalVideoStorageKey } from "./build-storage-key";
import { processSttResponseSchema, type ProcessSttResponse } from "./process-stt.schema";
import { R2ObjectNotFoundError, R2StorageService } from "./r2-storage.service";

/**
 * `typeof spawn` yerine bu daralt olmuş tip: test'te (bkz. stt-processing.service.spec.ts)
 * gerçek bir child process başlatmadan, `stderr`/`on("error")`/`on("exit")`
 * davranışını taklit eden minimal bir sahte döndürebilmek için — `ChildProcess`'in
 * TÜMÜNÜ implemente etmeye gerek yok, sadece burada KULLANILAN üç şey.
 */
type SpawnFn = typeof spawn;

/**
 * Chunk 17B — `apps/api/scripts/stt/dist/run-stt-pipeline.js`'e mutlak yol.
 * `__dirname` derlenmiş haliyle `apps/api/dist/content-admin` olacağı için
 * (tsconfig.build.json: rootDir=src, outDir=dist) iki seviye yukarısı
 * `apps/api`'nin kendisi. Script'in TS kaynağı BURADAN import EDİLMİYOR —
 * script kasıtlı olarak NestJS'in dışında, kendi tsconfig/jest.config'iyle
 * derleniyor (bkz. run-stt-pipeline.ts'teki "Bu dosya NestJS'in HİÇBİR
 * parçası DEĞİL" yorumu) — o izolasyonu korumak için burada SADECE derlenmiş
 * çıktısı subprocess olarak çağrılıyor, hiçbir modülü import edilmiyor.
 */
const STT_SCRIPT_PATH = path.resolve(__dirname, "..", "..", "scripts", "stt", "dist", "run-stt-pipeline.js");
export const STT_OUTPUT_ROOT = path.resolve(__dirname, "..", "..", "scripts", "stt", "output");
const TEMP_DOWNLOAD_DIR = path.join(os.tmpdir(), "linguascroll-stt-input");

/**
 * Chunk 17B — dosya okuma (I/O) ile şekil doğrulamayı (saf mantık) ayırıyor,
 * `run-stt-pipeline.ts`/mobile hook'larındaki "state-transition mantığını
 * pure fonksiyona çıkar, testte gerçek I/O'ya gerek kalmasın" desenini takip
 * ederek — `stt-processing.service.spec.ts` bunu gerçek bir dosya yazmadan,
 * doğrudan bellekteki bir `rawDraft` objesiyle test edebiliyor.
 */
export function parseSttDraft(rawDraft: unknown, contentId: string, storageKey: string): ProcessSttResponse {
  const draft = rawDraft as Record<string, unknown>;
  const parseResult = processSttResponseSchema.safeParse({
    contentId,
    storageKey,
    languageStatus: draft?.languageStatus,
    detectedLanguage: draft?.detectedLanguage,
    languageProbability: draft?.languageProbability,
    durationMs: draft?.durationMs,
    segments: draft?.segments,
  });
  if (!parseResult.success) {
    throw new UnprocessableEntityException(
      `draft.json beklenen şekilde değil: ${parseResult.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ")}`,
    );
  }
  return parseResult.data;
}

@Injectable()
export class SttProcessingService {
  /**
   * İkinci constructor argümanı `@Optional()` — R2StorageService'teki
   * `@Optional() client?: S3Client` deseninin AYNISI (bkz. o dosyadaki yorum):
   * prod'da hiçbir provider bunun için bağlanmadığı için Nest DI hatasız
   * `undefined` geçer ve default değer (`spawn`) devreye girer; testte ise
   * `new SttProcessingService(fakeR2, fakeSpawnFn)` ile doğrudan enjekte edilir.
   * Ayrı bir DI token/factory provider açmaya gerek yok.
   */
  constructor(
    private readonly r2Storage: R2StorageService,
    @Optional() private readonly spawnFn: SpawnFn = spawn,
  ) {}

  async processStt(contentId: string, storageKey: string): Promise<ProcessSttResponse> {
    if (!isOwnedOriginalVideoStorageKey(contentId, storageKey)) {
      throw new BadRequestException(
        `storageKey, contentId "${contentId}" için beklenen "originals/${contentId}/<uuid>.mp4" desenine uymuyor.`,
      );
    }

    fs.mkdirSync(TEMP_DOWNLOAD_DIR, { recursive: true });
    const tempVideoPath = path.join(TEMP_DOWNLOAD_DIR, `${randomUUID()}.mp4`);

    try {
      await this.downloadToTemp(storageKey, tempVideoPath);
      await this.runSttPipeline(tempVideoPath, contentId);
      return this.readDraft(contentId, storageKey);
    } finally {
      // Chunk 17B — run-stt-pipeline.ts'in kendi tmp-run-dir temizliğindeki
      // "tek finally, her koşulda çalışır" prensibinin aynısı: indirilen video
      // ne STT başarılı ne başarısız olsun burada silinir. `force: true`,
      // indirme adımı hiç başlamamışsa (ör. storageKey doğrulaması az önce
      // patladıysa bu satıra hiç gelinmez, ama ileride bir hata indirmeden
      // ÖNCE oluşursa) sessizce no-op olmasını garanti eder.
      fs.rmSync(tempVideoPath, { force: true });
    }
  }

  private async downloadToTemp(storageKey: string, tempVideoPath: string): Promise<void> {
    try {
      await this.r2Storage.downloadOriginalVideo(storageKey, tempVideoPath);
    } catch (error) {
      if (error instanceof R2ObjectNotFoundError) {
        throw new NotFoundException(error.message);
      }
      throw error;
    }
  }

  private runSttPipeline(inputPath: string, contentId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const child = this.spawnFn(process.execPath, [STT_SCRIPT_PATH, "--input", inputPath, "--content-id", contentId], {
        stdio: ["ignore", "pipe", "pipe"],
      });

      const stderrLines: string[] = [];
      child.stderr?.on("data", (chunk: Buffer) => {
        stderrLines.push(chunk.toString("utf-8"));
      });

      child.on("error", (error) => {
        reject(new UnprocessableEntityException(`STT pipeline başlatılamadı: ${error.message}`));
      });

      child.on("exit", (code) => {
        if (code === 0) {
          resolve();
          return;
        }
        const stderrTail = stderrLines.join("").split("\n").slice(-20).join("\n");
        reject(new UnprocessableEntityException(`STT pipeline başarısız oldu (exit code ${code}).\nSon loglar:\n${stderrTail}`));
      });
    });
  }

  private readDraft(contentId: string, storageKey: string): ProcessSttResponse {
    const draftPath = path.join(STT_OUTPUT_ROOT, contentId, "draft.json");

    let rawDraft: unknown;
    try {
      rawDraft = JSON.parse(fs.readFileSync(draftPath, "utf-8"));
    } catch (error) {
      throw new UnprocessableEntityException(`STT tamamlandı ama draft.json okunamadı: ${(error as Error).message}`);
    }

    return parseSttDraft(rawDraft, contentId, storageKey);
  }
}
