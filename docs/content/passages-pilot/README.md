# Okuma pratiği — dört seviyelik pilot

Bu klasör ilk içerik örneklemesidir: B1, B2, C1 ve C2 için birer özgün metin, her metinde dört soru. Tam hedef olan 24 metin / 96 sorunun ilk dört taslağıdır. Paketler veritabanına yüklenmedi; yayın onayı anlamına gelmez.

| Seviye | Metin | Kelime geçişi | Anlam girdisi | Erişim önerisi |
| --- | --- | ---: | ---: | --- |
| B1 | Before the First Message | 107 | 71 | Ücretsiz örnek |
| B2 | A room for the unexpected visitor | 180 | 138 | Ücretsiz örnek |
| C1 | Two meanings of learning better | 301 | 208 | Abonelik |
| C2 | Confidence Without a Shortcut | 351 | 228 | Abonelik |

Toplam: dört metin, 16 soru / 64 şık gerekçesi, 939 kelime geçişi ve 645 paket içi anlam girdisi. Birleşik ifadeler nedeniyle bunlar 930 dokunma aralığıyla kapsanır. Girdi sayısı production'daki benzersiz kelime veya kayıtlı kelime sayısı değildir. Bütün metinleri ve soru açıklamalarını rahat okumak için [PREVIEW.md](PREVIEW.md) dosyasını aç.

## İnceleme

- `packs/`: mevcut `passagePackSchema` ile uyumlu JSON içerikleri. Yalnız bu klasör yayın doğrulayıcısına verilmelidir.
- Seviye başına `*-editorial.md`: okunabilir metin, seviye gerekçesi ve kaynak/özgünlük notları.
- `review/`: cevap anahtarı çıkarılmış kör çözüm girdisi ve bağımsız inceleme sonucu.

B1/B2 günlük yaşam ve kamusal hizmet senaryoları kurmacadır. C1/C2 için kaynakların bulguları kontrol edilir; metin ve sorular bu çalışma için özgün yazılır. Kaynak yayıncı adları veya kullanılan akademik kelimeler CEFR seviyesini kendiliğinden kanıtlamaz. Seviye etiketleri editoryal öneridir; insan örneklemesi gerektirir.

Kelime kapsamı yalnız paragraf gövdeleridir; başlık, soru ve şıklar bu sürümde dokunulabilir alan değildir. Ortak `findWordTokens` tanımı kullanılır: İngilizce harf dizileri ve iç kesme işaretleri; işlevsel sözcükler ve tekrarlar dahil, noktalama/rakamlar hariç. Her geçişin anlamı ve kendi kaynak cümlesi vardır.

AWL kelime seçimine yardımcı kaynaktır; 570 kelime ailesi içerir, bir C1/C2 sertifikası veya her metne uygulanacak kota değildir: https://www.wgtn.ac.nz/lals/resources/academicwordlist/information

## Yalnız yapısal doğrulama

Repo kökünden:

```powershell
pnpm --dir apps/api run build
pnpm --dir apps/api run passages:publish --dir ../../docs/content/passages-pilot/packs
```

`--apply` kullanılmaz. Mevcut CLI bu biçimde DB bağlantısı açmadan paketleri doğrular. Şema, aralık ve kelime kapsamı kontrollerinin geçmesi; bilimsel doğruluk, iyi çeldirici veya uygun dil seviyesi için tek başına yeterli değildir.

## Revizyon 2

Claude içerik incelemesi sonrası cevap konumları yeniden dağıtıldı; her pakette dört farklı konum kullanma zorunluluğu kaldırıldı. Tüm kümede A/B/C/D dörder kez doğru; paketler artan/dönen veya ABAB dizisi oluşturmuyor. Bu editoryal kontrol genel yayın doğrulayıcısına yeni bir yasak olarak eklenmedi.

Öğrenme pratiğinde anlam balonları açık kalır. Bu nedenle kelime sorularındaki skor yardımsız seviye ölçümü değildir. Aynı işlevdeki `the`, `not` ve mastar `to` açıklamaları ortaklaştırıldı; farklı bağlam/işlevler birleştirilmedi. Kullanıcıyla kararlaştırılan kapsam değişmedi.

B2 paketinin dosya adı konuya uygun biçimde `packs/b2-library-bookings.json` oldu.

## Kullanıcı talebiyle C1/C2 güçlük revizyonu

C1: ana fikir, tam cümleye en yakın anlam, bağlamsal sözcük/yakın anlam ve desteklenen çıkarım. C2: ana fikir, tam cümleye en yakın anlam, bağlamsal ifade ve çıkarılamayan sonuç. C1/C2 metin ve soruları yeniden yazıldı; güçlük hedefi daha karmaşık söz dizimi, örtük varsayım, kapsam/koşul ve paragraflar arası ilişkilerdir. B1/B2 paketlerinin SHA-256 değerleri değişmedi. Bu bir içerik tasarımı değişikliğidir; öğrenci verisiyle doğrulanmış düzey artışı iddiası değildir.

Yeni `sentence-meaning`, `context-meaning`, `cannot-infer` türleri mevcut wire şemasına uygundur; mevcut mobil sürüm bilinmeyen türleri İngilizce okunabilir etiketle gösterebilir. Yayın öncesi Türkçe arayüz etiketi eklenmesi ayrı küçük entegrasyon işidir; bu içerik turunda runtime kodu değiştirilmedi.
