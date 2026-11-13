# AGENTS.md

Bu dosya bu repoda çalışan tüm AI ajanları (Codex, Claude Code vb.) için ortak kuralları içerir.
Mimari, komutlar ve test kuralları için önce [CLAUDE.md](CLAUDE.md) dosyasını oku; orada anlatılanlar
ajandan bağımsız olarak geçerlidir. `apps/mobile` için ayrıca `apps/mobile/AGENTS.md` (Expo sürüm notu) geçerli.

## Çalışma düzeni
- `master`'a doğrudan push YOK. Her iş ayrı dalda, PR ile gider; `.github/pull_request_template.md` doldurulur.
- Kodu yazan ajan kendi PR'ını onaylamaz. İnceleme farklı bir ajan veya insan tarafından yapılır;
  bulgular PR yorumu olarak yazılır, son onay ve birleştirme insana aittir.
- İşler küçük tutulur (tek konu, tek PR). Davranış değişikliği test ile gelir; saf fonksiyona ayrılabilen
  mantık ayrılır ve test edilir (bkz. CLAUDE.md, mobil hook'lar).
- "Çalıştı" demek yetmez: çalıştırılan komut ve gerçek çıktı PR'a yazılır. Çalıştırılamayan bir şey varsa açıkça belirtilir.

## İnsan onayı olmadan YAPILMAYACAKLAR
- `master`'a push, force push, dal silme.
- Production veritabanına (Neon) yazma. Production yalnızca salt-okunur sorgulanır.
- R2 bucket'ına yazma/silme, Render/EAS/Play Console/Cloudflare/DNS ayarı değiştirme, yayın (deploy) alma.
- Store'a gönderim, versionCode/sürüm atlatma, abonelik ve ödeme ayarları (RevenueCat, `SUBSCRIPTION_GATE_ENABLED`).
- Dış hesaplara veya yeni servislere bağlanma, OAuth yetkisi isteme.

## Gizlilik
- `.env*`, servis hesabı JSON'ları, token ve API anahtarları repoya, PR metnine veya sohbete yazılmaz.
- Kullanıcıya ait kişisel bilgi (e-posta, ad vb.) dış servislere gönderilmez.

## Yerel build notu
Android build'i yalnızca ASCII ayna dizininden (`C:\ls`) alınır; repo yolundaki `ü` ninja'yı bozar.
Ağır işler (video kodlama, derleme) düşük öncelikle çalıştırılır; kullanıcının kullandığı uygulamalar sormadan kapatılmaz.
