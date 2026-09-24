import { ConflictException, Inject, Injectable, UnprocessableEntityException } from "@nestjs/common";
import { DRIZZLE_DB, type Database } from "../database/database.module";
import {
  assertNotAlreadyPublished,
  assertPassesQualityGate,
  copyMediaFile,
  loadPublishDraft,
  publishContent,
  PublishAlreadyExistsError,
  PublishPipelineError,
  PublishQualityNeedsReviewError,
  PublishQualityRejectedError,
  requiresLocalMediaCopy,
} from "../content-enrichment/publish-content";
import { publishContentResponseSchema, type PublishContentResponse } from "./publish.schema";

/**
 * Chunk 17D — `POST /content-admin/videos/:contentId/publish`'in orchestration
 * katmanı. `publish-content.ts`'in CLI'ını subprocess olarak SPAWN ETMİYOR — onun
 * zaten exported/pure fonksiyonlarını (main()'in bugüne kadar tek çağıranı olduğu
 * aynı fonksiyonlar) doğrudan reuse ediyor. `EnrichmentProcessingService`'in
 * `enrich-transcript.ts` fonksiyonlarını aynı şekilde import ettiği desenin
 * BİREBİR karşılığı (bkz. o dosyanın başındaki yorum) — yeni bir generic "publish
 * abstraction"/BaseService YOK, sadece bu iki fonksiyon grubunun aynı orkestrasyon
 * sırasını (main()'in bugüne kadar yaptığı sıra: quality gate → idempotency →
 * medya → DB transaction) HTTP'den de erişilebilir kılan ince bir servis.
 */
@Injectable()
export class PublishProcessingService {
  constructor(@Inject(DRIZZLE_DB) private readonly db: Database) {}

  async publish(contentId: string, acknowledgeNeedsReview: boolean): Promise<PublishContentResponse> {
    const draft = this.loadDraft(contentId);

    this.ensurePassesQualityGate(draft, acknowledgeNeedsReview);

    await this.ensureNotAlreadyPublished(draft.muxAssetId);

    // Chunk 17D — koşul: storageKey doluysa (R2-backed) mevcut R2 object canonical
    // media'dır — copyMediaFile ÇAĞRILMAZ (tekrar upload/download/copy YOK).
    // storageKey yoksa (offline/yerel akış) mevcut davranış AYNEN korunur.
    if (requiresLocalMediaCopy(draft)) {
      this.copyMediaFileOrThrow(draft.sourceFile, draft.muxAssetId);
    }

    const { videoId } = await publishContent(this.db, draft);

    return publishContentResponseSchema.parse({ videoId, muxAssetId: draft.muxAssetId });
  }

  private copyMediaFileOrThrow(sourceFile: string, muxAssetId: string): void {
    try {
      copyMediaFile(sourceFile, muxAssetId);
    } catch (error) {
      if (error instanceof PublishPipelineError) {
        throw new UnprocessableEntityException(error.message);
      }
      throw error;
    }
  }

  private loadDraft(contentId: string): ReturnType<typeof loadPublishDraft> {
    try {
      return loadPublishDraft(contentId);
    } catch (error) {
      if (error instanceof PublishPipelineError) {
        throw new UnprocessableEntityException(error.message);
      }
      throw error;
    }
  }

  private async ensureNotAlreadyPublished(muxAssetId: string): Promise<void> {
    try {
      await assertNotAlreadyPublished(this.db, muxAssetId);
    } catch (error) {
      if (error instanceof PublishAlreadyExistsError) {
        throw new ConflictException(error.message);
      }
      throw error;
    }
  }

  /**
   * `PublishQualityRejectedError`/`PublishQualityNeedsReviewError` — Nest'in
   * `@Catch()`'süz global exception filter'ı `Error`'dan türeyen bilinmeyen bir
   * sınıfı 500'e çevirir, bu YANLIŞ olurdu (bu ikisi "beklenen domain hatası",
   * ikisi de aynı davranışı korur: reject HİÇBİR flag'le publish edilemez,
   * needsReview `acknowledgeNeedsReview` ile geçer — bkz. assertPassesQualityGate'in
   * kendi davranışı, publish-content.ts'te DEĞİŞMEDİ). İkisi de aynı 409'a
   * çevriliyor — ayrı HTTP status'ler icat etmek yerine (EnrichmentProcessingService'in
   * "state, bu isteği reddediyor" → ConflictException deseniyle AYNI, bkz. o dosya).
   */
  private ensurePassesQualityGate(draft: Parameters<typeof assertPassesQualityGate>[0], acknowledgeNeedsReview: boolean): void {
    try {
      assertPassesQualityGate(draft, acknowledgeNeedsReview);
    } catch (error) {
      if (error instanceof PublishQualityRejectedError || error instanceof PublishQualityNeedsReviewError) {
        throw new ConflictException(error.message);
      }
      throw error;
    }
  }
}
