import { z } from "zod";
import { wordSchema } from "./word";

/**
 * Public API projection — persistence modeli DEĞİL. `video_words`/`user_saved_words`
 * join'lerinin internal şekli hiçbir zaman buraya sızmıyor; client'ın bir videonun
 * vocabulary'sini render etmek için ihtiyaç duyduğu tek şey: kelime + "BU kullanıcı
 * bunu daha önce kaydetmiş mi" (Chunk 9, FeedService'in userId-aware enrichment'ı).
 */
export const videoVocabularyItemSchema = z.object({
  word: wordSchema,
  saved: z.boolean(),
});

export type VideoVocabularyItem = z.infer<typeof videoVocabularyItemSchema>;
