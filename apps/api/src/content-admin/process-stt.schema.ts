import { z } from "zod";

/**
 * Chunk 17B — `POST /content-admin/videos/:contentId/process-stt`'in body'si.
 * Kullanıcı kararı: storageKey, R2'de "hangi obje bu contentId'ye ait" sorusunu
 * ListObjectsV2+LastModified sezgisiyle KEŞFETMİYORUZ (birden fazla upload
 * varsa belirsiz olurdu) — bunun yerine upload response'unun zaten döndürdüğü
 * storageKey'i çağıran taraf burada AÇIKÇA geçiyor. contentId path param'dan
 * geliyor (upload'taki gibi `isValidContentId` ile ayrıca doğrulanıyor),
 * shared-types'a EKLENMEDİ — upload-video.schema.ts'teki AYNI gerekçe: mobile'ın
 * hiç çağırmadığı, sadece API-içi bir admin endpoint'i.
 */
export const processSttRequestSchema = z.object({
  storageKey: z.string().min(1),
});
export type ProcessSttRequest = z.infer<typeof processSttRequestSchema>;

/**
 * `scripts/stt/language-status.ts`'teki `LanguageStatus` union'ının BİREBİR
 * kopyası — o dosya NestJS'in dışında, kendi bağımsız derlemesiyle yaşıyor
 * (bkz. Chunk 17B teknik inceleme: script'in TS modüllerini import etmiyoruz,
 * sadece derlenmiş çıktısını subprocess olarak çağırıyoruz), bu yüzden tipin
 * kendisi burada tekrar tanımlanmak zorunda — paylaşılan bir import yolu yok.
 */
const languageStatusSchema = z.enum(["ready", "needsReview", "rejected"]);

const draftSegmentSchema = z.object({
  ordinal: z.number().int().positive(),
  startMs: z.number().int().nonnegative(),
  endMs: z.number().int().positive(),
  text: z.string().min(1),
});

/**
 * `draft.json`'daki `sourceFile` alanı BİLİNÇLİ OLARAK burada YOK: o, bu
 * isteğin işlendiği makinedeki geçici indirilmiş dosyanın mutlak yerel yolu
 * (internal implementation detail) — HTTP response'a asla sızdırılmamalı.
 */
export const processSttResponseSchema = z.object({
  contentId: z.string(),
  storageKey: z.string(),
  languageStatus: languageStatusSchema,
  detectedLanguage: z.string(),
  languageProbability: z.number().min(0).max(1),
  durationMs: z.number().int().positive(),
  segments: z.array(draftSegmentSchema),
});
export type ProcessSttResponse = z.infer<typeof processSttResponseSchema>;
