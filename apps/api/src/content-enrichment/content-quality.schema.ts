import { z } from "zod";

/**
 * Chunk 13 — Content Quality Gate'in sonuç modeli. `topic`/`cefrLevel` gibi
 * mevcut sabit enum'lardan (bkz. video.ts) DEĞİL, bu chunk'a özgü yeni bir
 * taxonomy'den geliyor — ama İSİMLENDİRME KONVANSİYONU aynı: camelCase
 * ("needsReview", "ready", "phrase" gibi mevcut değerlerle tutarlı), kullanıcının
 * örneğindeki SCREAMING_SNAKE_CASE ("QUIZ_TOO_TRIVIAL") DEĞİL.
 */

export const qualityIssueSeveritySchema = z.enum(["warning", "reject"]);
export type QualityIssueSeverity = z.infer<typeof qualityIssueSeveritySchema>;

export const qualityStatusSchema = z.enum(["pass", "needsReview", "reject"]);
export type QualityStatus = z.infer<typeof qualityStatusSchema>;

/**
 * Her kod TEK bir deterministik kuralın kimliği (bkz. content-quality-gate.ts).
 * Zod/Chunk-12 tarafından zaten garanti edilen şeyler (segment referans
 * bütünlüğü, quiz'in tam-bir-doğru-cevabı, 4 seçenek, topic/cefrLevel taxonomy,
 * boş dizi/segment alanları, tek-segment start<end, learning point type enum'u,
 * lemma/gloss/expression boşluğu) burada TEKRAR EDİLMİYOR.
 */
export const qualityIssueCodeSchema = z.enum([
  // Transcript
  "emptyTranscript",
  "whitespaceOnlySegment",
  "overlappingSegments",
  "duplicateAdjacentSegment",
  "thinTranscript",
  // Explanation
  "emptyExplanation",
  "explanationMatchesTranscriptVerbatim",
  "explanationTooLong",
  "explanationDisproportionateForTrivialSegment",
  "explanationLanguagesIdentical",
  // Learning point
  "duplicateLearningPoint",
  "tooManyLearningPointsForSegment",
  "learningPointExpressionNotInTranscript",
  "learningPointOnTrivialSegment",
  // Vocabulary
  "emptyVocabulary",
  "duplicateVocabularyLemma",
  "trivialVocabularyLemma",
  "vocabularyLemmaNotInTranscript",
  // Quiz
  "emptyQuizQuestion",
  "quizTooShort",
  "duplicateQuizOptions",
  "quizTooTrivial",
]);
export type QualityIssueCode = z.infer<typeof qualityIssueCodeSchema>;

export const qualityIssueSchema = z.object({
  code: qualityIssueCodeSchema,
  severity: qualityIssueSeveritySchema,
  // Video-geneli bir sorun (ör. boş vocabulary) için null — belirli bir
  // segmente bağlı sorunlar için o segmentin ordinal'i.
  segmentOrdinal: z.number().int().positive().nullable(),
  message: z.string().min(1),
});
export type QualityIssue = z.infer<typeof qualityIssueSchema>;

/**
 * `status`, `issues`'tan TÜRETİLİR (en kötü severity kazanır) — ayrı bir
 * skorlama/ağırlıklandırma yok, bkz. content-quality-gate.ts'teki
 * `evaluateContentQuality`. Bu şema sadece ŞEKLİ doğruluyor, `status`'un
 * `issues` ile TUTARLI olduğunu garanti ETMİYOR (bu invariant, tek üretici
 * fonksiyon olan `evaluateContentQuality` tarafından kodda sağlanıyor).
 */
export const qualityReportSchema = z.object({
  status: qualityStatusSchema,
  issues: z.array(qualityIssueSchema),
});
export type QualityReport = z.infer<typeof qualityReportSchema>;
