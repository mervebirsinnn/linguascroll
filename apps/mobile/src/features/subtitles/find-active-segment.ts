import type { TranscriptSegment } from "@linguascroll/shared-types";

/**
 * React/expo'dan BAĞIMSIZ, saf fonksiyon — BİLİNÇLİ OLARAK kendi dosyasında:
 * bu projenin mobile jest kurulumu "expo"/"react-native" importu içeren hiçbir
 * dosyayı transform ETMİYOR (bkz. jest.config.js — sade ts-jest, RN/Metro
 * preset'i yok). `useActiveSubtitle` (use-active-subtitle.ts) "expo"dan
 * `useEventListener` import ettiği için o dosya test edilemez; bu fonksiyon
 * ayrı tutulduğu için testler (use-active-subtitle.test.ts) sorunsuz çalışır.
 *
 * Segment sınırı [startMs, endMs) — yarı-açık aralık: startMs'e TAM eşit an
 * segmente dahil, endMs'e TAM eşit an artık dahil DEĞİL (bir sonraki segment'in
 * başlangıcıyla çakışmasın diye, bkz. transcript-segments.schema.ts'teki
 * `end_ms > start_ms` CHECK'i). Segment'ler arasında bir boşluk varsa (subtitle
 * olmayan aralık) `null` döner.
 *
 * `segments`'in `ordinal`e göre sıralı geldiği (bkz. FeedService/TranscriptSegmentsRepository)
 * ve ÇAKIŞMADIĞI varsayılıyor — bu yüzden basit bir linear scan yeterli (video
 * başına segment sayısı küçük, binary search burada YAGNI).
 */
export function findActiveSegment(segments: readonly TranscriptSegment[], currentTimeMs: number): TranscriptSegment | null {
  for (const segment of segments) {
    if (currentTimeMs >= segment.startMs && currentTimeMs < segment.endMs) {
      return segment;
    }
  }
  return null;
}
