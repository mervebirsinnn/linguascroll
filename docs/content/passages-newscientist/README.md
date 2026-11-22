# New Scientist (21 Kasım 2026) kaynaklı C1/C2 paketleri

Bu klasör, kullanıcının sağladığı New Scientist sayısındaki 8 makaleden üretilen, uygulamadaki C1 ve C2 sekmeleri için hazırlanmış içerik paketlerini içerir. **Yerel geliştirme DB’sinde yüklü. Neon production’a yüklenmedi.** Altı paketin anlam düzeltmeleri `-v2` slug’larıyla yerelde yayımlandı; eski altı kayıt silinmeden emekliye ayrıldı.

| Seviye | Metin | Slug | Sözcük | Anlam girdisi | Aralık | Kaynak |
| --- | --- | --- | ---: | ---: | ---: | --- |
| C1 | A Soundscape Under Strain | `ns-c1-noise-habitats-v2` | 275 | 201 | 267 | 21 Kasım 2026, s.9 (Madeleine Cuff |
| C1 | One Gene, Many Questions | `ns-c1-zfx-autism` | 310 | 183 | 306 | 21 Kasım 2026, s.4 (Michael Marshall |
| C1 | A Hiss to Help the Sleeping Brain | `ns-c1-pink-noise-v2` | 246 | 156 | 238 | 21 Kasım 2026, s.5 (Sascha Brodsky |
| C1 | The Electrification Target | `ns-c1-cop-electrification-v2` | 262 | 157 | 251 | 21 Kasım 2026, s.6 (Shosha Adie |
| C1 | A Blood Thinner for Painful Knees | `ns-c1-osteoarthritis-v2` | 294 | 188 | 279 | 21 Kasım 2026, s.11 (Carissa Wong |
| C2 | Opening the Door Without the Key | `ns-c2-technodelics-v2` | 384 | 252 | 376 | 21 Kasım 2026, s.38-39 (Caroline Williams |
| C2 | A Clock Timed by the Sun | `ns-c2-solar-clock-v2` | 340 | 203 | 332 | 21 Kasım 2026, s.5 (Karmela Padavic-Callaghan |
| C2 | Economics, Not Summits | `ns-c2-climate-economics` | 368 | 232 | 361 | 21 Kasım 2026, s.7 (Alec Luhn |

Toplam: 8 metin, 32 soru, 2479 sözcük geçişi, 1572 anlam girdisi, 2410 dokunma aralığı.

## Telif ve özgünlük (önemli)

- Metinler dergi makalelerinden **birebir kopyalanmadı ve küçük değişikliklerle de taşınmadı**: makalelerdeki olgular korunarak kendi cümle yapımla, kendi sıramla yazıldı. Olgular telif konusu değildir; ifade ve cümle yapısı konusudur.
- Yayın paketi şeması `editorial.original: true` ister. Bu beyan burada "ifade bana ait" anlamındadır; içerik **kaynağa dayalı özet/yeniden yazımdır**. Kaynaklar `editorial.sources` içinde kayıtlıdır. Herkese açık yayından önce bu beyanın uygunluğuna ve (gerekirse) derginin iznine sen karar vermelisin.
- Olgular derginin anlatımıdır (sayı tarihi 21 Kasım 2026); dış kaynaktan ayrıca doğrulanmadı.

## Doğrulama

- Yayın CLI'ı yalnız doğrulama modunda: `node apps/api/dist/passages/publish-passages.js --dir docs/content/passages-newscientist/packs` → 8 paket geçti (şema, aralıklar, tüm sözcüklerin kapsamı, şık uzunluk oranı, konum dağılımı).
- Şık uzunluğu ve ipuçları yazar olarak ölçüldü; ayrıca anahtarsız bağımsız bir yapay zekâ reviewer'ı soruları çözdü (önceki sonuç raporu bu klasörde yok; güncel hedefli denetim için review/CODEX-AUDIT.md dosyasına bak).
- Seviye etiketleri editoryal önerdir; öğrenci denemesi/CEFR ölçümü yok. Metinler (ortalama cümle ~32–38 sözcük) pilot C1/C2'den daha yoğun olabilir.
- Başlık, soru ve şıklar dokunulabilir kelime kapsamı dışındadır.

## Yerel yayın durumu

Aşağıdaki komut artık güncel sekiz pakette `unchanged` döndürmelidir. Migration 0019–0022 yerelde uygulanmış durumda:

```powershell
node apps/api/dist/passages/publish-passages.js --dir docs/content/passages-newscientist/packs --apply
```

`isFreeSample` hepsinde false: gate açıkken misafir kullanıcıya KİLİTLİ görünür; denemek için yerel `SUBSCRIPTION_GATE_ENABLED=false` gerekir (ya da abonelikli kullanıcı).

## 19 Kasım 2026 düzeltme kontrolü

Güncel sürümler ve bulunan anlam hataları [CODEX-AUDIT.md](review/CODEX-AUDIT.md) içinde kayıtlıdır. Önceki tablodaki sayımlar düzeltme öncesi üretim sayılarıdır; güncel sayımlar aşağıdadır.

| Slug | Anlam girdisi | Geçiş aralığı |
| --- | ---: | ---: |
| ns-c1-cop-electrification-v2 | 158 | 251 |
| ns-c1-noise-habitats-v2 | 201 | 267 |
| ns-c1-osteoarthritis-v2 | 188 | 279 |
| ns-c1-pink-noise-v2 | 156 | 238 |
| ns-c1-zfx-autism | 183 | 306 |
| ns-c2-climate-economics | 232 | 361 |
| ns-c2-solar-clock-v2 | 203 | 332 |
| ns-c2-technodelics-v2 | 251 | 375 |

## 2. tur reviewer düzeltmeleri (19 Kasım 2026)

Güncel `-v2` dosyaları korunarak doğrudan JSON'da düzeltildi: 8 ana fikir sorusunun çeldiricileri aynı tonda/uzunlukta yeniden yazıldı; 5 doğru şık daha az metin kopyası olacak biçimde yeniden ifade edildi; 5 kolay kelime sorusu (acknowledged, caps, dampening, equate to, convene) yerine endorsements, pooled, wear and tear, reasoned, contends konuldu; COP ana fikir şıkkı Hecke'nin görüşüne uyduruldu; solar/lab-vs-stars ve ZFX şıkları düzeltildi. Slug, paragraf, anlam girdileri ve doğru şık konumları değişmedi. Neon'a yüklenmedi; yerel dev DB'deki kayıtlar bu düzeltmeleri henüz içermiyor.

## 3. tur: yeni sürüm slug'ları ve soru yenileme (19 Kasım 2026)

Yerel DB'de yayımlanmış slug'ların içeriği değiştirilmedi; değişen her paket yeni sürüm slug'ı aldı: `ns-c1-cop-electrification-v3`, `ns-c1-noise-habitats-v3`, `ns-c1-osteoarthritis-v3`, `ns-c1-pink-noise-v3`, `ns-c1-zfx-autism-v2`, `ns-c2-climate-economics-v2`, `ns-c2-solar-clock-v3`, `ns-c2-technodelics-v3`. (Yerel DB'de eski sürümler duruyor; aynı (seviye, sortOrder) çiftleri için eski kayıtların emekliye ayrılması gerekir. Bu işlem yapılmadı.) Metinler, anlam girdileri ve geçiş aralıkları değişmedi. C2 soruları örtük tutum, görüşler arası ilişki, çıkarım, "desteklenmeyen sonuç" ve yakın anlamlı cümle sorularına çevrildi; C1 ana fikir soruları ortak giriş + metinle elenebilir çeldirici yapısına çevrildi; osteoarthritis/main-idea ve bond-proposal'daki ikinci savunulabilir cevap ihtimali giderildi. Neon'a ve yerel DB'ye yazılmadı.

### 4. tur (kalite ipuçları)

pink-noise/caution doğru şıkkı diğerleriyle aynı yapıda ifade cümlesi yapıldı; climate/emissions-drop'taki ikinci savunulabilir şık değiştirildi; solar/schmidt-view artık onayın kapsamını yorumlatıyor; 8 ana fikir sorusunda çeldiriciler yalnız mutlak sözcüklere değil, metindeki belirli bir ilişkiyi (neden-sonuç, kapsam, karşılaştırma) yanlış yorumlamaya dayanıyor; technodelics'teki ortak giriş kaldırıldı. Slug, metin, anlam girdileri ve aralıklar değişmedi. Yerel/Neon DB'ye yazılmadı.

### 5. tur: cümle çevirisi (güncel durum, 20 Kasım 2026)

Yukarıdaki tablolardaki slug'lar tarihçedir. Güncel (yerel dev DB'de aktif) sürümler: `ns-c1-cop-electrification-v4`, `ns-c1-noise-habitats-v4`, `ns-c1-osteoarthritis-v4`, `ns-c1-pink-noise-v4`, `ns-c1-zfx-autism-v3`, `ns-c2-climate-economics-v3`, `ns-c2-solar-clock-v4`, `ns-c2-technodelics-v4`.

Her geçişe İngilizce cümlenin Türkçe anlamı (`contextSentenceTr`) eklendi: 8 pakette 71 cümle, hepsi bir arada ya da hiç (yarım çeviri doğrulayıcıda reddedilir). Kelime penceresi Türkçe cümleyi gösterir, İngilizcesi "İngilizce cümleyi göster" ile açılır. Çevirisi olmayan metinler (pilot, FT) İngilizce cümleyi göstermeye devam eder; kaydedilen kelimelerde kaynak cümle İngilizce kalır. Anlam bağımsız bir çevirmen/denetçi tarafından 71 çiftte kontrol edildi (5 kusur düzeltildi); düzeltmeler ayrıca yeniden denetlenmedi. Migration `0023_loving_micromacro.sql` (eklemeli, nullable sütun) yerel dev ve TEST DB'ye uygulandı; Neon'a UYGULANMADI.
