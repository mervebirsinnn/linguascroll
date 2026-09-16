import type { VideoVocabularyItem } from "@linguascroll/shared-types";

/**
 * Chunk 14 — word-tap. React/expo'dan BAĞIMSIZ, saf fonksiyon — `find-active-segment.ts`'in
 * AYNI gerekçesiyle kendi dosyasında (bkz. o dosyanın yorumu): bu projenin
 * mobile jest kurulumu "expo"/"react-native" importu içeren dosyaları transform
 * ETMİYOR, bu yüzden asıl render mantığı (`SubtitleOverlay.tsx`) test edilemiyor —
 * BÜTÜN gerçek eşleştirme/bölme mantığı burada, testlenebilir halde yaşıyor.
 *
 * KULLANICI KARARI — inflection/çekim farkını ÇÖZMEYE ÇALIŞMIYORUZ: `lemma`,
 * segment metninde SADECE tam kelime/phrase sınırıyla (case-insensitive) birebir
 * geçiyorsa tıklanabilir olur. "go" lemma'sı "went" metninde EŞLEŞMEZ — bu
 * BİLİNÇLİ bir sınırlama (stemming/NLP dependency YOK, bkz. content-quality-gate.ts'teki
 * AYNI karar). Güvenilir eşleşmeyen vocabulary, o segment'te sessizce
 * tıklanamaz kalır (kullanıcı video'nun vocabulary panelinden yine de kaydedebilir).
 */

export type VocabularyMatch = {
  start: number;
  end: number;
  word: VideoVocabularyItem;
};

export type SubtitleSpan = { text: string; word: VideoVocabularyItem | null };

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * `\b` kelime sınırı kontrolü — tek kelimeli lemma'lar İÇİN doğru çalışır.
 * Çok kelimeli phrase'ler ("end up staying" gibi) için `\b` sadece İLK/SON
 * karakterde kontrol edildiği için (aradaki boşluklar zaten `\b` gerektirmiyor)
 * yine doğru sonuç verir — regex `\b<phrase>\b` deseni fiilen "phrase'in
 * başı/sonu bir kelime sınırında" anlamına gelir, aradaki boşlukları OLDUĞU
 * GİBİ eşleştirir.
 */
export function findVocabularyMatches(text: string, vocabulary: readonly VideoVocabularyItem[]): VocabularyMatch[] {
  const candidates: VocabularyMatch[] = [];

  for (const item of vocabulary) {
    const lemma = item.word.lemma.trim();
    if (!lemma) {
      continue;
    }
    const pattern = new RegExp(`\\b${escapeRegExp(lemma)}\\b`, "gi");
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(text)) !== null) {
      candidates.push({ start: match.index, end: match.index + match[0].length, word: item });
      if (match[0].length === 0) {
        // Teorik olarak imkansız (lemma boş string'ler continue ile elendi),
        // yine de sonsuz döngüye karşı defense-in-depth.
        pattern.lastIndex++;
      }
    }
  }

  // Daha UZUN (phrase) eşleşmeler önce seçilir — örn. "end up staying" hem
  // kendi başına hem "end up" gibi daha kısa bir alt-dize olarak ayrı bir
  // vocabulary item'ında eşleşiyorsa, en uzun/en spesifik olan kazanır.
  candidates.sort((a, b) => b.end - b.start - (a.end - a.start) || a.start - b.start);

  const accepted: VocabularyMatch[] = [];
  for (const candidate of candidates) {
    const overlaps = accepted.some((existing) => candidate.start < existing.end && candidate.end > existing.start);
    if (!overlaps) {
      accepted.push(candidate);
    }
  }

  return accepted.sort((a, b) => a.start - b.start);
}

/** `SubtitleOverlay`'in render edeceği düz/vocabulary parçalarının sırası — metnin TAMAMINI, sırayla, boşluksuz kapsar. */
export function buildSubtitleSpans(text: string, vocabulary: readonly VideoVocabularyItem[]): SubtitleSpan[] {
  const matches = findVocabularyMatches(text, vocabulary);
  const spans: SubtitleSpan[] = [];
  let cursor = 0;

  for (const match of matches) {
    if (match.start > cursor) {
      spans.push({ text: text.slice(cursor, match.start), word: null });
    }
    spans.push({ text: text.slice(match.start, match.end), word: match.word });
    cursor = match.end;
  }
  if (cursor < text.length) {
    spans.push({ text: text.slice(cursor), word: null });
  }

  return spans;
}
