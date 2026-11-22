# C2 pilot — Confidence Without a Shortcut

Durum: yerel editoryal taslak; DB'ye yüklenmedi. Kullanıcının daha zor C1/C2 talebi üzerine metin ve sorular yeniden yazıldı. C2 etiketi hedef düzeydir; standartlaştırılmış ölçüm veya resmî sertifika değildir.

- Paket: packs/c2-evidence-and-confidence.json
- 351 sözcük geçişi, dört paragraf; 228 bağlamsal anlam girdisi, 347 dokunma aralığı. (Revizyon 4: ilk cümle olasılık/yazar savı olarak yeniden kuruldu: "…the invitation to trust it can be hedged until responsibility … becomes difficult to locate." Sıklık genellemesi kaldırıldı; kaynak kaydı yalnız National Academies yeniden üretme/tekrarlama ayrımını destekler.)
- Yalnız paragraf gövdeleri dokunulabilir; işlev sözcükleri ve tekrarlar dahildir.

## Zorluk nasıl artırıldı?

Önceki metindeki açık öneri/sonuç çizgisi yerine, okurun iki makul koruma yaklaşımındaki ortak eksikliği ve daha sonra savunulan alternatifin koşullarını izlemesi gerekiyor. İhtiyat ifadesi kullanmak ile kanıtın gücünü gerçekten hesaba katmak ayrılıyor. Ölçümü geçersizleştiren itiraz ile uygulama alanını daraltan itiraz, adalet ile eşit yer ayırma ve inceleme olanağı ile anlaşmaya varma arasındaki farklar birden fazla paragraftan birleştiriliyor.

Dil zorlaştırması nadir sözcük doldurmaktan oluşmuyor: ödün ilişkileri, öncelerine dönen göndermeler, devrik koşul (Were those differences explained), adlaştırma ve kapsamı sınırlayan ifadeler kullanıldı. Cümleler anlamlı gruplarda kalır; uzmanlık bilgisi soruların ön koşulu değildir.

## Dört tanıdık soru türü

| Soru | Tür | Gerekli okuma |
| --- | --- | --- |
| q1 | Ana fikir | Bütün metinde usule ilişkin ihtiyat ile kanıta karşı sorumluluk ayrımını birleştirme |
| q2 | Cümleye en yakın anlam | Koşullu eleştiride hangi ilişkinin ters çevrildiğini ayırt etme |
| q3 | Bağlamdaki ifade | outrun mecazını yalnız hız/süre değil kanıtsal kapsam bakımından yorumlama |
| q4 | Hangisi çıkarılamaz? | Üç metin destekli önermeyi, metnin vermediği bir nedensel olasılık sıralamasından ayırma |

Dört şık aynı dilbilgisel türde, benzer uzunlukta ve makul yakın anlamlarla kuruldu. Çeldirici yanlışlığı dış bilgiyle değil, ters ilişki, kapsam veya metinde bulunmayan ek varsayımla açıklanır. Doğru konumlar C/D/C/B olarak korundu; bir paket dört farklı konum kullanmak zorunda değildir. Nihai kör çözümü parent kaydeder; yazar öz kontrolü bağımsız inceleme sayılmaz.

## Kaynak ve iddia sınırı

1. National Academies, Reproducibility and Replicability in Research, 2019: https://www.nationalacademies.org/news/reproducibility-and-replicability-in-research
2. Rapor/proje sayfası, Reproducibility and Replicability in Science, 2019: https://www.nationalacademies.org/projects/DBASSE-BBCSS-17-03/publication/25303

Önceki kaynak kontrolündeki dar çerçeve korunuyor: aynı veri/kodla yeniden üretme ve yeni veriyle bulguyu sınama farklıdır; tek tekrarın başarısı/başarısızlığı otomatik doğruluk hükmü değildir. Yeni deney, oran, bilimsel mekanizma veya araştırma sonucu eklenmedi. İkinci paragraftaki dergi açıkça varsayımsaldır. Diğer paragraflar özgün bir editoryal argümandır; raporda yaşanmış bir olay diye sunulmaz. Kaynak özeti yöntem-sonuç sırasıyla yeniden anlatılmadı. Kaynak incelemesi tarihi paket metaverisinde 2026-11-19'dur; raporun tamamının yeniden okunduğu iddia edilmez.

## Kelime ve teknik kontrol

Bütün geçişler normalleştirilmiş lemma + bağlamsal Türkçe anlamla eşlenir. Aynı yazılan has (yardımcı fiil/sahiptir), to (mastar/yönelme), that (ilgi/tamlayıcı), for (amaç/sorumluluk konusu) görevleri gerektiğinde ayrılır. in order to, as though ve rather than birleşik aralık olarak tutulur. Anlamlar açık kalır; bu öğrenme pratiğidir ve yardımsız sınav puanı üretmez.

Mevcut validatePassagePack ile yapısal doğrulama: valid=true, issues=[]. Bütün span yüzeyleri ve geçişe ait cümleler yeniden üretildi; metin ASCII İngilizce olduğundan hesaplanan konumlar UTF-16 ile aynıdır. Son bağımsız review, insan seviye örneklemesi ve uygulama görünümü parent aşamasındadır. DB yüklemesi, commit/push veya yayın yapılmadı.

Son anlam incelemesi: to trust içindeki fiil güvenmek olarak düzeltildi.
