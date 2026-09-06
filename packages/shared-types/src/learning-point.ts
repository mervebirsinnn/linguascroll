import { z } from "zod";

/**
 * Bir transcript segment'inin öğretmek istediği phrase/grammar structure
 * (Chunk 10). `type` MVP'de bilinçli olarak sadece iki değer — generic bir
 * taxonomy değil, `topic`/`cefrLevel`'daki gibi sabit bir enum (bkz.
 * transcript-segment-learning-points.schema.ts).
 */
export const learningPointTypeSchema = z.enum(["phrase", "grammar"]);
export type LearningPointType = z.infer<typeof learningPointTypeSchema>;

export const learningPointSchema = z.object({
  id: z.string().uuid(),
  type: learningPointTypeSchema,
  expression: z.string(),
  englishExplanation: z.string(),
  turkishExplanation: z.string(),
  // Her learning point için ayrıca bir örnek cümle GARANTİ DEĞİL (ör. basit bir
  // grammar noktası için gerekmeyebilir) — bu yüzden nullable, boş string değil.
  exampleEn: z.string().nullable(),
  exampleTr: z.string().nullable(),
});
export type LearningPoint = z.infer<typeof learningPointSchema>;
