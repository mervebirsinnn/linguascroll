import type { TimedWord } from "./transcript-candidate";

/**
 * Chunk 11 — STT'den gelen kelime-zamanlı transcript'i, mevcut
 * `transcriptSegmentSchema`'nın (packages/shared-types) beklediği şekle
 * (ordinal/startMs/endMs/text) yakınsayan bir TASLAK'a böler. Enrichment
 * (englishExplanation/turkishExplanation/learningPoints) BİLİNÇLİ OLARAK YOK —
 * bu chunk'ın kapsamı sadece transcript/timestamp doğruluğu.
 *
 * Segmentasyon TEK bir sinyale (nokta işareti regex'i) DAYANMIYOR — üç sinyal
 * birlikte: (1) kelimeler arası SESSİZLİK boşluğu, (2) cümle sonu noktalaması,
 * (3) maksimum süre/karakter tavanı (doğal bir sinyal olmasa bile okunabilirlik
 * için zorunlu bölme). Ordinal 1'den başlar (mevcut DB konvansiyonuyla
 * tutarlı — bkz. transcript-segments.schema.ts).
 */

/** Kelimeler arası bu kadar (ms) sessizlik → doğal cümle/phrase sınırı adayı. */
export const PAUSE_GAP_MS = 500;
/** Bir segment bu süreyi (ms) aşarsa, doğal bir duraklama olmasa bile zorla bölünür. */
export const MAX_SEGMENT_DURATION_MS = 7000;
/** Bir segment bu karakter sayısını aşarsa zorla bölünür (okunabilir altyazı uzunluğu). */
export const MAX_SEGMENT_CHARS = 90;
/** Ardışık kelimeler arası bu kadar (ms) çakışma sessizce düzeltilir; ÜSTÜ hata. */
export const OVERLAP_TOLERANCE_MS = 20;
/**
 * Bir segment bu süreden (ms) KISA çıkarsa komşusuyla birleştirilir. Gerçek
 * production içeriğinde bulunan bir bug sınıfından türetildi: konuşmacının
 * virgül/kısa duraklama noktalarında PAUSE_GAP_MS sinyali erken tetiklenmesi,
 * "Yesterday," / "understand." / "through." gibi 280-780ms'lik, tek başına
 * anlamsız fragman segmentler üretiyordu — enrichment LLM'i bunlar için gerçek
 * bir açıklama üretemeyip segmenti aynen geri yazıyordu (5 gerçek örnek,
 * 3 video, content-enrichment/output'tan silinip buraya bu fix'le geldi).
 * 900ms eşiği, gözlenen en kötü örneğin (780ms) ÜSTÜNDE güvenli bir pay
 * bırakıyor — ayrıca "Wait." (180ms) gibi kısa ama TEK BAŞINA anlamlı bazı
 * segmentleri de gereksiz yere birleştirebilir, ama bu YANLIŞ bir sonuç
 * üretmiyor (sadece granülariteyi biraz azaltıyor) — asıl önlemek istediğimiz
 * "LLM'in açıklayacak bir şey bulamaması" sınıfı, threshold onu kesin yakalıyor.
 */
export const MIN_SEGMENT_DURATION_MS = 900;

