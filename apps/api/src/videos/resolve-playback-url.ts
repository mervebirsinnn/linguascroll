/**
 * Şimdilik statik bir eşleme — gerçek Mux entegrasyonu gelene kadar örnek MP4'ler
 * döndürüyor. Saf ve senkron: DI/interface gerekmiyor, testte Jest'in modül
 * mock'lama mekanizması yeterli. Gerçek Mux geldiğinde bu fonksiyon async olacak
 * ve muhtemelen enjekte edilebilir bir provider'a terfi edecek — bugün değil.
 *
 * Chunk 10 (MVP stabilization — gerçek cihaz smoke test'i sırasında bulunan
 * blocker): eski `commondatastorage.googleapis.com/gtv-videos-bucket` bucket'ı
 * artık `403 AccessDenied` dönüyor (Google erişimi kapatmış) — herkes için,
 * telefona/ağa özgü değil. Curl ile TEK TEK doğrulanmış, hâlâ genel kullanıma
 * açık iki kaynağa geçildi: Flutter'ın kendi "assets-for-api-docs" (GitHub Pages)
 * ve MDN'in "interactive-examples" örnek medya deposu — ikisi de geliştiriciler
 * için AÇIKÇA hotlink'lenmek üzere yayınlanmış, GitHub Pages/MDN CDN'i üzerinden
 * sunuluyor. Sadece 3 farklı dosya bulunabildi (5 slot için 2 tanesi tekrar
 * kullanılıyor) — aynı topic'te art arda gelen videoların aynı görsel içeriği
 * gösterebilmesi bilinçli, kabul edilen bir MVP sınırı (gerçek Mux entegrasyonu
 * gelene kadar).
 */
const MOCK_PLAYBACK_URLS: Record<string, string> = {
  "mock-mux-asset-1": "https://flutter.github.io/assets-for-api-docs/assets/videos/bee.mp4",
  "mock-mux-asset-2": "https://flutter.github.io/assets-for-api-docs/assets/videos/butterfly.mp4",
  "mock-mux-asset-3": "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4",
  "mock-mux-asset-4": "https://flutter.github.io/assets-for-api-docs/assets/videos/bee.mp4",
  "mock-mux-asset-5": "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4",
};

/**
 * Bilinmeyen bir muxAssetId sessizce bir fallback URL'e düşürülmüyor — bu, hangi
 * DB satırının gerçekte hangi videoya karşılık geldiğini belirsizleştirirdi (yanlış
 * bir video "çalışıyormuş" gibi görünür, hata gizlenir). Bunun yerine açıkça patlar;
 * Nest'in varsayılan exception filter'ı bunu 500'e çevirir (bkz. error handling
 * kararı) — ayrı bir custom exception hiyerarşisi gerekmiyor.
 */
export function resolvePlaybackUrl(muxAssetId: string): string {
  const playbackUrl = MOCK_PLAYBACK_URLS[muxAssetId];
  if (!playbackUrl) {
    throw new Error(`Bilinmeyen muxAssetId için playback URL üretilemedi: "${muxAssetId}"`);
  }
  return playbackUrl;
}
