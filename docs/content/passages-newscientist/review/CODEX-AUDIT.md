# Claude paketleri — hedefli denetim ve düzeltmeler

19 Kasım 2026. Sekiz paket yerel geliştirme DB'sinde doğrulandı; Neon'a bu çalışma kapsamında yüklenmedi. DB'deki içerik yalnız saklanan hash'e güvenilmeden gerçek paragraf, soru, şık, anlam ve geçiş satırlarından yeniden hesaplanarak güncel paketlerle karşılaştırıldı.

## Düzeltilenler

| Paket | Yanlış anlam / açıklama | Düzeltme |
| --- | --- | --- |
| ns-c1-cop-electrification | since 2000: çünkü | -den/-dan beri |
| ns-c1-cop-electrification | by 2035 ile analysis by aynı anlam | Son tarih anlamı -e/-a kadar olarak ayrı geçişe alındı |
| ns-c1-osteoarthritis | another group: birbirini | başka bir |
| ns-c1-osteoarthritis | knees had ... range: geçmiş zaman yardımcısı | sahipti; vardı |
| ns-c1-pink-noise | authors have commercial links: perfect yardımcısı | sahip olmak; bulunmak |
| ns-c1-noise-habitats | dört türden beşi | beş türden dördü; kelime açıklaması ve soru gerekçesi düzeltildi |
| ns-c2-solar-clock | the most precise: çoğu | en |
| ns-c2-solar-clock | welcomed the work: çalışmak | çalışma |
| ns-c2-technodelics | interest grew out of: yetiştirdi | grew out of tek ifade: -den doğdu; -den kaynaklandı |

Altı etkilenen pakete `-v2` slug'ı verildi. Yerel DB'de eski altı kayıt silinmeden emekliye ayrıldı; güncel altı sürüm aynı sıralarda tek transaction içinde yayımlandı. Önceki kayıtlar ve bunlara bağlı olası cevaplar korunur. İki değişmeyen paket aynı kimliklerle kaldı. Tekrar yayın sekiz pakette de `unchanged` verdi.

`PREVIEW.md` ve anahtarsız `blind-input.json` güncel paketlerden yeniden oluşturuldu. Paket dosya adları korunmuştur; etkilenen dosyaların içindeki slug artık `-v2` ile biter.

## Kontrol kanıtı ve sınırlar

- Resmî yayın doğrulayıcısı: sekiz paket başarılı.
- Bağımsız salt okunur reviewer altı düzeltmeyi kontrol etti: açık bulgu yok; tam kelime kapsamı, bağlam, çakışmazlık, korunmuş paragraf/soru/şıklar doğrulandı.
- Yerel DB'de sekiz aktif NS metni: 32 soru ve 128 şık. Gerçek DB satırları güncel dosyalarla eşleşiyor.
- Kaynak PDF ile yeniden benzerlik/olgu incelemesi ve öğrenci CEFR kalibrasyonu yapılmadı. Bu denetim tüm bağlamsal anlamların kusursuz olduğu güvencesi değildir.
- README'deki eski bağımsız kör çözüm raporu klasörde bulunamadı; burada yeni bir kör çözüm yapıldığı iddia edilmiyor. Mevcut 32 soruda metinden açıkça yanlış anahtar veya ikinci doğru cevap saptanmadı.
- API deploy, mobil build, commit ve push yapılmadı. Neon'da bu sekiz metin henüz yok; production'a yüklenen iki FT metni ayrı iştir.
