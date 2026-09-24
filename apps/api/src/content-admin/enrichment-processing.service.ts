import * as fs from "node:fs";
import {
  BadGatewayException,
  ConflictException,
  Injectable,
  NotFoundException,
  Optional,
  UnprocessableEntityException,
} from "@nestjs/common";
import {
  assertReadyForEnrichment,
  atomicWriteFile,
  buildPublishDraft,
  EnrichmentPipelineError,
  resolveDraftPath,
  resolveEnrichedOutputPath,
} from "../content-enrichment/enrich-transcript";
import { enrichTranscript, EnrichmentLlmError } from "../content-enrichment/enrichment-llm-client";
import type { EnrichmentOutput } from "../content-enrichment/enrichment-output.schema";
import { sttDraftSchema, type SttDraft } from "../content-enrichment/stt-draft.schema";
import { assertValidSegmentReferences, SegmentReferenceError } from "../content-enrichment/validate-segment-references";
import { enrichContentResponseSchema, type EnrichContentResponse } from "./enrich.schema";

/**
 * Chunk 17C — kullanıcı kararı: `scripts/stt`'in aksine `content-enrichment/*`
 * ayrı bir tsconfig/jest.config ile izole EDİLMEMİŞ, `apps/api/src` ağacının
 * normal bir parçası (aynı `tsconfig.build.json`) — bu yüzden `enrich-transcript.ts`
 * subprocess olarak ÇAĞRILMIYOR, onun export ettiği pure fonksiyonlar (Gemini
 * çağrısı + Quality Gate dahil) doğrudan import edilip burada orkestre ediliyor
 * (bkz. Chunk 17C teknik inceleme, "Recommended implementation").
 */
type EnrichTranscriptFn = typeof enrichTranscript;

@Injectable()
export class EnrichmentProcessingService {
  /**
   * `SttProcessingService`'teki `@Optional() spawnFn` ile AYNI desen: prod'da
   * hiçbir provider bağlanmadığı için Nest DI `undefined` geçer, default
   * (gerçek `enrichTranscript`, gerçek Gemini) devreye girer; testte doğrudan
   * `new EnrichmentProcessingService(fakeEnrichTranscriptFn)` ile enjekte edilir
   * — gerçek bir Gemini ağ çağrısı yapmadan.
   */
  constructor(@Optional() private readonly enrichTranscriptFn: EnrichTranscriptFn = enrichTranscript) {}

  async enrich(contentId: string): Promise<EnrichContentResponse> {
    const draft = this.loadReadyDraft(contentId);

    const outputPath = resolveEnrichedOutputPath(contentId);
    if (fs.existsSync(outputPath)) {
      // Kural 10 — mevcut CLI'ın (`enrich-transcript.ts` main()) "üzerine yazma"
      // davranışıyla AYNI: bir reviewer'ın elle düzeltmiş olabileceği bir
      // enriched.json, bu endpoint'in tekrar çağrılmasıyla SESSİZCE ezilmiyor.
      throw new ConflictException(
        `"${outputPath}" zaten var — üzerine yazılmıyor. Farklı bir content-id kullanın veya mevcut dosyayı elle kaldırıp tekrar deneyin.`,
      );
    }

    const enrichmentOutput = await this.runEnrichment(draft.segments);

    try {
      assertValidSegmentReferences(enrichmentOutput, draft.segments);
    } catch (error) {
      if (error instanceof SegmentReferenceError) {
        throw new UnprocessableEntityException(error.message);
      }
      throw error;
    }

    const publishDraft = buildPublishDraft(contentId, draft.sourceFile, draft.durationMs, draft.segments, enrichmentOutput, draft.storageKey ?? null);

    // `buildPublishDraft` (Quality Gate dahil) BAŞARIYLA tamamlanana kadar
    // hiçbir dosya yazılmıyor — bir Gemini/segment-reference hatası enriched.json'ı
    // asla kısmi/bozuk bırakmaz (kullanıcının "STT ve Gemini ayrı failure
    // boundary" prensibiyle tutarlı: draft.json'a hiç dokunulmadı).
    atomicWriteFile(outputPath, JSON.stringify(publishDraft, null, 2));

    return enrichContentResponseSchema.parse(publishDraft);
  }

  private loadReadyDraft(contentId: string): SttDraft {
    const draftPath = resolveDraftPath(contentId);
    if (!fs.existsSync(draftPath)) {
      throw new NotFoundException(
        `Draft bulunamadı: "${draftPath}" — önce STT pipeline'ını çalıştırın (POST .../process-stt).`,
      );
    }

    let rawDraft: unknown;
    try {
      rawDraft = JSON.parse(fs.readFileSync(draftPath, "utf-8"));
    } catch (error) {
      throw new UnprocessableEntityException(`draft.json okunamadı: ${(error as Error).message}`);
    }

    const parseResult = sttDraftSchema.safeParse(rawDraft);
    if (!parseResult.success) {
      throw new UnprocessableEntityException(
        `draft.json beklenen şekilde değil: ${parseResult.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; ")}`,
      );
    }
    const draft = parseResult.data;

    try {
      assertReadyForEnrichment(draft.languageStatus, contentId);
    } catch (error) {
      if (error instanceof EnrichmentPipelineError) {
        // Kural 12 — bu bir "malformed input" değil, bir "mevcut kaynağın
        // durumu bu işlem için uygun değil" senaryosu: aynı gerekçeyle 409
        // Conflict kullanıyoruz (enriched.json zaten var durumundakiyle AYNI
        // sınıf hata — ikisi de "state, bu isteği reddediyor").
        throw new ConflictException(error.message);
      }
      throw error;
    }

    return draft;
  }

  private async runEnrichment(segments: SttDraft["segments"]): Promise<EnrichmentOutput> {
    try {
      return await this.enrichTranscriptFn(segments);
    } catch (error) {
      if (error instanceof EnrichmentLlmError) {
        // Kural 13 — retry/backoff YOK (kullanıcı kararı, bkz. Chunk 17C
        // teknik inceleme "Gemini failure behavior"): 429/quota dahil HER
        // Gemini hatası bugün aynı şekilde ele alınıyor, burada sadece uygun
        // bir HTTP status'e (502 — istemcinin hatası değil, yukarı akış
        // servisi başarısız) çevriliyor.
        throw new BadGatewayException(error.message);
      }
      throw error;
    }
  }
}
