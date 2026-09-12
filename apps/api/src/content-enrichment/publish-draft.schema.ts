import { z } from "zod";
import { cefrLevelSchema, topicSchema } from "@linguascroll/shared-types";
import { qualityReportSchema } from "./content-quality.schema";
import { enrichmentLearningPointSchema, enrichmentQuizSchema, enrichmentVocabularyItemSchema } from "./enrichment-output.schema";
import { sttDraftSegmentObjectSchema } from "./stt-draft.schema";

/**
 * Chunk 12 — `enrich-transcript.ts`'in diske yazdığı, `publish-content.ts`'in
 * okuduğu TEK dosya (`enriched.json`): STT'nin ham segment'leri (ordinal/
 * startMs/endMs/text) + LLM enrichment'ının ürettiği alanlar TEK bir
 * yapıda birleştirilmiş hali. Bu, madde 12'nin "reviewable JSON/output"
 * istediği ARTIFACT'in kendisi — insan bu dosyayı açıp okur/gerekirse elle
 * düzeltir, sonra `publish-content.ts` BAŞKA bir şey okumadan doğrudan bunu
 * DB'ye yazar.
 *
 * `muxAssetId` burada (LLM'in ürettiği `contentSlug`'dan) ÖNCEDEN hesaplanmış
 * halde duruyor — reviewer'ın DB'ye gerçekte hangi id'nin yazılacağını,
 * publish zamanı beklemeden, dosyanın kendisinde görmesi için.
 */
const publishDraftSegmentSchema = sttDraftSegmentObjectSchema
  .extend({
    englishExplanation: z.string().min(1),
    turkishExplanation: z.string().min(1),
  })
  .refine((segment) => segment.endMs > segment.startMs, { message: "endMs, startMs'ten büyük olmalı" });

export const publishDraftSchema = z.object({
  contentId: z.string().min(1),
  muxAssetId: z
    .string()
    .regex(/^local-[a-z0-9]+(-[a-z0-9]+)*$/, "muxAssetId \"local-<slug>\" deseninde olmalı"),
  sourceFile: z.string().min(1),
  durationMs: z.number().int().positive(),
  topic: topicSchema,
  cefrLevel: cefrLevelSchema,
  segments: z.array(publishDraftSegmentSchema).min(1),
  vocabulary: z.array(enrichmentVocabularyItemSchema),
  learningPoints: z.array(enrichmentLearningPointSchema),
  quiz: enrichmentQuizSchema,
  // Chunk 13 — LLM'İN ÜRETMEDİĞİ, `buildPublishDraft`'ın (content-quality-gate.ts
  // üzerinden) deterministik hesapladığı bir alan. Burada SADECE reviewer'ın
  // dosyayı açtığında görmesi için duruyor — `publish-content.ts` publish
  // anında bu alana GÜVENMİYOR, `evaluateContentQuality`'i kendi fresh
  // çalıştırıyor (bkz. publish-content.ts yorumu).
  quality: qualityReportSchema,
});
export type PublishDraft = z.infer<typeof publishDraftSchema>;
