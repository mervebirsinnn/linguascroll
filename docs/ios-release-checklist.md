# Looplish — iOS (App Store) yayın kontrol listesi

Bundle ID: `app.looplish.mobile` · Kod tarafı: `feat/ios-release` branch'i.
Sıra önemli: 1 → 2 → 3 tamamlanmadan sandbox satın alma bile çalışmaz.

## 1. Apple hesabı
- [ ] Apple Developer Program üyeliği (yıllık 99 $). Bireysel hesapta App Store'da satıcı adı olarak kişisel adın görünür.
- [ ] App Store Connect → İşlemler/Anlaşmalar: **Paid Applications Agreement** imzala, vergi formu ve banka bilgisi gir.
- [ ] Certificates, IDs & Profiles → Identifiers: `app.looplish.mobile` App ID, **Sign In with Apple** yeteneği açık.
  (İstersen bunu `eas build` ilk çalıştığında EAS de oluşturabilir. Yeteneği yine de kontrol et.)
- [ ] Keys: **Sign in with Apple** yetkili bir key (.p8) oluştur. Firebase'e girilecek (adım 4). Key ID ve Team ID'yi not et.
- [ ] Keys: **In-App Purchase** key (.p8). RevenueCat'e girilecek (adım 3).

## 2. App Store Connect uygulama kaydı
- [ ] My Apps → yeni uygulama: ad "Looplish", birincil dil Türkçe, bundle ID `app.looplish.mobile`, SKU serbest.
- [ ] Abonelikler → abonelik grubu oluştur. Play'deki planlarla aynı süre ve fiyat seviyesinde ürünler ekle.
- [ ] Her ürün için **Introductory Offer → Free, 7 gün** (Play'deki deneme ile eşleşsin).
- [ ] Her ürüne inceleme ekran görüntüsü ve açıklama ekle (ürünler uygulamayla birlikte incelemeye gider).

## 3. RevenueCat
- [ ] Proje → Apps → **App Store** uygulaması ekle (bundle ID aynı). In-App Purchase key'ini (.p8, Key ID, Issuer ID) gir.
- [ ] App Store Server Notifications: RevenueCat'in verdiği URL'yi App Store Connect → Uygulama → App Information'a yapıştır (v2).
- [ ] App Store ürünlerini import et → mevcut **premium** entitlement'ına bağla → mevcut "current" offering'deki paketlere ekle.
  (Aynı entitlement sayesinde Android'de abone olan kullanıcı iOS'ta aynı hesapla girince de premium görünür.)
- [ ] Project settings → Restore behavior'ın **Keep with original App User ID** olduğunu doğrula.
- [ ] API keys → App Store public key (`appl_...`) değerini kopyala.

## 4. Google / Firebase
- [ ] Google Cloud Console → Credentials → **OAuth client ID → iOS**, bundle ID `app.looplish.mobile`.
  Client ID `....apps.googleusercontent.com` biçiminde olmalı.
- [ ] Firebase → Project settings → **Add app → iOS**, bundle ID `app.looplish.mobile` (GoogleService-Info.plist indirmen
  gerekmez). Apple kimlik belirtecinin audience'ı bundle ID'dir; kayıt yoksa Apple girişi `auth/invalid-credential` ile düşer.
- [ ] Firebase → Authentication → Sign-in method → **Apple**'ı etkinleştir. "OAuth code flow configuration"
  bölümüne Team ID, Key ID ve Sign in with Apple .p8 key'ini gir. Bu yapılmazsa hesap silmede Apple token iptali başarısız olur.
  Silme yine tamamlanır ama Apple kuralı ihlal edilmiş olur; hata Sentry'ye düşer.
- [ ] Mevcut Google ve Anonymous sağlayıcıları açık kalmalı.

## 5. EAS ortam değişkenleri (production + preview)
```
eas env:create --environment production --name EXPO_PUBLIC_REVENUECAT_IOS_API_KEY --value appl_... --visibility plaintext
eas env:create --environment production --name EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID --value ....apps.googleusercontent.com --visibility plaintext
```
Firebase, web client, Sentry DSN, gizlilik ve şartlar değerleri zaten tanımlı (Android ile ortak).
`eas-build-pre-install` kontrolü iOS build'inde bu iki değeri zorunlu tutar. Eksikse build başlamadan durur.

## 5b. Backend ve web sitesi (iOS build'inden ÖNCE)
- [x] **Backend deploy:** silmede `apple.com` kabulü (commit 9135e9b) PR #17 ile master'a birleşti (5e72ec5) ve
  Render'a deploy edildi (2026-11-21). Apple hesabıyla gerçek silme TestFlight'ta §7b ile doğrulanacak.
- [x] **Kullanım Koşulları (looplish.app/terms):** App Store bölümü eklendi (site sürüm 16).
- [x] **Gizlilik Politikası (looplish.app/privacy):** Firebase/RevenueCat/mağaza ödemesi eklendi (site sürüm 16).
- [ ] **App Privacy formu (App Store Connect):** güncel gizlilik politikasıyla tutarlı doldurulmalı (bkz. 8. bölüm). AÇIK.

## 6. Build → TestFlight
```
cd apps/mobile
eas build -p ios --profile production     # Apple ID ile giriş ister; sertifika ve profili EAS oluşturur
eas submit -p ios --profile production    # TestFlight'a yükler
```
Not: native modüller (Google, Apple, RevenueCat) olduğu için Expo Go ile test edilemez. Test için TestFlight
ya da development build (`eas build -p ios --profile development`) gerekir.

## 7. Gerçek iPhone'da doğrulama (TestFlight)
- [ ] İlk açılış misafir → ücretsiz videolar → paywall.
- [ ] Paywall'da fiyat, süre, 7 gün deneme, otomatik yenileme metni, Gizlilik ve Şartlar linkleri görünüyor.
- [ ] "Apple ile devam et" ile bağlama (misafirin hakları ve ilerlemesi korunuyor).
- [ ] "Google ile devam et" ile bağlama (başka cihazda kullanılan Google hesabında doğru hesaba geçiş).
- [ ] Sandbox satın alma (Ayarlar → App Store → Sandbox hesabı) → premium açılıyor, backend doğruluyor.
- [ ] Silip yeniden yükle → giriş → "Satın alımları geri yükle".
- [ ] Hesap → Aboneliği yönet → App Store abonelik sayfası açılıyor.
- [ ] **ZORUNLU:** Hesabımı sil (Apple hesabıyla) → yeniden doğrulama → silme tamamlanıyor, Sentry'de "Apple belirteci iptal
  edilemedi" hatası YOK. iPhone Ayarlar › Apple Hesabı › Apple ile Giriş listesinden Looplish kalkmış olmalı.
- [ ] Sessiz mod açıkken video sesi beklendiği gibi.

### 7b. Apple hesap silme kabul testi (yalnız silmeye ayrılmış bir Apple hesabıyla)
Önkoşul: backend düzeltmesi canlıda. İki sonuç AYRI kaydedilir. Rapora yalnız durum kodu ve sonuç yazılır;
token, authorization code, UID veya e-posta yazılmaz. Durum kodları Sentry breadcrumb'larından (fetch) ya da
Render loglarından okunur.

| # | Adım | Firebase `accounts:revokeToken` | Looplish `DELETE /account` | Sonuç |
|---|------|------|------|------|
| 1 | Normal silme: Hesabımı sil → Apple doğrulaması | beklenen 200 | beklenen 204 | |
| 2 | Silme sırasında Apple sayfasını kapat | istek yok | istek yok | hesap duruyor mu? |
Uçak modu kullanılmaz: isteğin sunucuya ulaşıp ulaşmadığını göstermez. Ağ kesintisi, yalnız `looplish-api.onrender.com`'a
uygulanan bir proxy kuralıyla yapılır (ör. iPhone'da Proxyman/benzeri: DELETE `/account` için **istek engelleme** ya da **yanıtı
düşürme**). `identitytoolkit.googleapis.com` kurala dahil edilmez. Hangi durumun oluştuğu her seferinde **Render logu**
(DELETE /account satırı var mı, kodu) ve **veritabanı** ile kanıtlanır: `users` satırı var mı, `deleted_at` dolu mu,
`deleted_accounts`'ta `sha256(firebase_uid)` var mı. Firebase Console'da kullanıcının var olup olmadığı da kontrol edilir.

| # | Adım | revokeToken | DELETE /account (Render logu) | Sunucudaki gerçek durum | Uygulamada görünen |
|---|------|------|------|------|------|
| 3A | İptal başarılı, DELETE **sunucuya hiç ulaşmıyor**: proxy DELETE /account isteğini engeller | 200 | log satırı YOK | `users` satırı var, `deleted_at` NULL, Firebase kullanıcısı var | "Hesap silme tamamlanamadı…" uyarısı, oturum açık |
| 3A-1 | Kuralı kaldır, **5 dk içinde** tekrar "Hesabımı sil" | istek yok (önbellekteki token) | 204 | satır yok, `deleted_accounts`'ta hash var, Firebase kullanıcısı yok | oturum kapanır |
| 3A-2 | (3A'yı tekrarla) **5 dk'dan sonra** tekrar dene | istek yok | 401 | değişmedi (3A ile aynı) | uyarı |
| 3A-3 | Bir kez daha → yeni Apple doğrulaması | 200 (Firebase yinelenen iptali yok sayar) | 204 | 3A-1 ile aynı | oturum kapanır |
| 3B | Sunucu silmeyi **tamamlıyor**, istemci yanıtı alamadan bağlantı kesiliyor: proxy DELETE /account **yanıtını** düşürür | 200 | 204 | **ÖNCE KONTROL ET:** satır yok, hash var, Firebase kullanıcısı yok = hesap gerçekten silindi | "Hesap silme tamamlanamadı…" uyarısı (YANLIŞ BİLGİ), oturum hâlâ açık görünür |
| 3B-1 | Kuralı kaldır, **5 dk içinde** tekrar dene | istek yok | 204 (idempotent: satır yok + Firebase "user-not-found" yok sayılır) | değişmedi | oturum kapanır |
| 3B-2 | (3B'yi tekrarla) **5 dk'dan sonra** tekrar dene | — | 401 → bir sonraki denemede Apple doğrulaması Firebase'de silinmiş kullanıcıya yapılamaz | değişmedi (silinmiş) | uyarı tekrarlanır. Firebase belirteç yenilemesi başarısız olunca oturum kendiliğinden kapanıp giriş ekranı gelir. Aynı Apple ID ile giriş YENİ, boş bir hesap açar |

Kod davranışı (use-auth.ts `deleteAccount`): Apple doğrulaması ve iptal yalnız ilk denemede yapılır. Backend hatasında
(401 dışı ya da ağ hatası) taze ID token saklanır ve tekrar deneme doğrudan DELETE gönderir. Backend 5 dk içinde yeniden
doğrulama şartı arar; süre geçtiyse 401 gelir, saklanan token atılır ve sonraki deneme Apple doğrulamasını yeniler.
3B-2 bilinen bir UX borcu: hesap silinmiş olduğu hâlde kullanıcı hata görür. Bu iş kapsamında değiştirilmedi; sonucu kaydet.
- [ ] `SUBSCRIPTION_GATE_ENABLED`'ı bu adımlar geçmeden production'da açma.

## 8. Mağaza sayfası ve inceleme
- [ ] 6.9" iPhone ekran görüntüleri (en az 3). iPad desteği kapalı, iPad görüntüsü gerekmez.
- [ ] Açıklama, anahtar kelimeler, destek URL'si `https://looplish.app/support`, gizlilik URL'si `https://looplish.app/privacy`.
- [ ] Açıklamaya Kullanım Şartları (EULA) linki: `https://looplish.app/terms` (ya da Apple'ın standart EULA'sı).
- [ ] App Privacy formu: kullanıcı ID'si, e-posta (Google/Apple girişi), satın alma geçmişi, kullanım verisi
  (izleme ve quiz), crash/diagnostics (Sentry). Hiçbiri izleme (tracking) amaçlı değil.
- [ ] Yaş derecelendirme anketi, export compliance (uygulama yalnızca muaf şifreleme kullanıyor; plist'te zaten `false`).
- [ ] İncelemeci notu: "İlk videolar girişsiz izlenir. Abonelik hesaba bağlıdır ve Android ile ortaktır; bu yüzden satın
  alma öncesi Apple veya Google ile hesap bağlanır. Hesap silme: Hesap → Hesabımı sil."
  Gerekirse incelemeci için bir demo hesap bilgisi ekle.
