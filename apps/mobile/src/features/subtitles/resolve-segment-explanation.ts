import type { LearningPoint, LearningPointType, TranscriptSegment, VideoVocabularyItem } from "@linguascroll/shared-types";
import { findVocabularyMatches } from "./find-vocabulary-matches";

/**
 * Chunk 16 revizyon — device smoke test'inde bulunan gerçek bug: enrichment
 * LLM'i bazı segment'ler için `englishExplanation`'ı, cümlenin KENDİSİNİN
 * (neredeyse) birebir tekrarı olarak üretmiş ("AI can be a double-edged
 * sword." → englishExplanation: "AI can be a double-edged sword."). Bu, ID
 * karşılaştırması DEĞİL — LLM çıktısı noktalama/boşluk farkıyla da aynı hatayı
 * üretebiliyor, bu yüzden case/whitespace/noktalama-insensitive bir normalize
 * karşılaştırması gerekiyor.
 *
 * `find-vocabulary-matches.ts`'in AYNI gerekçesiyle kendi dosyasında, saf
 * fonksiyon: `find-active-segment.ts`/`find-vocabulary-matches.ts` testlerinin
 * AYNI Jest kurulumu (expo/react-native import etmeyen dosyalar transform
 * ediliyor) burada da geçerli.
 */

const PUNCTUATION_PATTERN = /[.,!?;:"'’‘“”()[\]{}\-–—]/g;

function normalize(text: string): string {
  return text.toLowerCase().trim().replace(PUNCTUATION_PATTERN, "").replace(/\s+/g, " ");
}

/**
 * İki metin, büyük/küçük harf + boşluk + noktalama farkları göz ardı edilerek
 * "aynı cümle" sayılıyor mu? Requirement madde 10 — bu KASITLI OLARAK basit
 * tutuluyor (tam bir string-similarity/Levenshtein kütüphanesi YOK): sadece
 * "LLM açıklamayı olduğu gibi kopyaladı mı" sorusuna cevap veriyor, kısmi
 * benzerlik/parafraz tespiti kapsam dışı.
 */
export function isEffectivelySameSentence(a: string, b: string): boolean {
  return normalize(a) === normalize(b);
}

/**
 * Madde 5 — "the"/"a"/"is"/"and" gibi filler kelimeler asla fallback olarak
 * gösterilmemeli. Backend'in content-quality-gate.ts'indeki
 * `IGNORED_VOCABULARY_LEMMAS`'ın AYNI kararı, KÜÇÜK bir alt kümesiyle burada
 * tekrarlanıyor (apps/mobile, apps/api'ye bağımlı değil — import edilemez) —
 * tam liste burada gerekmiyor çünkü vocabulary zaten publish sırasında o
 * gate'ten geçmiş oluyor; bu sadece learning point `expression`'ları için ek
 * bir güvenlik ağı.
 */
const FILLER_WORDS = new Set([
  "a", "an", "the", "and", "or", "but", "is", "am", "are", "was", "were", "be", "been", "being",
  "to", "of", "in", "on", "at", "for", "with", "as", "by", "from", "very", "so", "this", "that",
]);

function isFillerExpression(expression: string): boolean {
  const normalized = expression.trim().toLowerCase();
  // Çok kelimeli bir phrase ("end up staying" gibi) triviality riski taşımaz —
  // sadece TEK kelimelik expression'lar filler-kelime listesine karşı kontrol edilir.
  return !normalized.includes(" ") && FILLER_WORDS.has(normalized);
}

function findUsableLearningPoint(
  learningPoints: readonly LearningPoint[],
  type: LearningPointType,
  language: "en" | "tr",
  originalText: string,
): { expression: string; explanation: string } | null {
  for (const point of learningPoints) {
    if (point.type !== type || isFillerExpression(point.expression)) {
      continue;
    }
    const explanation = language === "en" ? point.englishExplanation : point.turkishExplanation;
    if (explanation.trim().length === 0 || isEffectivelySameSentence(explanation, originalText)) {
      continue;
    }
    return { expression: point.expression, explanation };
  }
  return null;
}

export type ResolvedSegmentExplanation =
  | { kind: "sentence"; text: string }
  | { kind: "labeled"; label: string; text: string }
  | { kind: "none" };

/**
 * Requirement'taki öncelik sırası — sırayla dener, ilk kullanılabilir sonucu döner:
 *
 * 1. segment'in kendi açıklaması (dolu VE orijinal cümleyle aynı DEĞİLSE).
 * 2. segment'e bağlı bir "phrase" learning point (expression + açıklama).
 * 3. segment metninde geçen bir video vocabulary item'ı (lemma + gloss) —
 *    `findVocabularyMatches`'in AYNI eşleştirme mantığı (bkz. o dosya),
 *    SubtitleOverlay'in word-tap highlighting'iyle TUTARLI.
 * 4. segment'e bağlı bir "grammar" learning point (2'yle AYNI şekil, farklı tip).
 * 5. hiçbiri yoksa `{ kind: "none" }` — orijinal cümle ASLA tekrar gösterilmez
 *    (requirement madde 2).
 */
export function resolveSegmentExplanation(
  segment: TranscriptSegment,
  vocabulary: readonly VideoVocabularyItem[],
  language: "en" | "tr",
): ResolvedSegmentExplanation {
  const primary = language === "en" ? segment.englishExplanation : segment.turkishExplanation;
  if (primary.trim().length > 0 && !isEffectivelySameSentence(primary, segment.text)) {
    return { kind: "sentence", text: primary };
  }

  const phrasePoint = findUsableLearningPoint(segment.learningPoints, "phrase", language, segment.text);
  if (phrasePoint) {
    return { kind: "labeled", label: phrasePoint.expression, text: phrasePoint.explanation };
  }

  const vocabularyMatch = findVocabularyMatches(segment.text, vocabulary)[0]?.word;
  if (vocabularyMatch && !isFillerExpression(vocabularyMatch.word.lemma)) {
    return { kind: "labeled", label: vocabularyMatch.word.lemma, text: vocabularyMatch.word.gloss };
  }

  const grammarPoint = findUsableLearningPoint(segment.learningPoints, "grammar", language, segment.text);
  if (grammarPoint) {
    return { kind: "labeled", label: grammarPoint.expression, text: grammarPoint.explanation };
  }

  return { kind: "none" };
}
