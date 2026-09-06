import { z } from "zod";

/**
 * Chunk 11 — transcribe.py'nin (Python/faster-whisper) ürettiği ham çıktının
 * TS tarafındaki TRUST BOUNDARY'si. Bu, `packages/shared-types`'a GİRMİYOR:
 * mobile/API HTTP sınırını hiç geçmiyor, sadece bu offline pipeline'ın kendi
 * script-internal ara-formatı (bkz. run-stt-pipeline.ts).
 *
 * BİLİNÇLİ OLARAK dil/confidence POLİTİKASI taşımıyor — `detectedLanguage`/
 * `languageProbability` burada sadece ŞEKİL olarak doğrulanıyor ("bir string
 * mi, 0-1 arası bir sayı mı"), "İngilizce mi, yeterince emin mi" kararı
 * language-status.ts'te, AYRI bir katmanda veriliyor. Şema = şekil geçerliliği,
 * politika = business-rule — bu ikisi burada karıştırılmıyor.
 */
export const timedWordSchema = z
  .object({
    text: z.string().min(1),
    startMs: z.number().int().nonnegative(),
    endMs: z.number().int(),
  })
  .refine((word) => word.endMs > word.startMs, {
    message: "endMs, startMs'ten büyük olmalı",
  });

export type TimedWord = z.infer<typeof timedWordSchema>;

/**
 * `setupSeconds`/`transcriptionSeconds`: transcribe.py'nin ölçtüğü, model
 * hazırlama (ilk çalıştırmada indirme dahil) ile asıl transcribe çağrısının
 * AYRI süreleri — orkestratörün bunları ayrı ayrı raporlayabilmesi için (bkz.
 * run-stt-pipeline.ts'in konsol çıktısı). Bu alanlar language-status kararını
 * HİÇ etkilemiyor, sadece bilgilendirici.
 */
export const transcriptCandidateSchema = z.object({
  sourceFile: z.string().min(1),
  detectedLanguage: z.string().min(1),
  languageProbability: z.number().min(0).max(1),
  durationMs: z.number().int().positive(),
  setupSeconds: z.number().nonnegative(),
  transcriptionSeconds: z.number().nonnegative(),
  words: z.array(timedWordSchema).min(1),
});

export type TranscriptCandidate = z.infer<typeof transcriptCandidateSchema>;
