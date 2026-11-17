import { z } from "zod";

/**
 * PUT /words/:wordId/saved body contract'ı. Kimlik body'de DEĞİL (2026-10-27):
 * backend doğrulanmış Firebase token'ından çözüyor.
 *
 * Chunk 16 — `sourceSegmentId` OPSİYONEL: kelime bir altyazı içindeki (Chunk 14
 * word-tap) vurgulu bir kelimeye dokunularak kaydedilmişse, mobile o ANDA
 * bildiği gerçek aktif segment id'sini gönderir (bkz. VideoFeedItem.tsx).
 * Vocabulary panelindeki chip'ten kaydedilmişse (segment granularity YOK)
 * `undefined`/`null` kalır — TAHMİNİ bir segment ASLA üretilmiyor (kullanıcı
 * kararı). Backend bu alanı, verilmişse, gerçekten bu word'ün bu segment'in
 * videosuyla ilişkili olduğunu doğruluyor (bkz. words.service.ts).
 */
export const saveWordRequestSchema = z.object({
  // 2026-10-27 — `userId` KALDIRILDI: kimlik istemcinin gönderdiği bir alan değil, backend'in
  // doğruladığı Firebase token'ından çözülüyor (bkz. apps/api auth/firebase-auth.guard.ts).
  sourceSegmentId: z.string().uuid().nullable().optional(),
});

export type SaveWordRequest = z.infer<typeof saveWordRequestSchema>;

/**
 * 2026-11-17 — PUT /words/:wordId/saved cevabı (eskiden 200 + boş gövde). `created` = bu istek kaydı
 * GERÇEKTEN yeni oluşturdu mu (DB ekleme sonucu); aynı kelimenin ikinci PUT'u false döner. Loopi'nin
 * "yeni kelime yedi" animasyonu bu bilgiye dayanır. Opsiyonel: bkz. saveGlossResponseSchema'daki gerekçe.
 */
export const saveWordResponseSchema = z.object({
  created: z.boolean().optional(),
});

export type SaveWordResponse = z.infer<typeof saveWordResponseSchema>;
