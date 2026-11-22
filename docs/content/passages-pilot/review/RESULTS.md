# Pilot inceleme sonucu — revizyon 2

Tarih: 2026-11-19. Durum: yerel editoryal taslak, yayınlanmadı. Bu rapor ilk sürümün RESULTS kaydının yerini alır.

## Bağımsız kör çözüm

Üretimde yer almayan reviewer, yalnız güncel review/blind-input.json dosyasını okudu. Anahtar, açıklamalar, editoryal notlar ve kelime anlamları gösterilmedi. Seçimleri son JSON paketleriyle karşılaştırıldı.

| Seviye | Son konumlar | Kör çözüm eşleşmesi |
| --- | --- | --- |
| B1 | B / B / A / C | 4/4 |
| B2 | A / B / D / D | 4/4 |
| C1 | A / D / A / C | 4/4 |
| C2 | C / D / C / B | 4/4 |

16/16 eşleşme; iki savunulabilir cevap saptanmadı. Bu, metin-anahtar tutarlılığına kanıttır; öğrencilerin soruları ne kadar kolay çözeceğini veya CEFR düzeyini kanıtlamaz.

## Claude incelemesi sonrası giderilenler

- M1: ABCD/BCDA/CDAB/DABC döngüsü kaldırıldı. Her paket dört farklı konum içermek zorunda değil; kümede her harf dört kez doğru. Yazılım doğrulayıcısına yeni örüntü yasağı eklenmedi.
- M2: Anlamlar açık kalıyor; bu yeni bir hata/onay bekleyen karar değil, onaylı öğrenme pratiği davranışı. Skor yardımsız sınav puanı diye sunulmaz.
- M3: C1 ikinci paragraf araştırma özetinin yöntem-sonuç sırasından çıkarılıp eski/yeni öğrenme ayrımı ve çıkarım gücü üzerinden yeniden kuruldu. Kaynaklar korundu, yeni bulgu icat edilmedi. İnternet genelinde intihal taraması yapılmadı.
- Çeldiriciler güçlendirildi; mutlak ifade ve uzun doğru cevap ipuçları azaltıldı. Son pakette doğru/en uzun eşitliği 5/16; bu oran tek başına kalite veya zorluk ölçümü değildir.
- B1 yolculuk ifadesi felt calmer olarak netleştirildi. B1 günlük anlatı örneği gereksiz uzunluk kotası için şişirilmedi; insan seviye örneklemesi açık.
- C1 ana argüman sorusu görev/analiz sınırlarını kapsıyor; q2 analizlerin çıkarım gücünü, q3 warrants anlamını soruyor.
- B1 felt/starting/waiting/next day/at; B2 study/changed/could; C1 reported/training; C2 newly/resist/that/to anlamları düzeltildi.
- Eşdeğer the/not ve mastar to açıklamaları ortaklaştırıldı. Gerçek farklı işlev/bağlamlar aynı lemma altında zorla tek anlama indirilmedi.
- B2 dosyası konuya uygun b2-library-bookings.json adına taşındı. Editoryal notların eski anahtar ve inceleme ifadeleri güncellendi.

Ayrı kalite reviewer'ı son kelime anlamlarını, kanıt aralıklarını ve kaynaklı anlatımı salt okunur inceledi; somut yeni düzeltme gerektiren anlam/soru kusuru saptamadı.

## Yapısal doğrulama

Gerçek validatePacks ve yayın CLI'ı yalnız doğrulama modunda çalıştırıldı:

