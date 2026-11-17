import { useState } from "react";
import { useEventListener } from "expo";
import type { VideoPlayer } from "expo-video";
import type { TranscriptSegment } from "@linguascroll/shared-types";
import { findActiveSegment } from "./find-active-segment";

/**
 * expo-video'nun native `timeUpdate` event'ini dinler (bkz. VideoFeedItem'da
 * `timeUpdateEventInterval` ayarı) — manuel bir polling/interval kurulmuyor,
 * player zaten kendi playback thread'inde bu event'i düzenli aralıklarla
 * üretiyor. Aktif segment DEĞİŞMEDİYSE state güncellenmiyor (gereksiz re-render'ı
 * önlemek için) — aynı segment içinde art arda gelen `timeUpdate` tick'leri
 * hiçbir şeyi yeniden render etmez.
 *
 * Asıl [startMs, endMs) eşleştirme mantığı `findActiveSegment`'te (ayrı dosya,
 * bkz. o dosyanın yorumu — bu projenin mobile jest kurulumu "expo" importu
 * içeren dosyaları transform edemiyor, bu yüzden test edilebilir çekirdek
 * BİLİNÇLİ OLARAK ayrıştırıldı).
 */
export function useActiveSubtitle(player: VideoPlayer, segments: readonly TranscriptSegment[]): {
  activeSegment: TranscriptSegment | null;
  syncToTime: (currentTimeSeconds: number) => void;
} {
  const [activeSegment, setActiveSegment] = useState<TranscriptSegment | null>(null);

  function syncToTime(currentTimeSeconds: number): void {
    const next = findActiveSegment(segments, currentTimeSeconds * 1000);
    setActiveSegment((previous) => (previous?.id === next?.id ? previous : next));
  }

  useEventListener(player, "timeUpdate", ({ currentTime }) => {
    syncToTime(currentTime);
  });

  return { activeSegment, syncToTime };
}
