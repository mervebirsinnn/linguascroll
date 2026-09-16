import { z } from "zod";
import { wordSchema } from "./word";

/**
 * Chunk 16 — Memory ekranı VE review session'ı için AYNI şekil (ikisi de
 * "kelime + kaydedilme zamanı + varsa gerçek kaynak cümle" gösteriyor,
 * ayrı bir tip icat etmeye gerek yok).
 *
 * `savedAt` ISO 8601 string — bu API'de bir timestamp'in ilk kez wire'a
 * çıktığı yer (bugüne kadarki tüm `createdAt` alanları BİLİNÇLİ OLARAK
 * domain contract'larından ÇIKARILIYORDU, bkz. videos-repository.ts'teki
 * `toVideo` yorumu). Burada gerçek bir ürün ihtiyacı (kullanıcıya "ne zaman
 * kaydettin" göstermek) olduğu için taşınıyor — `z.string().datetime()`,
 * `Date.prototype.toISOString()`'ın ürettiği formatla BİREBİR eşleşiyor.
 *
 * `sourceSentence: null` — ya kelime segment bağlamı OLMADAN kaydedildi
 * (vocabulary panel chip'i) ya da kaynak segment SONRADAN silindi
 * (`ON DELETE SET NULL`) — HER İKİ durumda da context'in GERÇEKTEN
 * bilinmediğini temsil ediyor, tahmini bir fallback YOK.
 */
export const savedWordSchema = z.object({
  word: wordSchema,
  savedAt: z.string().datetime(),
  sourceSentence: z.string().nullable(),
});

export type SavedWord = z.infer<typeof savedWordSchema>;
