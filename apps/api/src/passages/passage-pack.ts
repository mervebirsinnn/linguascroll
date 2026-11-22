import { createHash } from "node:crypto";
import { passageLevelSchema } from "@linguascroll/shared-types";
import { z } from "zod";

/**
 * Okuma pratiği YAYIN PAKETİ: içerik üretiminin çıktısı olan, tek metin = tek JSON dosyası. Bu dosya yalnız şekli
 * tanımlar; içerik kuralları (kalite kapısı) passage-pack-validator.ts'te, DB'ye yazım passage-publisher.ts'te.
 *
 * `editorial` ve her sorunun `evidence` aralığı DB'ye YAZILMAZ (bkz. passages.schema.ts başlık notu): çalışma
 * zamanında tüketen davranış yok; ama yayın kapısı bunları ZORUNLU tutar — kaynaksız iddia veya metinde dayanağı
 * olmayan doğru cevap yayına çıkamaz.
 *
 * Tuzak türleri, onaylanan tasarımdaki artifact TRAPS kodlarıdır. DB'de düz metin (migration gerektirmesin diye),
 * ama paketlerde bu kapalı küme: yazım hatası ("extrem") sessizce yeni bir tür olmasın.
 */
export const PASSAGE_TRAP_TYPES = ["copy", "extreme", "reverse", "notstated", "detail", "sound", "context"] as const;
export const passageTrapTypeSchema = z.enum(PASSAGE_TRAP_TYPES);

/** Metin içi [start, end) UTF-16 aralığı (passage_word_spans ile aynı birim). */
export const textRangeSchema = z.object({ paragraphIndex: z.number().int().min(0), start: z.number().int().min(0), end: z.number().int().min(1) });

const nonEmpty = z.string().trim().min(1);
const keySchema = z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "anahtar küçük harf/rakam ve tire olmalı");
const editorialSourceSchema = z.object({ claim: nonEmpty, source: nonEmpty, checkedOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) });

// Kaynak alıntısını özgün üretim diye işaretlemeden aynı içerik kontrollerinden geçir.
// Bu kayıt kaynak türünü belirtir; yeniden kullanım izninin kanıtı değildir.
const editorialSchema = z.discriminatedUnion("original", [
  z.object({
    original: z.literal(true),
    noFactualClaims: z.boolean().optional(),
    sources: z.array(editorialSourceSchema),
  }),
  z.object({
    original: z.literal(false),
    sourceType: z.literal("verbatim-excerpt"),
    noFactualClaims: z.boolean().optional(),
    sources: z.array(editorialSourceSchema).min(1),
  }),
]);

export const passagePackSchema = z.object({
  slug: keySchema,
  level: passageLevelSchema,
  title: nonEmpty.max(120),
  topic: nonEmpty.max(60),
  sortOrder: z.number().int().min(0).max(1_000_000),
  isFreeSample: z.boolean(),
  paragraphs: z.array(z.string()).min(1).max(8),
  words: z
    .array(
      z.object({
        lemma: nonEmpty.max(80),
        gloss: nonEmpty.max(160),
        // Cümle GEÇİŞ başına (aynı kelimenin iki cümlede geçtiği metinde doğru kaynak cümle). passage_words.context_sentence
        // (eski istemci yedeği) yayıncıda İLK geçişin cümlesinden türetilir.
        // `contextSentenceTr`: cümlenin Türkçe anlamı (isteğe bağlı; ya paketteki TÜM geçişlerde ya hiçbirinde, bkz. validator).
        spans: z.array(textRangeSchema.extend({ surface: nonEmpty, contextSentence: nonEmpty.max(500), contextSentenceTr: nonEmpty.max(700).optional() })).min(1),
      }),
    )
    .min(1),
  questions: z
    .array(
      z.object({
        key: keySchema,
        type: z.string().regex(/^[a-z][a-z0-9-]*$/, "tür kebab-case olmalı"),
        prompt: nonEmpty.max(400),
        evidence: textRangeSchema,
        options: z.array(
          z.object({
            key: keySchema,
            text: nonEmpty.max(300),
            isCorrect: z.boolean(),
            trapType: passageTrapTypeSchema.nullable(),
            explanation: nonEmpty.max(600),
          }),
        ),
      }),
    )
    .length(4),
  editorial: editorialSchema,
});

export type PassagePack = z.infer<typeof passagePackSchema>;

/**
 * Kanonik içerik özeti (passages.content_hash): DB'ye yazılan İÇERİĞİN sha256'sı. JSON dosyasının boşluğu/anahtar sırası
 * etkilemez; ama saklanan her alan etkiler (paragraf metni tam haliyle: offset'ler ona bağlı). Kelimeler ve span'lar
 * sıradan bağımsız (sıralanır); sorular/şıklar sıralı (position anlamlı). sortOrder / isFreeSample / editorial / evidence
 * dışarıda: ilk ikisi yayıncıda ayrıca karşılaştırılır, ikisi saklanmaz.
 */
export function computePassageContentHash(pack: PassagePack): string {
  const words = [...pack.words]
    .map((word) => ({
      lemma: word.lemma,
      gloss: word.gloss,
      spans: [...word.spans]
        .sort((a, b) => a.paragraphIndex - b.paragraphIndex || a.start - b.start)
        // Çeviri YALNIZ varsa hash'e girer: çevirisiz (yayımlanmış) paketlerin hash'i bit bit aynı kalır, "içerik farklı" olmaz.
        .map((span) =>
          span.contextSentenceTr === undefined
            ? [span.paragraphIndex, span.start, span.end, span.surface, span.contextSentence]
            : [span.paragraphIndex, span.start, span.end, span.surface, span.contextSentence, span.contextSentenceTr],
        ),
    }))
    .sort((a, b) => (a.lemma === b.lemma ? (a.gloss < b.gloss ? -1 : a.gloss > b.gloss ? 1 : 0) : a.lemma < b.lemma ? -1 : 1));
  const canonical = {
    level: pack.level,
    title: pack.title,
    topic: pack.topic,
    paragraphs: pack.paragraphs,
    words,
    questions: pack.questions.map((question) => ({
      key: question.key,
      type: question.type,
      prompt: question.prompt,
      options: question.options.map((option) => [option.key, option.text, option.isCorrect, option.trapType, option.explanation]),
    })),
  };
  return createHash("sha256").update(JSON.stringify(canonical)).digest("hex");
}
