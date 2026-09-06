import { z } from "zod";
import { learningPointSchema } from "./learning-point";

/**
 * Client'ın bir videoyu izlerken render edeceği zaman-damgalı altyazı satırı +
 * tıklanınca açılan EN/TR açıklama (Chunk 10). `ordinal`, `startMs`'ten DAHA
 * STABİL bir sıralama referansı olarak DB'den geliyor (bkz. transcript-segments.schema.ts) —
 * mobile bunu kendi sıralaması için kullanabilir ama asıl senkronizasyon
 * `startMs`/`endMs` üzerinden ([startMs, endMs) yarı-açık aralık, bkz.
 * use-active-subtitle.ts).
 *
 * Persistence model DEĞİL — DB'nin `video_transcript_segments` +
 * `transcript_segment_learning_points` JOIN'inin public projeksiyonu (bkz.
 * TranscriptSegmentsRepository).
 */
export const transcriptSegmentSchema = z
  .object({
    id: z.string().uuid(),
    ordinal: z.number().int().positive(),
    startMs: z.number().int().nonnegative(),
    endMs: z.number().int().positive(),
    text: z.string(),
    englishExplanation: z.string(),
    turkishExplanation: z.string(),
    learningPoints: z.array(learningPointSchema),
  })
  .refine((segment) => segment.endMs > segment.startMs, {
    message: "endMs, startMs'ten büyük olmalı",
  });

export type TranscriptSegment = z.infer<typeof transcriptSegmentSchema>;