const SENTENCE_END_PATTERN = /[.!?]["')\]]?$/;

export type DraftSegment = {
  ordinal: number;
  startMs: number;
  endMs: number;
  text: string;
};

export class SegmentationError extends Error {}

/**
 * `words[i+1].startMs < words[i].endMs` (çakışma) küçükse (<= OVERLAP_TOLERANCE_MS)
 * sessizce düzeltir (words[i+1].startMs'i words[i].endMs'e çeker); büyükse
 * SegmentationError fırlatır. Girdi mutasyona uğratılmaz, yeni bir dizi döner.
 */
function normalizeWordOverlaps(words: readonly TimedWord[]): TimedWord[] {
  const result: TimedWord[] = [];
  for (const word of words) {
    const previous = result[result.length - 1];
    if (!previous) {
      result.push(word);
      continue;
    }
    const overlap = previous.endMs - word.startMs;
    if (overlap <= 0) {
      result.push(word);
      continue;
    }
    if (overlap > OVERLAP_TOLERANCE_MS) {
      throw new SegmentationError(
        `Kelimeler arası çakışma tolerans dışı: "${previous.text}" (bitiş ${previous.endMs}ms) ile ` +
          `"${word.text}" (başlangıç ${word.startMs}ms) arasında ${overlap}ms çakışma (tolerans: ${OVERLAP_TOLERANCE_MS}ms).`,
      );
    }
    result.push({ ...word, startMs: previous.endMs });
  }
  return result;
}

function shouldBreakBefore(buffer: readonly TimedWord[], next: TimedWord): boolean {
  if (buffer.length === 0) {
    return false;
  }
  const first = buffer[0]!;
  const last = buffer[buffer.length - 1]!;

  const gapMs = next.startMs - last.endMs;
  const naturalBreak = gapMs >= PAUSE_GAP_MS || SENTENCE_END_PATTERN.test(last.text);

  const wouldExceedDuration = next.endMs - first.startMs > MAX_SEGMENT_DURATION_MS;
  const currentText = buffer.map((w) => w.text).join(" ");
  const wouldExceedChars = currentText.length + 1 + next.text.length > MAX_SEGMENT_CHARS;

  return naturalBreak || wouldExceedDuration || wouldExceedChars;
}

function flushBuffer(buffer: readonly TimedWord[]): { startMs: number; endMs: number; text: string } {
  const first = buffer[0]!;
  const last = buffer[buffer.length - 1]!;
  return { startMs: first.startMs, endMs: last.endMs, text: buffer.map((w) => w.text).join(" ") };
}

type FlushedRange = { startMs: number; endMs: number; text: string };

/** Bir birleşme, MAX_SEGMENT_DURATION_MS/MAX_SEGMENT_CHARS tavanlarını aşıyorsa YAPILMAZ — okunabilirlik tavanları anlamsız-fragman düzeltmesinden daha öncelikli. */
function wouldExceedCaps(a: FlushedRange, b: FlushedRange): boolean {
  const durationMs = b.endMs - a.startMs;
  const chars = a.text.length + 1 + b.text.length;
  return durationMs > MAX_SEGMENT_DURATION_MS || chars > MAX_SEGMENT_CHARS;
}

/**
 * MIN_SEGMENT_DURATION_MS'in altındaki her fragmanı bir komşusuna yapıştırır.
 * Yön, fragmanın cümle-sonu noktalamasıyla BİTİP bitmediğine göre seçilir:
 * noktalama YOKSA (virgül/hiç — "Yesterday," gibi) düşüncenin SONRAKİ segmentte
 * devam ettiği varsayılır → SONRAKİyle birleşir. Noktalama VARSA ("understand."
 * gibi) fragmanın bir önceki segmentte başlayan düşüncenin KUYRUĞU olduğu
 * varsayılır → ÖNCEKİyle birleşir (ilk segment için önceki yoksa sonrakiyle
 * birleşmeye düşer). Birleşme sonucu YİNE kısa çıkabileceği için (iki ardışık
 * fragman) döngü, bir tam geçişte hiç birleşme olmayana kadar tekrar eder.
 * Bir yöndeki birleşme MAX tavanlarını aşacaksa o yön atlanır (diğer yön
 * denenir); ikisi de aşıyorsa fragman olduğu gibi bırakılır — kısa ama
 * GEÇERLİ bir segment, tavanı aşan geçersiz bir segmentten daha iyi.
 */
function mergeShortFragments(ranges: readonly FlushedRange[]): FlushedRange[] {
  let result = ranges.slice();
  let mergedAny = true;
  while (mergedAny) {
    mergedAny = false;
    for (let i = 0; i < result.length; i++) {
      const range = result[i]!;
      if (range.endMs - range.startMs >= MIN_SEGMENT_DURATION_MS) {
        continue;
      }
      const endsWithTerminalPunctuation = SENTENCE_END_PATTERN.test(range.text);
      const previous = i > 0 ? result[i - 1]! : undefined;
      const next = i < result.length - 1 ? result[i + 1]! : undefined;

      if (endsWithTerminalPunctuation && previous && !wouldExceedCaps(previous, range)) {
        result.splice(i - 1, 2, { startMs: previous.startMs, endMs: range.endMs, text: `${previous.text} ${range.text}` });
        mergedAny = true;
        break;
      }
      if (next && !wouldExceedCaps(range, next)) {
        result.splice(i, 2, { startMs: range.startMs, endMs: next.endMs, text: `${range.text} ${next.text}` });
        mergedAny = true;
        break;
      }
      if (previous && !wouldExceedCaps(previous, range)) {
        result.splice(i - 1, 2, { startMs: previous.startMs, endMs: range.endMs, text: `${previous.text} ${range.text}` });
        mergedAny = true;
        break;
      }
      // Hiçbir komşuya (tavanları aşmadan) birleştirilemedi — olduğu gibi bırakılıyor.
    }
  }
  return result;
}

/**
 * Ana giriş noktası. `durationMs` — candidate'in bildirdiği toplam ses süresi;
 * hiçbir segment bunu aşamaz (aşarsa clamp edilir, aşırı/degenerate bir clamp
 * segment'i sıfır/negatif süreye düşürüyorsa hata fırlatılır).
 */
export function buildDraftSegments(rawWords: readonly TimedWord[], durationMs: number): DraftSegment[] {
  if (rawWords.length === 0) {
    throw new SegmentationError("Boş transcript: segment üretmek için en az bir kelime gerekli.");
  }

  const words = normalizeWordOverlaps(rawWords);

  const flushedRanges: { startMs: number; endMs: number; text: string }[] = [];
  let buffer: TimedWord[] = [];

  for (const word of words) {
    if (shouldBreakBefore(buffer, word)) {
      flushedRanges.push(flushBuffer(buffer));
      buffer = [];
    }
    buffer.push(word);
  }
  if (buffer.length > 0) {
    flushedRanges.push(flushBuffer(buffer));
  }

  const mergedRanges = mergeShortFragments(flushedRanges);

  const segments: DraftSegment[] = mergedRanges.map((range, index) => {
    const clampedEndMs = Math.min(range.endMs, durationMs);
    if (clampedEndMs <= range.startMs) {
      throw new SegmentationError(
        `Segment ${index + 1} ("${range.text}") durationMs (${durationMs}ms) sınırına clamp edilince ` +
          `geçersiz hale geldi (start=${range.startMs}ms, clamped end=${clampedEndMs}ms).`,
      );
    }
    return { ordinal: index + 1, startMs: range.startMs, endMs: clampedEndMs, text: range.text };
  });

  assertInvariants(segments);
  return segments;
}

/** Defense-in-depth: construction'ın kendisi bunu garanti etse de, sessizce kırılmasın diye açık bir doğrulama. */
function assertInvariants(segments: readonly DraftSegment[]): void {
  segments.forEach((segment, index) => {
    if (segment.ordinal !== index + 1) {
      throw new SegmentationError(`Ordinal kesintili: index ${index} için ordinal ${segment.ordinal} bekleniyordu ${index + 1}.`);
    }
    if (segment.startMs < 0) {
      throw new SegmentationError(`Segment ${segment.ordinal}: negatif startMs (${segment.startMs}).`);
    }
    if (segment.endMs <= segment.startMs) {
      throw new SegmentationError(`Segment ${segment.ordinal}: endMs (${segment.endMs}) startMs'ten (${segment.startMs}) büyük değil.`);
    }
    const previous = segments[index - 1];
    if (previous && segment.startMs < previous.endMs) {
      throw new SegmentationError(
        `Segment ${segment.ordinal} (start=${segment.startMs}ms), önceki segment ${previous.ordinal}'in ` +
          `bitişinden (${previous.endMs}ms) ÖNCE başlıyor — kronolojik sıra bozuldu.`,
      );
    }
  });
}
