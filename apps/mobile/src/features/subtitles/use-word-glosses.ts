import { useEffect, useState } from "react";
import type { VideoWordGlosses } from "@linguascroll/shared-types";
import { fetchWordGlosses } from "./api/fetch-word-glosses";
import { createWordGlossesCache } from "./word-glosses-cache";

const wordGlossesCache = createWordGlossesCache(fetchWordGlosses);

/**
 * Video aktif olduğunda anlamları yükler. Hata sessizce "anlam yok"a düşer:
 * kelimeler sadece tıklanabilir görünmez, altyazı/vocabulary akışı etkilenmez
 * (bu özellik bir artı — yüklenemezse hata ekranı çıkmaz).
 */
export function useWordGlosses(videoId: string, enabled: boolean): VideoWordGlosses | undefined {
  const [loaded, setLoaded] = useState<{videoId: string; value: VideoWordGlosses} | null>(null);
  const glosses = loaded?.videoId === videoId ? loaded.value : wordGlossesCache.getCached(videoId);

  useEffect(() => {
    if (!enabled || glosses) {
      return;
    }
    let isCancelled = false;
    wordGlossesCache
      .load(videoId)
      .then((loaded) => {
        if (!isCancelled) {
          setLoaded({ videoId, value: loaded });
        }
      })
      .catch(() => {
        // Bkz. yukarıdaki yorum: bilinçli sessiz yutma.
      });
    return () => {
      isCancelled = true;
    };
  }, [videoId, enabled, glosses]);

  return glosses;
}
