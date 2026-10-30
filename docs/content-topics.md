# Looplish konu kataloğu

İlgi alanı seçiminde en az dört farklı konu gerekir. İçerik metadata'sında aşağıdaki
`topic` kimliklerini kullan. Topic ilgi alanıdır; `category` (general/animation/ielts)
ve CEFR seviyesi ayrı alanlardır. Her konuda farklı seviyede içerik üretilebilir.

| Durum | Konu | topic | Örnek kısa video |
|---|---|---|---|
| Mevcut | İlişkiler | dating | İlk buluşmada sohbet |
| Mevcut | Seyahat | travel | Otelde giriş yapma |
| Mevcut | Kariyer | career | İş görüşmesinde kendini tanıtma |
| Mevcut | Yaşam Tarzı | lifestyle | Sabah rutini |
| Mevcut | Mizah | humor | Komik bir günlük yanlış anlaşılma |
| Yeni | Yemek ve mutfak | food | Restoranda sipariş verme |
| Yeni | Spor ve sağlıklı yaşam | fitness | Spora yeni başlayan iki arkadaş |
| Yeni | Teknoloji ve yapay zekâ | technology | Bir AI aracını basitçe anlatma |
| Yeni | Bilim ve keşif | science | Gökyüzü neden mavi? |
| Yeni | Kültür ve tarih | culture | Bir ülkenin ilginç geleneği |
| Yeni | Psikoloji ve kişisel gelişim | psychology | Ertelemeyle baş etme |
| Yeni | Para ve ekonomi | finance | İhtiyaç ve istek arasındaki fark |
| Yeni | Doğa ve hayvanlar | nature | Kedilerin bir davranışının açıklaması |
| Yeni | Müzik | music | Sevdiğin şarkıyı anlatma |
| Yeni | Film ve diziler | cinema | Bir karakterin kısa tanıtımı |
| Yeni | Eğitim ve öğrenci hayatı | education | Sınava hazırlanma alışkanlıkları |

16 konu API sözleşmesinde, DB kısıtında, mobil seçim ekranında, kişiselleştirme
sıralamasında ve otomatik içerik zenginleştirme çıktısında birlikte tanımlıdır.
0019 migration'ı videos.topic_check kısıtını genişletir; yeni tablo oluşturmaz ve
mevcut içerikleri değiştirmez. Başlık eklemek video üretildiği anlamına gelmez.

## Premium devamı

Yeni mobil GET /feed isteklerinde continuous=true gönderir. Yetki sunucuda kontrol
edilir; ücretsiz kullanıcılar yine akış başına aynı 10 video + Premium kartı görür.
Premium kullanıcıda bounded plan bittiğinde sunucu sonraki planı imzalı cursor'a
koyar. Son partinin dışındaki videolar önce gelir; seçili kategori tükendikten
sonra bütün katalogdan beslenir. Katalogdaki her şey kullanıldığında mevcut
videolar tekrar sunulabilir. Katalog tamamen boşsa içerik uydurulamaz.

İstek tekrarları aynı cursor için aynı sıralamayı üretir (aynı katalog/tercih
sinyalleri altında); mobil tekrar gelen videoyu görünüm sırasıyla ayrı anahtarlar.
Bu sayede aynı video iki yerde görünse bile yalnızca görünür oynatıcı aktif olur.
Eski istemciler continuous istemezse önceki sonlu oturum sözleşmesi korunur.

Dört konu seçmeyen eski onboarding kaydı, seviyesini ve mevcut seçimlerini koruyarak
yeniden açılır. 1–3 seçimin çerçeveleri kırmızı, 4+ seçimin çerçeveleri yeşildir.
Seçim üçe düşürülürse devam tekrar kapanır. Seviye atlanabilir; ilgi alanı adımı
atlanamaz. Yeni native bağımlılık yoktur.
