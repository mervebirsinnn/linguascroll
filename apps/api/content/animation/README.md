# Looplish · Animasyon

Altı Sintel ve beş Sprite Fright kesiti ayrı `animation` bölümünde yayımlanır. Normal akış `general` olarak kalır; `topic` ve CEFR tercihleri her bölümün içinde sıralama sinyalidir. Mobilde bölüm değiştirmek yeni bir feed oturumu açar. Cursor bölüm bilgisini imzalı olarak taşır.

| Sahne | Seviye | Süre | Orijinal başlangıç |
| --- | --- | --- | --- |
| Birini arıyorum | B1 | 28 sn | 129 sn |
| Az kaldı | A2 | 12 sn | 206.5 sn |
| Sandığından daha yakın | B1 | 22 sn | 443.5 sn |
| Hazırlıksız yolculuk | B1 | 12.2 sn | 117 sn |
| İyi geceler | A1 | 10 sn | 225.5 sn |
| Hadi, yakala! | A1 | 10 sn | 247 sn |

Katalog toplam 11 sahne ve 43 zamanlı altyazı içerir. Her sahnede Türkçe açıklama, küratörlü kelime/ifade ve kaynak segmente bağlı quiz vardır.

## Kaynak ve lisans

Sintel — © copyright Blender Foundation | durian.blender.org. Yönetmen: Colin Levy. [Kaynak/kullanım koşulları](https://durian.blender.org/sharing/), [CC BY 3.0](https://creativecommons.org/licenses/by/3.0/), [resmi indirme ve İngilizce SRT](https://durian.blender.org/download/). Kesme, yeniden kodlama, stereo ses ve Türkçe çeviri/açıklama eklendi. Her videonun attribution alanı API'den mobile taşınır ve kaynak panelinde gösterilir. Tam film yeniden dağıtılacaksa resmi kaynakta istenen tam jenerik de dahil edilmelidir.

Sprite Fright — © Blender Foundation | Blender Studio. [Kaynak ve kullanım koşulları](https://studio.blender.org/projects/sprite-fright/pages/about/), [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). Kesitler 9:16 dikey düzene uyarlandı ve Türkçe açıklamalar eklendi.

Medya git'e eklenmez. `prepare-animation-media.py`, resmi indirme sayfasının bağladığı 1024px kopyayı indirir (veya `--source` ile verilen kopyayı kullanır), SHA-256 ile aynı sürüm olduğunu doğrular ve katalogdaki zamanlardan H.264/AAC MP4 üretir. Altyazılar resmi SRT'den kesit başlangıcına göre yeniden zamanlanmıştır; STT/LLM çalıştırılması gerekmez.

## Yayın sırası

1. Repo kökünde bağımlılıkları kur, shared-types ve API'yi derle:

```sh
pnpm install --frozen-lockfile
pnpm --filter @linguascroll/shared-types build
pnpm --filter @linguascroll/api build
```

2. API ortamındaki mevcut `DATABASE_URL` ile `0009_silly_iron_man.sql` migration'ını uygula; ardından yeni API kodunu dağıt. Katalog henüz yayımlanmamalı: eski API bölüm filtresini bilmiyor.

```sh
cd apps/api
pnpm db:migrate
```

3. Python 3, ffmpeg ve ffprobe ile medyayı hazırla ve kontrol et:

```sh
pnpm animation:prepare
pnpm animation:prepare:sprite-fright
pnpm animation:check --acknowledge-needs-review
```

`Az kaldı`, `İyi geceler` ve `Hadi, yakala!` yalnızca kısa transcript (`thinTranscript`) uyarısı taşır. Bu bilinçli, kısa A1/A2 sahneler için inceleme flag'i gerekir. Katalogdaki kaydedilmiş quality sonucuna güvenilmez: yayın komutu kaliteyi yeniden hesaplar; `reject` override edilemez.

Sadece Sprite Fright paketini kontrol etmek ve yayımlamak için diğer kaynakların yerel medya dosyalarına ihtiyaç yoktur:

```sh
pnpm animation:check --catalog sprite-fright
pnpm animation:publish --catalog sprite-fright
```

4. API'nin mevcut R2 ortamını kullanarak yayımla. `DATABASE_URL`, `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`, `R2_PUBLIC_BASE_URL` mevcut API `.env`/ortamında tanımlı olmalı. Değerleri repo'ya veya komut satırına yazma.

```sh
pnpm animation:publish --acknowledge-needs-review
```

Komut mevcut `R2StorageService` ile `originals/<contentId>/<uuid>.mp4` anahtarına yükler ve mevcut `publishContent` transaction'ıyla video/altyazı/kelime/quiz kayıtlarını birlikte yazar. Var olan içerik kimliği atlanır; tekrar çalıştırmak aynı videoyu yeniden oluşturmaz. Kısmi bir toplu başarısızlıkta başarılı sahneler korunur ve yeniden çalıştırma kalan sahnelerden devam eder. Tamamlanmamış DB yazısından sonra yüklenen R2 nesnesi yetim kalabilir; mevcut upload→publish pipeline'ındaki gibi medya ve DB arasında dağıtık transaction yoktur.

Yerel cihaz geliştirmesinde `--local` kullanılabilir; bu mod R2'ye yüklemez ve API'nin `/media/sintel-*.mp4` statik yolunu kullanır. Üretimde varsayılan R2 modunu kullan.

5. API'de `GET /feed?userId=<id>&category=animation` yayımlanmış animasyon sahnelerini getirir; kategori belirtilmeyen istek bunları getirmez. Mobile'ın mevcut API adresini kullanarak uygulamayı yeniden build edip cihazda test et. Uygulama adı `Looplish`; bölüm adı `Animasyon`.

## Doğrulama

Shared-types/API/mobile TypeScript kontrolleri, API build, 301 API birim testi ve 90 mobil test geçti. Android ve iOS Expo export başarılı; bunlar EAS binary build veya cihaz testi değildir. Altı gerçek MP4'ün codec/süre ve altyazı kontrolleri geçti. İzole PostgreSQL/PGlite testinde bütün migration'lar, altı içerik yayını, kaynak zorunluluğu, eski videonun general varsayılanı ve transaction rollback doğrulandı.

Canlı veritabanı/R2 yayını ve mağaza/TestFlight dağıtımı bu değişikliğin geliştirme ortamında yapılmadı.
