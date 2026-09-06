/**
 * Kullanıcı kararı: Chunk 7-10'daki TÜM placeholder/örnek video kataloğu
 * (stok "mock-mux-asset-*" harici CDN görüntüleri + Chunk 10'un TTS+waveform
 * curated videoları) KALDIRILDI — artık hiçbir seed satırı bu muxAssetId'leri
 * KULLANMIYOR (bkz. seed-videos.ts). Bu yüzden o eski mapping'ler de (ölü kod
 * olurlardı) kaldırıldı.
 *
 * Geriye kalan TEK "sağlayıcı": bu API'nin kendi statik dosya sunumu (bkz.
 * main.ts, `useStaticAssets`) — Chunk 11'in gerçek, kullanıcının kendi
 * sağladığı videoları için. Path'leri host'tan bağımsız kalsın diye
 * `mediaBaseUrl` ile birleştiriliyor (gerçek Mux entegrasyonu gelene kadar).
 */
const CURATED_MEDIA_FILENAMES: Record<string, string> = {
  "local-working-out-again": "working-out-again.mp4",
  "local-common-mistakes": "common-mistakes.mp4",
  "local-introduce-yourself": "introduce-yourself.mp4",
  "local-ordering-food": "ordering-food.mp4",
};

/**
 * Bilinmeyen bir muxAssetId sessizce bir fallback URL'e düşürülmüyor — bu, hangi
 * DB satırının gerçekte hangi videoya karşılık geldiğini belirsizleştirirdi (yanlış
 * bir video "çalışıyormuş" gibi görünür, hata gizlenir). Bunun yerine açıkça patlar;
 * Nest'in varsayılan exception filter'ı bunu 500'e çevirir (bkz. error handling
 * kararı) — ayrı bir custom exception hiyerarşisi gerekmiyor.
 *
 * `mediaBaseUrl` parametre olarak geliyor (process.env'i burada OKUMUYORUZ) —
 * fonksiyon saf/senkron/test edilebilir kalıyor, config-okuma sorumluluğu
 * çağıran tarafta (VideosService, ConfigService enjekte ediyor).
 */
export function resolvePlaybackUrl(muxAssetId: string, mediaBaseUrl: string): string {
  const curatedFilename = CURATED_MEDIA_FILENAMES[muxAssetId];
  if (!curatedFilename) {
    throw new Error(`Bilinmeyen muxAssetId için playback URL üretilemedi: "${muxAssetId}"`);
  }
  return new URL(`/media/${curatedFilename}`, mediaBaseUrl).toString();
}
