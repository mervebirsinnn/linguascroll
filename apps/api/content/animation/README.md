# Looplish · Animasyon

Altı Sintel kesiti ayrı `animation` bölümünde yayımlanır. Normal akış `general` olarak kalır; `topic` ve CEFR tercihleri her bölümün içinde sıralama sinyalidir. Mobilde bölüm değiştirmek yeni bir feed oturumu açar. Cursor bölüm bilgisini imzalı olarak taşır.

| Sahne | Seviye | Süre | Orijinal başlangıç |
| --- | --- | --- | --- |
| Birini arıyorum | B1 | 28 sn | 129 sn |
| Az kaldı | A2 | 12 sn | 206.5 sn |
| Sandığından daha yakın | B1 | 22 sn | 443.5 sn |
| Hazırlıksız yolculuk | B1 | 12.2 sn | 117 sn |
| İyi geceler | A1 | 10 sn | 225.5 sn |
| Hadi, yakala! | A1 | 10 sn | 247 sn |

18 zamanlı altyazı, Türkçe çeviri/açıklama ve 18 küratörlü kelime/ifade vardır. Quiz verisi mevcut yayınlama pipeline'ının contract'ını kullanır; yeni bir quiz davranışı eklenmez. Kelime kaydı gerçek kaynak segmentine bağlanır.

## Kaynak ve lisans

