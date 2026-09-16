import { z } from "zod";

/**
 * Chunk 12 — `scripts/stt/output/<content-id>/draft.json`'ı OKURKEN kullanılan
 * trust-boundary şeması. `scripts/stt`'ten import ETMİYORUZ (madde 2: STT
 * pipeline'a dokunulmuyor, farklı bir tsconfig/build root'unda yaşıyor) — bu,
 * `transcript-candidate.ts`'in kendi başına bir trust-boundary şeması olması
 * gibi, BİLİNÇLİ bir küçük tekrar: draft.json'un şekli STT tarafında zaten
 * `DraftSegment`/`run-stt-pipeline.ts`'in ürettiği JSON.stringify çıktısıyla
 * sabit, burada sadece OKUMA tarafında ayrıca doğrulanıyor.
 */
// Ayrı bir "base" object olarak tutuluyor (refine SONRASI DEĞİL) — `.extend()`
// bir ZodObject üzerinde çalışır, `.refine()`'in döndürdüğü ZodEffects'te YOK
// (bkz. publish-draft.schema.ts'in bu base'i genişletmesi).
export const sttDraftSegmentObjectSchema = z.object({
  ordinal: z.number().int().positive(),
  startMs: z.number().int().nonnegative(),
  endMs: z.number().int().positive(),
  text: z.string().min(1),
});
export const sttDraftSegmentSchema = sttDraftSegmentObjectSchema.refine(
  (segment) => segment.endMs > segment.startMs,
  { message: "endMs, startMs'ten büyük olmalı" },
);
export type SttDraftSegment = z.infer<typeof sttDraftSegmentSchema>;

export const sttDraftSchema = z.object({
  contentId: z.string().min(1),
  sourceFile: z.string().min(1),
  languageStatus: z.enum(["ready", "needsReview", "rejected"]),
  detectedLanguage: z.string().min(1),
  languageProbability: z.number().min(0).max(1),
  durationMs: z.number().int().positive(),
  segments: z.array(sttDraftSegmentSchema).min(1),
});
export type SttDraft = z.infer<typeof sttDraftSchema>;
