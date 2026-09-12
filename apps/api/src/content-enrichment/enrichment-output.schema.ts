import { z } from "zod";
import { cefrLevelSchema, learningPointTypeSchema, topicSchema } from "@linguascroll/shared-types";

/**
 * Chunk 12 — LLM'in TEK bir `client.messages.parse` çağrısında üretmesi
 * beklenen yapının Zod contract'ı. `topic`/`cefrLevel` shared-types'taki
 * `topicSchema`/`cefrLevelSchema`'yı REUSE ediyor (yeni bir taxonomy YOK) —
 * bu, madde 4/5'in "yalnızca izin verilen değer" kısıtını, ayrı bir
 * post-hoc kontrol koduna gerek kalmadan, parse SEVİYESİNDE sağlıyor:
 * taxonomy dışı bir değer literal olarak parse edilemez.
 *
 * `segmentOrdinal` referansları (learningPoints/quiz) DB id'si DEĞİL — bu
 * aşamada segment'ler henüz insert edilmedi, id'ler yok. Publish adımı
 * (`publish-content.ts`) bu ordinal'leri gerçek draft segment listesine karşı
 * doğrulayıp DB id'sine çevirir (bkz. `validateSegmentReferences`).
 */

/** Kebab-case, kısa (2-6 kelime) bir içerik slug'ı — `resolve-playback-url.ts`'in beklediği `local-<slug>` deseniyle uyumlu. Video dosya adından DEĞİL, transcript'in GERÇEK konusundan türetiliyor (bkz. enrichment-llm-client.ts prompt'u) — STT'nin opak content-id'sinin (örn. "a1final1") aksine insan-okunabilir bir isim. */

export const contentSlugSchema = z
  .string()
  .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Slug kebab-case olmalı (küçük harf/rakam, tire ile ayrılmış)")
  .min(3)
  .max(64);

export const enrichmentLearningPointSchema = z.object({
  segmentOrdinal: z.number().int().positive(),
  type: learningPointTypeSchema,
  expression: z.string().min(1),
  englishExplanation: z.string().min(1),
  turkishExplanation: z.string().min(1),
  exampleEn: z.string().nullable(),
  exampleTr: z.string().nullable(),
});
export type EnrichmentLearningPoint = z.infer<typeof enrichmentLearningPointSchema>;

/** Her segment için ZORUNLU (DB'de `video_transcript_segments.english_explanation`/`turkish_explanation` NOT NULL, bkz. transcript-segments.schema.ts) — ama madde 6 kararı gereği trivial segmentler için KISA olması bekleniyor, uzun bir pedagojik analiz DEĞİL. */
export const enrichmentSegmentSchema = z.object({
  ordinal: z.number().int().positive(),
  englishExplanation: z.string().min(1),
  turkishExplanation: z.string().min(1),
});
export type EnrichmentSegment = z.infer<typeof enrichmentSegmentSchema>;

/** `gloss` — Türkçe, kısa, kullanıcıya gösterilecek anlam (bkz. VideoFeedItem.tsx'teki wordGloss render'ı — mevcut ürün konvansiyonu). */
export const enrichmentVocabularyItemSchema = z.object({
  lemma: z.string().min(1),
  gloss: z.string().min(1),
});
export type EnrichmentVocabularyItem = z.infer<typeof enrichmentVocabularyItemSchema>;

const enrichmentQuizOptionSchema = z.object({
  text: z.string().min(1),
  isCorrect: z.boolean(),
});

/** 4 seçenek, tam olarak bir doğru cevap — mevcut `quizzesTable`/`quiz.ts`'in bugüne kadarki TÜM içerikte kullandığı sabit şekil (bkz. seed-quizzes.ts). */
export const enrichmentQuizSchema = z
  .object({
    segmentOrdinal: z.number().int().positive(),
    question: z.string().min(1),
    options: z.array(enrichmentQuizOptionSchema).length(4),
  })
  .refine((quiz) => quiz.options.filter((option) => option.isCorrect).length === 1, {
    message: "Quiz'in tam olarak bir doğru cevabı olmalı",
  });
export type EnrichmentQuiz = z.infer<typeof enrichmentQuizSchema>;

export const enrichmentOutputSchema = z.object({
  contentSlug: contentSlugSchema,
  topic: topicSchema,
  cefrLevel: cefrLevelSchema,
  segments: z.array(enrichmentSegmentSchema).min(1),
  // Madde 8: seçici — 0 olabilir (trivial bir transcript'te öğretmeye değer
  // kelime bulunamayabilir), zorla doldurulmuyor.
  vocabulary: z.array(enrichmentVocabularyItemSchema),
  learningPoints: z.array(enrichmentLearningPointSchema),
  quiz: enrichmentQuizSchema,
});
export type EnrichmentOutput = z.infer<typeof enrichmentOutputSchema>;
