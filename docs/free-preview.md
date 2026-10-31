# Ücretsiz seçki ve kelime kartları

Her hesapta, her FeedScope (`all`, `animation`, `ielts`) için ayrı en fazla 10 video ücretsizdir.
İlk erişimde kategoriye ait adaylardan seçki oluşturulur ve `free_preview_videos` tablosunda
saklanır. Kullanıcı satırı kilidi iki cihazın farklı seçkiler oluşturmasını önler. Aynı video
tekrar izlenebilir. Shuffle, izlenme kaydı, uygulamayı yeniden açma veya eski ücretsiz hak
sayacı seçkiyi azaltmaz. Katalogda 10'dan az video varsa mevcut içerikler sunulur ve yeni
videolar geldikçe yalnızca boş yerler tamamlanır. Sekmeler arasında video örtüşebilir.

Feed planı yalnızca o sekmenin seçkisinden oluşturulur. Quiz'ler 10 video sayısına dahil
değildir. Seçkinin sonunda Premium kartı gelir; yenileme aynı videoları yeniden sunar.
Playback endpoint'i scope ve gerçek video kategorisini kontrol eder. Abone olanlara tüm
katalog açılır; abonelik bitince aynı ücretsiz seçki korunur.

## Kurulum

API ve mobil birlikte güncellenmelidir. `apps/api` altında `pnpm run db:migrate` ile
0018 migration'ını uygula; önce yedek al ve DATABASE_URL hedefini doğrula. Bu PR production
veritabanına uygulanmadı. Eski `free_video_grants` tablosu tarihçe olarak tutulur; yeni
seçkiyi sınırlandırmaz. Hesap silmede yeni seçki FK cascade ile silinir.

## Kelime anlamları

Mevcut altyazı vocabulary kartları ve hazırlanmış segment anlamları ücretsiz videolarda da
çalışır. Dokununca video durur, anlam kartı açılır; Kaydet kullanıcı kelimelerine ekler.
Genel kelime kartında kaynak cümle de gösterilir. Kelime dokunuşu dış cümle kartını açmaz.
Video değişince önceki videonun anlamları kullanılmaz.

`GET /words/glosses` yalnızca hazırlanmış veriyi okur; dokunuş başına AI üretimi yoktur.
Henüz anlamı hazırlanmamış kelimeler için çeviri uydurulmaz. Yayından önce mevcut offline
`words:generate-glosses` içerik işini çalıştırıp seçkideki içeriklerin kapsamını kontrol et.
Bu değişiklik içerik üretimi için ücretli API çağrısı yapmaz. Genel gloss sözleşmesi Türkçe
anlam taşır; İngilizce açıklama yalnızca kürate vocabulary verisinde varsa gösterilir.

## Satın alma yapılandırması

Mobildeki `goog_` SDK anahtarı sunucu anahtarı yerine geçmez. API kendi ortamında gerçek
`REVENUECAT_SECRET_API_KEY` (REST V1) gerektirir. SDK/Play başarılı dedi diye backend
`active:true` doğrulaması atlanmaz. Mevcut abonelik ve already-owned toparlama düzeltmeleri
de bu PR'dadır. Production kilidi cihaz testleri tamamlanmadan açılmamalıdır.