Sintel — © copyright Blender Foundation | durian.blender.org. Yönetmen: Colin Levy. [Kaynak/kullanım koşulları](https://durian.blender.org/sharing/), [CC BY 3.0](https://creativecommons.org/licenses/by/3.0/), [resmi indirme ve İngilizce SRT](https://durian.blender.org/download/). Kesme, yeniden kodlama, stereo ses ve Türkçe çeviri/açıklama eklendi. Her videonun attribution alanı API'den mobile taşınır ve kaynak panelinde gösterilir. Tam film yeniden dağıtılacaksa resmi kaynakta istenen tam jenerik de dahil edilmelidir.

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
pnpm animation:check --acknowledge-needs-review
```

`Az kaldı`, `İyi geceler` ve `Hadi, yakala!` yalnızca kısa transcript (`thinTranscript`) uyarısı taşır. Bu bilinçli, kısa A1/A2 sahneler için inceleme flag'i gerekir. Katalogdaki kaydedilmiş quality sonucuna güvenilmez: yayın komutu kaliteyi yeniden hesaplar; `reject` override edilemez.

4. API'nin mevcut R2 ortamını kullanarak yayımla. `DATABASE_URL`, `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`, `R2_PUBLIC_BASE_URL` mevcut API `.env`/ortamında tanımlı olmalı. Değerleri repo'ya veya komut satırına yazma.

```sh
pnpm animation:publish --acknowledge-needs-review
```

Komut mevcut `R2StorageService` ile `originals/<contentId>/<uuid>.mp4` anahtarına yükler ve mevcut `publishContent` transaction'ıyla video/altyazı/kelime/quiz kayıtlarını birlikte yazar. Var olan içerik kimliği atlanır; tekrar çalıştırmak aynı videoyu yeniden oluşturmaz. Kısmi bir toplu başarısızlıkta başarılı sahneler korunur ve yeniden çalıştırma kalan sahnelerden devam eder. Tamamlanmamış DB yazısından sonra yüklenen R2 nesnesi yetim kalabilir; mevcut upload→publish pipeline'ındaki gibi medya ve DB arasında dağıtık transaction yoktur.

Yerel cihaz geliştirmesinde `--local` kullanılabilir; bu mod R2'ye yüklemez ve API'nin `/media/sintel-*.mp4` statik yolunu kullanır. Üretimde varsayılan R2 modunu kullan.

5. API'de `GET /feed?userId=<id>&category=animation` altı sahneyi getirir; kategori belirtilmeyen istek bunları getirmez. Mobile'ın mevcut API adresini kullanarak uygulamayı yeniden build edip cihazda test et. Uygulama adı `Looplish`; bölüm adı `Animasyon`.

## Doğrulama

Shared-types/API/mobile TypeScript kontrolleri, API build, 301 API birim testi ve 90 mobil test geçti. Android ve iOS Expo export başarılı; bunlar EAS binary build veya cihaz testi değildir. Altı gerçek MP4'ün codec/süre ve altyazı kontrolleri geçti. İzole PostgreSQL/PGlite testinde bütün migration'lar, altı içerik yayını, kaynak zorunluluğu, eski videonun general varsayılanı ve transaction rollback doğrulandı.

Canlı veritabanı/R2 yayını ve mağaza/TestFlight dağıtımı bu değişikliğin geliştirme ortamında yapılmadı.

## Cosmos Laundromat: First Cycle (2026-09-30 — 3/5 hazır, yayın bekliyor)

Sintel'den farklı bir pipeline kullanıyor: kaynak kesitlerde diyalog zaten gömülü (ek seslendirme
gerekmez), bu yüzden `prepare-animation-media.py` YERİNE genel STT + Gemini enrichment pipeline'ı
(`apps/api/scripts/stt` → `content-enrichment/enrich-transcript.ts`) kullanıldı — tıpkı diğer orijinal
içerik partileri (`a1-*`, `grammar-*`, `idiom-*` vb.) gibi. Fark: `category`/`attribution` alanları
enrichment çıktısında hiç yok (o pipeline hiç lisanslı içerik üretmiyordu) — bu yüzden `enriched.json`
elle bu iki alanla yamandı, sonra Sintel'inkiyle AYNI şekilde (`{sourceStartMs, title, draft}` dizisi)
`content/animation/cosmos-laundromat.json`'a toplandı. `animation-catalog.ts`'in `loadAnimationCatalog`'u
artık TEK bir sabit dosya değil, bir dosya listesi okuyor (`SINTEL_CATALOG_PATH` +
`COSMOS_LAUNDROMAT_CATALOG_PATH`) — ikisi aynı `animation:publish`/`animation:check` komutuyla,
aynı invariant'larla (benzersiz muxAssetId, zorunlu attribution, segment/süre tutarlılığı) yayınlanıyor.

Ham 5 MP4 ve kullanıcının kendi lisans notu (`kaynak-lisans.json`, `OKU.txt`)
`apps/api/scripts/stt/input/`'ta durur — bu klasör bilerek `.gitignore`'da (telif taşıyan video
dosyaları hiç commit edilmez), bu yüzden lisans/atıf bilgisinin kalıcı, izlenen kopyası burada,
`cosmos-laundromat-attribution.json`'da (şablon) ve artık gerçek `cosmos-laundromat.json`'da
(uygulanmış hali) tutuluyor.

**Kaynak ve lisans**: Cosmos Laundromat: First Cycle — Blender Foundation / Blender Institute.
Yönetmen: Mathieu Auvray. [Wikimedia Commons kaynağı](https://commons.wikimedia.org/wiki/File:Cosmos_Laundromat_-_First_Cycle_-_Official_Blender_Foundation_release.webm),
[CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0/). Resmi proje sayfası
([gooseberry.blender.org/license](https://gooseberry.blender.org/license/)) CC BY 3.0 belirtiyor;
indirilen Wikimedia dosyası CC BY-SA 3.0 belirtiyor — daha sıkı (ShareAlike) şart takip edildi.
Kesme, boyutlandırma (1280px, orijinal kadraj) ve H.264/AAC kodlama dışında değişiklik yok; orijinal
İngilizce diyalog/müzik/efekt korunuyor. Mobilde atıf, her videonun sol üstündeki "{title} · {license}"
rozetine dokununca açılan `VideoAttributionSheet`'te gösteriliyor — bu mekanizma `video.attribution`
alanına göre JENERİK çalışıyor, Sintel'e özel değil, bu yüzden Cosmos Laundromat için ekstra UI kodu
gerekmedi.

**İçerik notu**: Film 13+ izleyici için tasarlanmıştır. Seçilen 5 kesit açılıştaki intihar girişimini
ve küfürlü repliği içermez; bir klipte karakterin boynunda ip görülebilir (bkz. `OKU.txt`) — yayın
öncesi bu kareyi gözden geçir.

**ShareAlike (CC BY-SA) notu**: bu kesitlerin uyarlamalarını aynı veya uyumlu lisans altında
paylaşmak, lisans ve atıf bağlantılarını içerik yanında göstermek (`VideoAttributionSheet` zaten
bunu yapıyor), ve lisansın verdiği yeniden kullanım haklarını DRM veya ek kısıtlamayla
engellememek gerekiyor. Uygulamanın geri kalan kaynak kodunun aynı lisansla açılması GEREKMİYOR —
ShareAlike sadece bu türev videoların kendisini kapsıyor.

### Durum

- ✅ `cosmos-tanisma`, `cosmos-yalniz-kurt`, `cosmos-bir-dakika` — STT + Gemini enrichment tamam,
  `category`/`attribution` yamalı, `content/animation/cosmos-laundromat.json`'a eklendi,
  `public/media/cosmos-*.mp4`'e kopyalandı, `pnpm animation:check --acknowledge-needs-review` ile
  doğrulandı (9/9 sahne — Sintel'in 6'sı + bu 3'ü — quality/kaynak/altyazı/medya kontrollerini geçti).
- ⏳ `cosmos-urun-tanitimi`, `cosmos-nasil-calisir` — STT tamam (`scripts/stt/output/`'ta draft.json
  hazır), Gemini enrichment'ı **günlük ücretsiz kota** (20 istek/gün) doldurduğu için bekliyor. Kota
  yenilenince: `node dist/content-enrichment/enrich-transcript.js --content-id <id>`, sonra aynı elle
  yama (category/attribution, bkz. `cosmos-laundromat-attribution.json`) ve `cosmos-laundromat.json`'a
  ekleme adımları tekrarlanmalı.
- Ayrıca `enrich-transcript.ts`'te gerçek bir bug bulunup düzeltildi: script `.env`'i hiç yüklemiyordu
  (`publish-content.ts`'in aksine) — `import "dotenv/config"` eklendi.

### Yeni: letterbox arka plan rengi (2026-09-30)

"Animasyon" içeriği `contain` ile (kırpmadan) gösterildiği için geniş ekran kaynak dikey telefon
ekranında üstte/altta boşluk bırakıyordu (sabit siyah). Her sahnenin `draft.backgroundColor`'ı
(`#rrggbb`) artık ffmpeg ile kare ortalaması alınarak TEK SEFERLİK hesaplanıp katalog JSON'una
yazılıyor; mobile bunu letterbox alanının arka planı olarak kullanıyor (bkz.
`VideoFeedItem.tsx`, ikinci bir video/görsel katmanı YOK — sadece container rengi). Bu, yeni bir
DB kolonu gerektirdi: `videos.background_color` (`drizzle/0010_strange_blockbuster.sql`, nullable,
additive — veri kaybı riski yok).

### Yayınlama (3 hazır Cosmos Laundromat klibi + Sintel'e renk backfill'i — production DB/R2, bunu SEN çalıştır)

Bu repo'daki `.env` production'a değil yerel dev Postgres'e işaret ediyor — gerçek yayın için
Render panelinden `DATABASE_URL`/`R2_*` değerlerini kendi terminaline geçirip aşağıdakini çalıştır
(Sintel'de yaptığın gibi):

```sh
cd apps/api
pnpm run build
pnpm run db:migrate                                          # background_color kolonunu ekler
node dist/animation/publish-animation.js --acknowledge-needs-review   # yeni: 3 Cosmos Laundromat klibi
pnpm run animation:backfill-colors                            # zaten yayınlanmış Sintel satırlarına rengi yazar
```

Üçü de idempotent: migration zaten uygulanmışsa, `muxAssetId` zaten yayınlanmışsa veya
`background_color` zaten doluysa ilgili adım/satır sessizce atlanır — bu üç komutu güvenle tekrar
çalıştırabilirsin. Kalan 2 klip (Gemini kotası açılınca) hazırlanıp `cosmos-laundromat.json`'a
eklendiğinde, sadece `animation:publish` adımı tekrar çalıştırılması yeterli.
