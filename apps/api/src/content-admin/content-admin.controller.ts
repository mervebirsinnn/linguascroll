import { BadRequestException, Body, Controller, Param, Post, UploadedFile, UseFilters, UseInterceptors } from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { isValidContentId } from "./build-storage-key";
import { ContentAdminService } from "./content-admin.service";
import type { EnrichContentResponse } from "./enrich.schema";
import { EnrichmentProcessingService } from "./enrichment-processing.service";
import { MulterUploadExceptionFilter } from "./multer-upload-exception.filter";
import { processSttRequestSchema, type ProcessSttRequest, type ProcessSttResponse } from "./process-stt.schema";
import { publishContentRequestSchema, type PublishContentRequest, type PublishContentResponse } from "./publish.schema";
import { PublishProcessingService } from "./publish-processing.service";
import { SttProcessingService } from "./stt-processing.service";
import { uploadVideoRequestSchema, type UploadVideoRequest, type UploadVideoResponse } from "./upload-video.schema";

/**
 * Chunk 17 — kullanıcı kararı: videolar 20-40sn dikey klip, 500MB gereksiz
 * cömert; 100MB zaten geniş bir marj. Bu, `FileInterceptor`'ın Multer/busboy
 * seviyesindeki `limits.fileSize`'ı — aşımda dosya TAMAMEN okunmadan/buffer'a
 * alınmadan reddedilir (bkz. multer-upload-exception.filter.ts, bu sınırı aşan
 * MulterError'ı temiz bir 413'e çeviren filter).
 */
const MAX_UPLOAD_SIZE_BYTES = 100 * 1024 * 1024;

/**
 * Dar, iç (internal) bir content-admin endpoint'i — mobile'ın hiç bilmediği,
 * sadece içerik ekleme akışının ilk adımı (bkz. content-admin.service.ts'teki
 * "bu chunk DB'ye yazmıyor" yorumu). `FileInterceptor`'ın varsayılan storage'ı
 * (hiçbir `storage`/`dest` verilmediğinde Multer'ın kendi davranışı) dosyayı
 * DİSKE değil `file.buffer`'a (bellekte) yazar — 100MB'lık tavan bunu güvenli
 * kılıyor; R2'ye tek bir `PutObjectCommand` ile aktarılıyor (bkz. r2-storage.service.ts).
 */
@Controller("content-admin/videos")
export class ContentAdminController {
  constructor(
    private readonly contentAdminService: ContentAdminService,
    private readonly sttProcessingService: SttProcessingService,
    private readonly enrichmentProcessingService: EnrichmentProcessingService,
    private readonly publishProcessingService: PublishProcessingService,
  ) {}

  @Post("upload")
  @UseFilters(MulterUploadExceptionFilter)
  @UseInterceptors(FileInterceptor("file", { limits: { fileSize: MAX_UPLOAD_SIZE_BYTES } }))
  upload(@UploadedFile() file: Express.Multer.File | undefined, @Body() body: unknown): Promise<UploadVideoResponse> {
    const parsedBody = this.parseUploadBody(body);
    return this.contentAdminService.uploadDraftVideo(file, parsedBody);
  }

  /**
   * Chunk 17B — kullanıcı kararı: storageKey R2'den keşfedilmiyor (ListObjectsV2+
   * LastModified belirsizlik riski taşıyor), upload response'unun zaten döndürdüğü
   * storageKey burada AÇIKÇA gövdede geçiriliyor (bkz. process-stt.schema.ts).
   */
  @Post(":contentId/process-stt")
  processStt(@Param("contentId") contentId: string, @Body() body: unknown): Promise<ProcessSttResponse> {
    const parsedContentId = this.parseContentId(contentId);
    const parsedBody = this.parseProcessSttBody(body);
    return this.sttProcessingService.processStt(parsedContentId, parsedBody.storageKey);
  }

  /**
   * Chunk 17C — kullanıcı kararı: process-stt'ten AYRI bir endpoint (birleştirilmiş
   * tek "process" endpoint'i DEĞİL). Body YOK — enrichment, R2/storageKey'e hiç
   * ihtiyaç duymuyor, sadece `contentId`'nin işaret ettiği yerel draft.json'ı okuyor
   * (bkz. Chunk 17C teknik inceleme, "Recommended endpoint boundary"). Bu ayrım,
   * STT ve Gemini'nin bağımsız retry edilebilir/ayrı failure boundary'ler olması
   * gereğinin (kullanıcının tasarım prensibi) doğrudan yapısal karşılığı.
   */
  @Post(":contentId/enrich")
  enrich(@Param("contentId") contentId: string): Promise<EnrichContentResponse> {
    const parsedContentId = this.parseContentId(contentId);
    return this.enrichmentProcessingService.enrich(parsedContentId);
  }

  /**
   * Chunk 17D — storageKey body'de İSTENMİYOR (kullanıcı kararı): enrich endpoint'i
   * gibi, gerekli storage identity'yi diskteki artifact zincirinden (draft.json →
   * enriched.json) okuyor, client'tan tekrar istemiyor — yanlış contentId/storageKey
   * eşleştirme riski yapısal olarak yok.
   */
  @Post(":contentId/publish")
  publish(@Param("contentId") contentId: string, @Body() body: unknown): Promise<PublishContentResponse> {
    const parsedContentId = this.parseContentId(contentId);
    const parsedBody = this.parsePublishBody(body);
    return this.publishProcessingService.publish(parsedContentId, parsedBody.acknowledgeNeedsReview);
  }

  private parseUploadBody(body: unknown): UploadVideoRequest {
    const result = uploadVideoRequestSchema.safeParse(body);
    if (!result.success) {
      throw new BadRequestException(result.error.flatten());
    }
    return result.data;
  }

  private parseContentId(contentId: string): string {
    if (!isValidContentId(contentId)) {
      throw new BadRequestException(`contentId "a-z0-9-" (kebab-case) deseninde olmalı: "${contentId}"`);
    }
    return contentId;
  }

  private parseProcessSttBody(body: unknown): ProcessSttRequest {
    const result = processSttRequestSchema.safeParse(body);
    if (!result.success) {
      throw new BadRequestException(result.error.flatten());
    }
    return result.data;
  }

  /**
   * `body ?? {}` — process-stt'nin AKSİNE (storageKey ZORUNLU alanı var, body
   * eksikse gerçek bir hata), bu endpoint'in TEK alanı (`acknowledgeNeedsReview`)
   * kendi başına opsiyonel/default'lu: hiç body gönderilmemesi (supertest
   * `.send()`, body-parser'ın bazı konfigürasyonlarda `undefined` bırakabildiği
   * durum) geçerli bir "acknowledgeNeedsReview: false" isteği ile AYNI anlama
   * gelmeli, 400 değil.
   */
  private parsePublishBody(body: unknown): PublishContentRequest {
    const result = publishContentRequestSchema.safeParse(body ?? {});
    if (!result.success) {
      throw new BadRequestException(result.error.flatten());
    }
    return result.data;
  }
}
