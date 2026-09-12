/**
 * Kullanıcı kararı: Chunk 7-10'daki TÜM placeholder/örnek video kataloğu
 * (stok "mock-mux-asset-*" harici CDN görüntüleri + Chunk 10'un TTS+waveform
 * curated videoları) KALDIRILDI — artık hiçbir seed satırı bu muxAssetId'leri
 * KULLANMIYOR (bkz. seed-videos.ts).
 *
 * Geriye kalan TEK "sağlayıcı": bu API'nin kendi statik dosya sunumu (bkz.
 * main.ts, `useStaticAssets`) — gerçek, kullanıcının kendi sağladığı videoları
 * için. Path'leri host'tan bağımsız kalsın diye `mediaBaseUrl` ile
 * birleştiriliyor (gerçek Mux entegrasyonu gelene kadar).
 *
 * Chunk 12: elle tutulan `CURATED_MEDIA_FILENAMES` lookup tablosu KALDIRILDI.
 * Chunk 11'in 15 satırlık kataloğunun TAMAMI istisnasız `local-<slug>` →
 * `<slug>.mp4` deseniydi — bu artık gerçek bir esneklik değil, sadece
 * gereksiz bir manuel eşleme adımıydı. content-enrichment publish pipeline'ı
 * (bkz. publish-content.ts) her yeni video için deterministik bir slug
 * üretip aynı `<slug>.mp4` adıyla `public/media/`'ya kopyaladığı için, bu
 * dosyaya elle bir satır eklemek zorunda kalmadan yeni video eklenebiliyor —
 * chunk'ın "yeni video geldiğinde elle iş kalmasın" hedefiyle doğrudan
 * ilişkili bir sadeleştirme.
 */
/** `publish-content.ts` de bu prefix'i (hedef dosya adını türetmek için) reuse ediyor — aynı build ağacında oldukları için (apps/api/src) export edilip import edilmesi güvenli, ikinci bir kopya değil. */
export const LOCAL_MEDIA_PREFIX = "local-";
/** `publish-content.ts`'in ürettiği slug'larla AYNI şekil kısıtı (kebab-case, a-z0-9-). */
const LOCAL_MEDIA_ID_PATTERN = /^local-[a-z0-9]+(-[a-z0-9]+)*$/;

/**
 * Bilinmeyen/desene uymayan bir muxAssetId sessizce bir fallback URL'e
 * düşürülmüyor — bu, hangi DB satırının gerçekte hangi videoya karşılık
 * geldiğini belirsizleştirirdi (yanlış bir video "çalışıyormuş" gibi
 * görünür, hata gizlenir). Bunun yerine açıkça patlar; Nest'in varsayılan
 * exception filter'ı bunu 500'e çevirir (bkz. error handling kararı) — ayrı
 * bir custom exception hiyerarşisi gerekmiyor.
 *
 * `mediaBaseUrl` parametre olarak geliyor (process.env'i burada OKUMUYORUZ) —
 * fonksiyon saf/senkron/test edilebilir kalıyor, config-okuma sorumluluğu
 * çağıran tarafta (VideosService, ConfigService enjekte ediyor).
 */
export function resolvePlaybackUrl(muxAssetId: string, mediaBaseUrl: string): string {
  if (!LOCAL_MEDIA_ID_PATTERN.test(muxAssetId)) {
    throw new Error(`Bilinmeyen/geçersiz muxAssetId için playback URL üretilemedi: "${muxAssetId}"`);
  }
  const filename = `${muxAssetId.slice(LOCAL_MEDIA_PREFIX.length)}.mp4`;
  return new URL(`/media/${filename}`, mediaBaseUrl).toString();
}
