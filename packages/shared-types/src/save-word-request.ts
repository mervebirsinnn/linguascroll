import { z } from "zod";

/**
 * PUT /words/:wordId/saved body contract'ı. Auth henüz yok — anonymous identity,
 * mevcut answerQuizRequestSchema/recordVideoWatchEventRequestSchema deseniyle
 * aynı: mobile kendi taşıdığı userId'yi body'de gönderiyor.
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
  userId: z.string().uuid(),
  sourceSegmentId: z.string().uuid().nullable().optional(),
});

export type SaveWordRequest = z.infer<typeof saveWordRequestSchema>;
