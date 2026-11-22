# B2 pilot — A room for the unexpected visitor

- Paket: `packs/b2-library-bookings.json`
- Slug: `pilot-b2-library-bookings`
- Durum: yerel editoryal taslak; yayımlanmadı. B2 etiketi editoryal hedeftir, standartlaştırılmış seviye ölçümü değildir.
- Uzunluk: 180 sözcük geçişi, 3 paragraf; 138 ayrı biçim/anlam kaydı. Dört soru, 16 şık.
- Ücretsiz örnek: evet; B2 için ilk örnek, `sortOrder: 1`.

## Özgünlük ve iddia sınırı

Riverside Library, personeli ve bir aylık deneme bu alıştırma için üretilmiş kurmaca bir senaryodur. Gerçek bir araştırma, kurum politikası veya istatistik gibi sunulmaz. Bu yüzden pakette `noFactualClaims: true`, `sources: []` kullanıldı. Bir makalenin metni çevrilmedi veya yeniden yazılmadı; bilimsel kaynaklardan kanıtlanmış sonuç çıkarıldığı iddia edilmiyor.

Senaryo; önceden planlama ile esnek erişim arasındaki ödünleşimi okuma konusu yapar. B2 hedefi, nadir kelimeler yerine karşıtlık (`however`, `while`, `but`), gerekçeli karar (`therefore`), koşul (`unless`) ve sınırlı başarı değerlendirmesiyle kurulmuştur. AWL kapsamı veya IELTS sınavına eşdeğerlik iddiası yoktur.

## Soru becerileri ve dayanaklar

| Soru | Beceri | Dayanak |
| --- | --- | --- |
| main-idea | Ana fikir | Son paragrafta iki erişim yolunun birlikte korunması |
| visitor-response | Ayrıntı ve karşıtlık takibi | İkinci paragrafta bazı kullanıcıların kesinliği özlemesi, diğerlerinin esnekliği olumlu bulması |
| certainty | Bağlamdan anlam | Önceden rezervasyon güvencesinin azalması |
| manager-inference | Metinle sınırlı çıkarım | Daha fazla kişinin oda bulması ile personel açıklama yükünün birlikte değerlendirilmesi |

Her şık için ayrı Türkçe gerekçe vardır. Yanlış şıklar aşırı genelleme, metinde olmayan ayrıntı, ters ilişki veya bağlam yanılgısı içerir; konum dağılımı üst paket incelemesinde ayrıca ele alınır. Dışarıdan kütüphanecilik bilgisi gerektirmez.

## Kelime kapsamı

Paragraftaki 180 geçişin tamamı, işlevsel sözcükler dahil, Türkçe anlam taşır. Her geçişin aralığı ve kaynak cümlesi otomatik hesaplandı. Aynı biçim farklı anlamda kullanıldığında ayrı anlam kaydı açıldı; örneğin `to` için yönelme ve mastar görevleri ayrıldı. Başlık, sorular ve şıklar mevcut ürün kapsamı gereği dokunulabilir kelime alanına dahil değildir. Noktalama işaretleri kelime sayılmaz.

## Review sonrası düzeltmeler

Ana fikir, kullanıcı tepkisi ve yönetici çıkarımı sorularındaki çeldiriciler mutlak ifadeler yerine metin ayrıntılarının kapsam/zaman/amaç bakımından yanlış yorumlarıyla yeniden yazıldı. `losing certainty` seçenekleri artık rezervasyon süresi, kuyruk, oda bilgisi ve önceden güvence ayrımını sorgular. `study room` içindeki `study` çalışma olarak düzeltildi; `changed` geçmiş zamanı korunur. Üç `could` geçişinin geçmiş imkân, koşul ve edilgen talep olanağı görevleri ayrı anlamlara bağlandı. Aynı görevdeki tanımlık/mastar açıklamaları B1 ile tutarlılaştırıldı; gerçek anlam farkları birleştirilmedi.

## Doğrulama

Mevcut kaynak koddan `validatePassagePack` bellekte TypeScript transpile edilerek çalıştırıldı: `valid: true`, `issues: []`. Bu yalnız yapısal doğrulama ve tam kelime kapsamı kanıtıdır. İlk taslak bağımsız kör çözümden geçti; güncel revizyonun inceleme durumu üst paket raporunda tutulur. İnsan seviye değerlendirmesi ve Merve örneklemesi tamamlanmadan yayın onayı sayılmaz. DB, migration, build, commit veya push işlemi yapılmadı.
