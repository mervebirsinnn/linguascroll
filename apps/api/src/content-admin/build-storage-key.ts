/**
 * Chunk 17 — R2 upload path'in storage key üretimi. `resolve-playback-url.ts`'teki
 * "pure/senkron/test edilebilir fonksiyon" desenini takip ediyor: process.env/DB
 * okumuyor, sadece verilen girdilerden deterministik bir key üretiyor.
 *
 * Kullanıcı kararı: raw dosya adı (`originalFilename`) hiçbir zaman storage key'in
 * bir parçası DEĞİL — kullanıcı girdisi path traversal/tuhaf karakter riski taşır,
 * ayrıca aynı içerik farklı dosya adlarıyla yüklenirse idempotency'i bozar. Tekil
 * kimlik `contentId` (çağıran tarafın doğruladığı, kebab-case bir slug) + rastgele
 * bir `uuid` (çağıranın node:crypto randomUUID() ile ürettiği, burada sadece
 * enjekte edilen) — bu ayrım fonksiyonu saf tutuyor ve testte uuid sabitlenebiliyor.
 */
const CONTENT_ID_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export function isValidContentId(contentId: string): boolean {
  return CONTENT_ID_PATTERN.test(contentId);
}

export function buildOriginalVideoStorageKey(contentId: string, uuid: string): string {
  return `originals/${contentId}/${uuid}.mp4`;
}

/**
 * Chunk 17B — kullanıcı kararı: process-stt endpoint'i storageKey'i client'tan
 * (upload response'unun kendisinden) açıkça alıyor (ListObjectsV2+LastModified
 * "en yenisi doğrudur" varsayımı BİLİNÇLİ OLARAK reddedildi — bkz. Chunk 17B
 * teknik inceleme). Bu fonksiyon, kabul edilen storageKey'in gerçekten BU
 * contentId için `buildOriginalVideoStorageKey` ile üretilmiş OLABİLECEK bir
 * şekle sahip olduğunu doğruluyor — yani sadece prefix eşleşmesi değil, suffix'in
 * de `<uuid>.mp4` şeklinde (başka hiçbir `/` veya beklenmedik karakter içermeden)
 * olduğunu zorunlu kılıyor. Bu, client'ın contentId'siyle eşleşmeyen ya da
 * bucket içindeki keyfi bir path'e işaret eden bir storageKey'i kabul etmesini
 * engelliyor (ör. `../other-content/x.mp4` gibi bir suffix, prefix testini
 * geçse bile burada reddedilir).
 */
const ORIGINAL_VIDEO_KEY_SUFFIX_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.mp4$/;

export function isOwnedOriginalVideoStorageKey(contentId: string, storageKey: string): boolean {
  const prefix = `originals/${contentId}/`;
  if (!storageKey.startsWith(prefix)) {
    return false;
  }
  const suffix = storageKey.slice(prefix.length);
  return ORIGINAL_VIDEO_KEY_SUFFIX_PATTERN.test(suffix);
}
