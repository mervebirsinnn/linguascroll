import type { VideoWordGlosses } from "@linguascroll/shared-types";

/**
 * React/RN'den BAĞIMSIZ (mobile jest "logic" projesi expo/react-native import'u
 * olan dosyaları transform etmiyor) oturum-içi önbellek: bir video için anlamlar
 * bir kez istenir, sonraki her tıklama/yeniden mount bellekten döner. Eşzamanlı
 * iki istek (FlatList'te aynı item'ın tekrar mount olması) tek ağ çağrısına iner.
 * Başarısız istek cache'lenmez — sonraki mount yeniden dener.
 */
export function createWordGlossesCache(fetcher: (videoId: string) => Promise<VideoWordGlosses>) {
  const resolved = new Map<string, VideoWordGlosses>();
  const inFlight = new Map<string, Promise<VideoWordGlosses>>();

  return {
    getCached(videoId: string): VideoWordGlosses | undefined {
      return resolved.get(videoId);
    },
    load(videoId: string): Promise<VideoWordGlosses> {
      const cached = resolved.get(videoId);
      if (cached) {
        return Promise.resolve(cached);
      }
      const pending = inFlight.get(videoId);
      if (pending) {
        return pending;
      }
      const request = fetcher(videoId)
        .then((glosses) => {
          // Boş sonuç (anlamlar henüz üretilmemiş video) cache'lenmez: üretim sonrası görünsün.
          if (Object.keys(glosses).length > 0) {
            resolved.set(videoId, glosses);
          }
          return glosses;
        })
        .finally(() => {
          inFlight.delete(videoId);
        });
      inFlight.set(videoId, request);
      return request;
    },
  };
}
