import { z } from "zod";

/**
 * Chunk 16 — GET /words/progress. Streak/XP/level/coin YOK (kullanıcı kararı).
 *
 * Tüm alanlar BİLİNÇLİ OLARAK "distinct kelime/phrase sayısı" — bir "kaç kez
 * review edildi" (ham event sayısı) gösterge DEĞİL. Örn. `reviewedCount`:
 * kullanıcının en az BİR KEZ review ettiği FARKLI kelime sayısı (aynı kelimeyi
 * 5 kez review etmiş olması bu sayıyı 5 artırmaz). `rememberedCorrectlyCount`:
 * en az BİR KEZ doğru hatırlanmış farklı kelime sayısı (kelimenin ŞU ANKİ
 * durumu değil — "en az bir kez doğru" her zaman true kalır, bir sonraki
 * yanlış review bunu geri almaz). Bu semantik seçim, basit ve tek bir
 * `COUNT(DISTINCT word_id) FILTER (...)` sorgusuyla hesaplanabildiği için
 * tercih edildi — "kelimenin güncel/en son durumu" hesaplamak (per-word en
 * son event'i bulmak) çok daha karmaşık bir sorgu gerektirirdi.
 *
 * `*ThisWeek` alanları AYNI semantikte, sadece `savedAt`/`reviewedAt >= 7 gün önce`
 * ile filtrelenmiş — sabit bir 7 günlük pencere (rolling, takvim haftası DEĞİL).
 */
export const wordsProgressSchema = z.object({
  savedCount: z.number().int().nonnegative(),
  reviewedCount: z.number().int().nonnegative(),
  rememberedCorrectlyCount: z.number().int().nonnegative(),
  savedThisWeek: z.number().int().nonnegative(),
  reviewedThisWeek: z.number().int().nonnegative(),
  rememberedCorrectlyThisWeek: z.number().int().nonnegative(),
});

export type WordsProgress = z.infer<typeof wordsProgressSchema>;
