import type { DraftSegment } from "./segment-transcript";

/**
 * Chunk 11 — ±300ms senkron QA prosedürü için: draft segment'lerden standart
 * bir `.srt` üretir ki gerçek video, herhangi bir oynatıcıda (VLC vb.) bu
 * altyazıyla açılıp kulakla/gözle doğrulanabilsin — DB'ye/mobile'a hiç
 * dokunmadan en ucuz gerçeklik kontrolü. Saf, deterministik fonksiyon.
 */
function formatTimestamp(ms: number): string {
  const totalMs = Math.max(0, Math.round(ms));
  const hours = Math.floor(totalMs / 3_600_000);
  const minutes = Math.floor((totalMs % 3_600_000) / 60_000);
  const seconds = Math.floor((totalMs % 60_000) / 1000);
  const millis = totalMs % 1000;
  const pad = (n: number, len = 2) => String(n).padStart(len, "0");
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)},${pad(millis, 3)}`;
}

export function buildSrt(segments: readonly DraftSegment[]): string {
  return segments
    .map((segment, index) => {
      const cueNumber = index + 1;
      return `${cueNumber}\n${formatTimestamp(segment.startMs)} --> ${formatTimestamp(segment.endMs)}\n${segment.text}\n`;
    })
    .join("\n");
}
