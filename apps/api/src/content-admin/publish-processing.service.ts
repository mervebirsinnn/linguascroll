import { ConflictException, Inject, Injectable, Optional, ServiceUnavailableException, UnprocessableEntityException } from "@nestjs/common";
import { DRIZZLE_DB, type Database } from "../database/database.module";
import { ApprovalQualityError, ApprovedArtifactError } from "../content-enrichment/approved-artifact";
import {
  publishApprovedContent,
  PublishAlreadyExistsError,
  PublishPipelineError,
  type PublishApprovedOptions,
} from "../content-enrichment/publish-content";
import { publishContentResponseSchema, type PublishContentResponse } from "./publish.schema";
import { R2ConfigError, R2StorageService } from "./r2-storage.service";

/**
 * `POST /content-admin/videos/:contentId/publish`'in orchestration katmanı. CLI ile AYNI uygulama-katmanı
 * use-case'ini (`publishApprovedContent`) çağırır: kaynak YALNIZCA `approved/<id>.json`'dır
 * (`output/<id>/enriched.json` buradan hiçbir koşulda okunmaz — bkz. publish-processing.service.spec'teki
 * statik sınır testi). Controller dosya yolu ya da artifact türü seçmez; yalnızca contentId iletir.
 *
 * needsReview kabulü HTTP isteğiyle verilemez: içerik bazlı, gerekçeli acknowledgement artifact'in içindedir
 * (promote-content ile üretilir). `--from-output` kaçış yolu HTTP'de YOKTUR.
 *
 * Medya: R2-önce (bkz. publishApprovedContent). Admin upload akışıyla gelen içerik zaten R2-backed
 * (storageKey dolu) ise yeniden yükleme yapılmaz.
 */
@Injectable()
export class PublishProcessingService {
  constructor(
    @Inject(DRIZZLE_DB) private readonly db: Database,
    private readonly r2StorageService: R2StorageService,
    /** Yalnızca testte dizin/yol enjeksiyonu için; prod'da Nest `undefined` geçer (varsayılanlar). */
    @Optional() private readonly overrides: Pick<PublishApprovedOptions, "approvedDir" | "mediaSourceDir" | "mediaDir"> = {},
  ) {}

  async publish(contentId: string): Promise<PublishContentResponse> {
    try {
      const result = await publishApprovedContent(this.db, contentId, { ...this.overrides, mode: "r2", storage: this.r2StorageService });
      return publishContentResponseSchema.parse({ videoId: result.videoId, muxAssetId: result.muxAssetId });
    } catch (error) {
      throw this.toHttpException(error);
    }
  }

  /**
   * Beklenen domain hataları → anlamlı HTTP durumları (Nest'in varsayılan filtresi bilinmeyen `Error`'ları 500 yapar):
   * eksik/geçersiz approved artifact ve medya sorunları 422; reject / bayat quality-ack / zaten yayımlanmış 409;
   * R2 yapılandırması yok 503.
   */
  private toHttpException(error: unknown): unknown {
    if (error instanceof ApprovedArtifactError || error instanceof PublishPipelineError) {
      return new UnprocessableEntityException(error.message);
    }
    if (error instanceof ApprovalQualityError || error instanceof PublishAlreadyExistsError) {
      return new ConflictException(error.message);
    }
    if (error instanceof R2ConfigError) {
      return new ServiceUnavailableException(error.message);
    }
    return error;
  }
}
