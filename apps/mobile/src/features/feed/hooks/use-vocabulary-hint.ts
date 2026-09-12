import { useEffect, useState } from "react";
import { getHasSeenVocabularyHint, markVocabularyHintSeen } from "./vocabulary-hint-storage";

/**
 * Chunk 15 — `useSavedWordIds`'in AYNI gerekçesiyle Feed.tsx seviyesinde,
 * TÜM `VideoFeedItem`'ların ortak atasında yaşıyor: FlatList'in windowing'i
 * yüzünden birden fazla `VideoFeedItem` AYNI ANDA mount olabiliyor — ipucu
 * state'i her item'ın KENDİ local state'i olsaydı, birinde dismiss etmek
 * diğerlerinde hâlâ görünür kalırdı (her instance kendi AsyncStorage
 * snapshot'ını ayrı ayrı tutardı). Tek mantıksal state, salt-okunur/tek
 * callback olarak akıyor (bkz. use-saved-word-ids.ts'in aynı yorumu).
 */
export function useVocabularyHint(): { visible: boolean; dismiss: () => void } {
  const [hasSeen, setHasSeen] = useState<boolean | null>(null);

  useEffect(() => {
    let isCancelled = false;
    getHasSeenVocabularyHint().then((seen) => {
      if (!isCancelled) {
        setHasSeen(seen);
      }
    });
    return () => {
      isCancelled = true;
    };
  }, []);

  function dismiss(): void {
    setHasSeen(true);
    markVocabularyHintSeen().catch(() => {
      // Aynı minimalist tutum: local state zaten güncellendi (ipucu kayboldu),
      // persist başarısız olursa en kötü ihtimalle bir sonraki app açılışında
      // bir kez daha gösterilir — App Store MVP için kabul edilebilir.
    });
  }

  return { visible: hasSeen === false, dismiss };
}