~~~text
node apps/api/dist/passages/publish-passages.js --dir docs/content/passages-pilot/packs
4 paket doğrulandı.
Yalnız doğrulama yapıldı (DB'ye yazılmadı). Yazmak için --apply ekle.
exit 0
~~~

Kör girdi ile son seçenek sırası ayrıca karşılaştırıldı: PASS. Dört metin, 16 soru/64 şık gerekçesi; 870 kelime geçişi, 865 dokunma aralığı, 597 paket içi anlam girdisi. Şema, aralık, yüzey/cümle, tam kelime kapsamı, tek doğru ve şık uzunluk kontrolleri geçti.

## Açık sınırlar

- İnsan/öğrenci denemesi ve CEFR standardizasyonu yapılmadı.
- Uygulamada bu içeriklerin render/cihaz/ekran okuyucu testi yapılmadı.
- Başlık/soru/şık kelimeleri mevcut paragraf dokunma kapsamı dışındadır.
- Kalan 20 metin/80 soru henüz üretilmedi.
- DB yüklemesi, migration, commit/push ve yayın yapılmadı. Runtime kodu veya .env dosyaları değiştirilmedi.

## Revizyon 3 — küçük düzeltmeler (Claude, 2026-11-19)

Revizyon 2 incelemesindeki küçük bulgular giderildi; konumlar, doğru cevaplar, metinler ve dayanak aralıkları DEĞİŞMEDİ (BBAC / ABDD / ADAC / CDCB).

- B2 `certainty`: doğru şık diğerleriyle aynı yapıya getirildi ("Having less assurance that a room would be secured beforehand.").
- C1 `warrants` anlamı: "gerekçelendirir; hak eder" (çeldirici B'yle örtüşen "gerektirir" anlamı kaldırıldı).
- C1 q1 şık C: metinde artık geçmeyen "exploratory" yerine "later analysis"; q1/q2/q4 gerekçeleri güncel metne uyarlandı (eski "çekici anlatı" göndermesi ve eksik cümle düzeltildi).
- `that` ve `of` için aynı işlevli anlam metinleri ortaklaştırıldı (tamlayıcı, ilgi cümlesi, aitlik); gerçekten farklı işlevler ayrı bırakıldı. Benzersiz (lemma, anlam) çifti 538 → 534.
- `review/blind-input.json` ve `PREVIEW.md` aynı değişikliklerle eşlendi.

Kontroller: yayın CLI'ı yalnız doğrulama modunda 4/4 geçti; kör girdi ↔ paket ↔ PREVIEW metin/sıra tutarlı; kör girdide anahtar/açıklama/anlam yok; doğru en uzun/eş uzun 5/16, çeldiricilerde mutlak sözcük 1/48.
Sınır: değişen iki şık için yeni bir BAĞIMSIZ kör çözüm yapılmadı (düzeltmeyi yapan değerlendirdi); yayın öncesi bu iki soru yeni bir reviewer'a anahtarsız verilmeli. Hâlâ açık: anlam balonlarının kelime sorularının cevabını vermesi (ürün kararı), B1 uzunluğu/zorluğu, C1 ikinci paragraftaki "statistical label" ifadesinin belirsizliği (metin değişikliği gerektirir; span'lar yeniden üretileceği için dokunulmadı).

## Son kontrol notları ve durum (2026-11-19)

Aşağıdakiler Codex'in bildirdiği son kontroller ile verilen kararlardır. Claude tarafından yeniden çalıştırılmamış veya bağımsız doğrulanmamıştır; bu bölümde içerik değişmedi.

- **Yeniden çözüm (Codex bildirimi):** Revizyon 3'te değişen B2 `certainty` ve C1 q1 soruları, bağımsız ve anahtarsız bir reviewer tarafından yeniden çözüldü; tek doğru cevap bulundu, yeni belirsizlik bildirilmedi. (Yukarıdaki "Sınır" notundaki bağımsız çözüm açığı bu bildirimle Codex tarafından kapatıldı; Claude bu çözümü görmedi.)
- **Anlam balonları:** Açık kalacak; "öğrenme pratiği" kararı korunuyor. Hedef sözcüklerin (b1 routine, b2 certainty/losing, c1 warrants, c2 answerable) anlamı soruyla örtüşebilir; skor yardımsız sınav puanı olarak sunulmaz.
- **B1 uzunluğu:** Yalnız kelime sayısını artırmak için uzatılmayacak (107 sözcük, FK 6.1 olarak kalır). İnsan seviye örneklemesi açık.
- **C1 "statistical label" cümlesi:** Bağlamda açık bulundu; korunacak, metin değiştirilmedi.
- **C2 ikinci kaynak:** National Academies proje/rapor sayfası Codex tarafından açılıp kontrol edildi. Bu, raporun tamamının okunduğu anlamına gelmez; kapsam: ilgili sayfa/iddialar.
- **Durum:** Dört pilot Merve'nin okumasını bekliyor. DB yüklemesi, commit/push ve yayın yapılmadı; bunlar ayrı onay gerektirir.

## Kullanıcı isteğiyle C1/C2 güçlük revizyonu — son durum

C1 301 sözcük / 208 anlam / 297 span; C2 357 sözcük / 231 anlam / 353 span. B1 ve B2 dosyalarının öncesi/sonrası SHA-256 değerleri eşleşti. Yeni bütün paket toplamı 945 sözcük, 936 dokunma aralığı ve 648 paket içi anlam girdisidir. Eski sayı ve soru incelemeleri tarihsel sürüme aittir.

Soru tarzı kullanıcının örneğine göre: ana fikir, tam cümleye en yakın anlam, bağlamsal sözcük/ifade ve çıkarım. C1 son soru desteklenen çıkarım, C2 son soru çıkarılamayan sonuçtur.

Üretimde yer almayan yeni reviewer yalnız güncel blind-input.json içindeki C1/C2 metin/sorularını okudu. Anahtar/kelime anlamları verilmedi. Bağımsız seçimler: C1 o1/o4/o1/o3 (A/D/A/C), C2 o3/o4/o3/o2 (C/D/C/B); son paketlerle 8/8 eşleşti. C2 negatif sorusunda diğer üç seçeneğin metinde dayanağı ayrıca açıklandı; ikinci desteksiz şık bulunmadı. B1/B2 değişmediğinden yeniden çözdürülmedi.

Bağımsız anlam/kanıt incelemesi üç anlam kaydında düzeltme gerektirdi; hepsi uygulandı: (1) C1 "did suggest" içindeki olumlu/vurgulayıcı did, olumsuzluk yardımcısı did'den ayrı kayıt ("olumlu fiili vurgulayan geçmiş zaman yardımcı fiili"); (2) C1 "a memory survives" içindeki tekil, sayılabilir memory ("anı; bellekte tutulan bilgi") ile "aspects of memory" içindeki kavramsal memory ("bellek") ayrımı; (3) C2 "invitation to trust it" içindeki trust fiil anlamı ("güvenmek"; ad anlamı "güven" değil). Bu açıklama mevcut kayıtlara bakılarak yazılmıştır. Bilimsel iddialar önceki dar kaynak çerçevesinde kaldı; yeni araştırma bulgusu icat edilmedi.

Gerçek yayın CLI yalnız doğrulama modunda son düzeltmelerden sonra 4/4 geçti; hiçbir DB işlemi yapılmadı. Anlamlar açık öğrenme pratiği sürüyor. Daha güçlü çıkarım/söz dizimi bir editoryal hedef; psikometrik C1/C2 standardizasyonu veya öğrencilerde ölçülmüş zorluk artışı iddiası yok. Cihaz görünümü ve yeni soru türlerinin Türkçe arayüz etiketleri yayın öncesi entegrasyonda kontrol edilecek.

## Revizyon 4 — karar uygulaması (Claude, 2026-11-19)

Karar: pilot C1'in güçlüğü korunur; FK puanı nedeniyle otomatik sadeleştirme veya "C1+/C2-" etiketi YOK. Düzey değerlendirmesi öğrenci denemesinde yapılacak. B1/B2 ve onaylı açık anlam balonları değişmedi (B1/B2 dosyaları bayt düzeyinde aynı).

- **C2 ilk cümle (sıklık genellemesi → olasılık/yazar savı):** "…the invitation to trust it is seldom withdrawn altogether; more often, it is hedged until …" → "…the invitation to trust it can be hedged until responsibility for accepting it becomes difficult to locate." Doğrulanmamış "seldom/more often" sıklık iddiası kalktı. Metin değiştiği için span'lar, anlamlar, cümleler ve dayanak aralıkları yeniden üretildi: ilk cümledeki geçişler yeni metinden hesaplandı, sonraki P1 geçişleri kaydırıldı (−43 karakter), kullanılmayan kayıtlar silindi (seldom, withdrawn, altogether, often), yeni geçişler eklendi (can → "olabilir; olasılık belirtir"; be mevcut "olmak" kaydına). P2–P4 metinleri ve dört dayanak cümlesi değişmedi (yalnız P1'deki q4 dayanağının ofseti kaydı). C2: 351 sözcük / 228 anlam / 347 aralık. Toplam: 939 sözcük, 645 anlam girdisi, 930 aralık.
- **Anlam kayıtları:** C1 "has" (present perfect) → "tamamlanmış zaman yardımcı fiili" (C2'deki aynı işlevli kayıtla aynı metin; önceki "yakın geçmiş yapısı" etiketi yanlıştı). C1 "safer" bağlamda yeniden değerlendirildi: "daha güvenilir" otomatik hata sayılmadı; "no safer" cümlesinin riskle ilgili anlamını netleştirmek için "daha güvenli; hataya daha az açık" yapıldı.
- **Şık uzunluk dengesi (doğru anlam değişmedi, çeldiricilere dolgu eklenmedi):** C1 q2 doğru şık 121 → 104 karakter (diğerleri 104/104/106); C2 q4 doğru şık 129 → 108 (diğerleri 105/104/115).
- **RESULTS notu:** did/memory/trust düzeltmesi yukarıda açık yazıldı.

Kontroller: yayın CLI'ı yalnız doğrulama modunda 4/4 geçti; span yüzey ↔ metin ve cümle ↔ metin uyuşmazlığı 0; dayanak aralıkları aynı cümleleri gösteriyor; kör girdi ↔ paket ↔ PREVIEW tutarlı.
Anahtarsız bağımsız çözüm (insan değil; yalnız metin+sorular verilen ayrı bir yapay zekâ reviewer'ı; anahtar, gerekçe ve anlam verilmedi): C1 q2 D; C2 q1 C, q2 D, q3 C, q4 B → hepsi paket anahtarıyla aynı, güven yüksek, ikinci savunulabilir cevap yok. İsteğe bağlı notları (UYGULANMADI, karar bekliyor; uygulanırsa yeniden anahtarsız çözüm gerekir): C1 q2 D "differences between observations" kavramsal ayrımlara göre biraz gevşek; C2 q4 C "can justify" metindeki "might become more defensible"tan biraz güçlü.
Hâlâ açık: insan/öğrenci denemesi, cihaz görünümü, anlam balonlarının kelime sorularıyla örtüşmesi (kabul edilmiş davranış).
