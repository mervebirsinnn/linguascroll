# Looplish — App Store Connect metinleri

Kopyala-yapıştır içindir. Gönderilmeden önce gözden geçir. Karakter sınırları parantez içinde.
Birincil dil: Türkçe.

## Uygulama bilgileri
- **Ad** (30): `Looplish`
- **Alt başlık** (30): `Kısa videolarla İngilizce`
- **Kategori:** Birincil Eğitim · İkincil Başvuru (Reference). İstersen boş bırakabilirsin.
- **Gizlilik politikası URL'si:** `https://looplish.app/privacy`
- **Destek URL'si:** `https://looplish.app/support`
- **Pazarlama URL'si (isteğe bağlı):** `https://looplish.app`
- **Telif hakkı:** `2026 Merve Birsin`

## Tanıtım metni (170)
```
Kaydır, izle, öğren. Kısa videolarda altyazıdaki kelimeye dokun, anlamını gör, kaydet; quizlerle pekiştir.
```

## Açıklama (4000)
```
Looplish, İngilizceyi kısa videolarla öğrenmenin kolay yolu.

Akışı kaydır, kısa videoları izle. Altyazıdaki herhangi bir kelimeye dokunduğunda anlamını ve geçtiği cümleyi görürsün; beğendiğin kelimeyi tek dokunuşla kaydedersin. Videoların arasında çıkan kısa quizler, az önce duyduklarını pekiştirir.

NELER VAR
• Altyazılı kısa videolar: günlük konuşmadan gerçek hayattan sahnelere
• Kelimeye dokun: anlamı ve geçtiği cümleyi gör
• Kelimelerim: kaydettiğin kelimeleri tekrar et, unutmadan öğren
• Videolara bağlı kısa quizler
• İlgi alanına ve seviyene göre kişiselleşen akış

ÜCRETSİZ BAŞLA
İlk videoları hesap açmadan izleyebilirsin. Daha fazlası için Premium'a geçebilirsin.

LOOPLISH PREMIUM
Premium ile tüm videolara ve quizlere sınırsız erişirsin. Abonelik, Apple Kimliği hesabından tahsil edilir ve dönem bitiminden en az 24 saat önce iptal edilmezse otomatik olarak yenilenir. Aboneliğini Ayarlar › Apple Hesabı › Abonelikler bölümünden yönetebilir veya iptal edebilirsin. Ücretsiz deneme sunuluyorsa, deneme bitmeden en az 24 saat önce iptal etmezsen ücretlendirilirsin.

Kullanım Koşulları: https://looplish.app/terms
Gizlilik Politikası: https://looplish.app/privacy
```

## Anahtar kelimeler (100, virgülle, boşluksuz)
```
ingilizce,kelime,altyazı,dil öğren,video,quiz,dinleme,kelime ezberle,b1,b2,c1,ielts,pratik
```
(90 karakter. Uygulama adındaki "Looplish" kelimesini tekrar yazmaya gerek yok.)

## Bu sürümdeki yenilikler
```
Looplish artık iPhone'da! Apple veya Google hesabınla giriş yap, kelimelerin ve ilerlemen her cihazda seninle.
```

## Yaş derecelendirmesi anketi
Tüm içerik kategorilerinde **Yok** (şiddet, cinsellik, küfür, kumar vb.).
- Sınırsız web erişimi: **Hayır** (linkler harici tarayıcıda açılır).
- Kullanıcı tarafından oluşturulan içerik / sohbet: **Hayır**.

Beklenen sonuç 4+. Videoların içeriği bunun dışında bir şey içeriyorsa ilgili soruyu ona göre işaretle.

## App Privacy formu
**Takip (tracking): Hayır.** Reklam yok, analitik SDK'sı yok. Kullanılan SDK'ların hepsinin manifest'inde takip yok.

Kaynak: build'e giren SDK'ların **kendi privacy manifest'leri** (aşağıdaki gerçek sürümler) ve uygulama kodu. Form, build'in
gizlilik raporunda birleşen manifest'lerle tutarlı olmalı. SDK bir veriyi "bağlı değil" diye beyan etse bile uygulama onu
kullanıcı kimliğiyle ilişkilendiriyorsa form "bağlı" der (ör. RevenueCat satın alma geçmişi).

| SDK (gerçek sürüm) | Nasıl belirlendi | Manifest beyanı |
|---|---|---|
| GoogleSignIn **9.2.0** | `@react-native-google-signin/google-signin` 16.1.5 → `GoogleSignIn ~> 9.0` (bugün çözülen en güncel 9.x) | Ad, E-posta, Telefon, Diğer veri, Kaba konum, Kullanıcı ID (bağlı; Uygulama işlevselliği, bazıları +Analitik); Cihaz ID ve Diğer kullanım verisi (bağlı; Analitik) |
| RevenueCat purchases-ios **5.92.0** | `react-native-purchases` 10.11.0 → PurchasesHybridCommon 19.5.0 → RevenueCat 5.92.0 | Satın alma geçmişi (bağlı değil; Uygulama işlevselliği) |
| sentry-cocoa **9.29.0** | `@sentry/react-native` 8.28.0 → `sentry_cocoa_version = '9.29.0'` | Çökme, Performans ve Diğer teşhis verisi (bağlı değil; Uygulama işlevselliği) |
| Firebase JS SDK (Auth) | `firebase` 12.19.0; native manifest yok | Google girişinde e-posta ve görünen ad, kimlik tanımlayıcıları; IP adresi güvenlik için birkaç hafta (Apple kategorisi değil) |

Uygulama ayarları:
- Sentry: `sendDefaultPii: false`, `tracesSampleRate: 0`, `setUser` yok.
- RevenueCat: yalnız `configure({ apiKey, appUserID })`; cihaz kimliği ya da özellik gönderimi yok.
- Firebase: `measurementId` yok (Analytics yok).

**Formda işaretlenecekler:**

| Veri türü (Apple) | Bağlı | Takip | Amaçlar | Neden |
|---|---|---|---|---|
| İletişim Bilgileri › Ad | Evet | Hayır | Uygulama işlevselliği | Google girişi: GoogleSignIn manifest'i; Firebase Auth görünen adı saklar |
| İletişim Bilgileri › E-posta adresi | Evet | Hayır | Uygulama işlevselliği | Google girişi: GoogleSignIn + Firebase Auth. Apple girişinde istenmez |
| İletişim Bilgileri › Telefon numarası | Evet | Hayır | Uygulama işlevselliği | GoogleSignIn 9.2.0 manifest'i beyan ediyor (uygulama telefon istemiyor) |
| Konum › Kaba konum | Evet | Hayır | Uygulama işlevselliği | GoogleSignIn 9.2.0 manifest'i |
| Tanımlayıcılar › Kullanıcı ID'si | Evet | Hayır | Uygulama işlevselliği, Analitik | Firebase UID, backend `users.id` = RevenueCat App User ID; GoogleSignIn Analitik de beyan ediyor |
| Tanımlayıcılar › Cihaz ID'si | Evet | Hayır | Analitik | GoogleSignIn 9.2.0 manifest'i |
| Satın Alımlar › Satın alma geçmişi | **Evet** | Hayır | Uygulama işlevselliği, Analitik | RevenueCat; abonelik backend'de `users.id` ile eşleniyor. RevenueCat'in önerdiği asgari amaçlar bu ikisi |
| Kullanım Verileri › Ürün etkileşimi | Evet | Hayır | Uygulama işlevselliği, Ürün kişiselleştirme | İzleme olayları, quiz cevapları, kelime tekrarları (akış sıralaması) |
| Kullanım Verileri › Diğer kullanım verileri | Evet | Hayır | Analitik | GoogleSignIn 9.2.0 manifest'i |
| Kullanıcı İçeriği › Diğer kullanıcı içeriği | Evet | Hayır | Uygulama işlevselliği | Kaydedilen kelimeler, video geri bildirimi |
| Diğer Veriler › Diğer veri türleri | Evet | Hayır | Uygulama işlevselliği, Analitik | GoogleSignIn 9.2.0 manifest'i |
| Teşhis › Çökme verileri | Hayır | Hayır | Uygulama işlevselliği | Sentry |
| Teşhis › Performans verileri | Hayır | Hayır | Uygulama işlevselliği | Sentry manifest'i (tracing kapalı olsa da beyan ediyor) |
| Teşhis › Diğer teşhis verileri | Hayır | Hayır | Uygulama işlevselliği | Sentry (oturum/cihaz bağlamı) |

Toplanmayanlar: hassas bilgi, kişiler, sağlık, finans, tarama/arama geçmişi, fotoğraf/video, ses, hassas konum.

Notlar:
- Sentry RN, JS console loglarını ve giden isteklerin URL'lerini de gönderir. Uygulama kodu token ya da kişisel veri loglamıyor.
- `GoogleSignIn ~> 9.0` ileride yeni bir 9.x'e çözülürse manifest'i tekrar kontrol et.

## Abonelik ürünleri
Android ürün kimlikleri ve fiyatları repo'da yok. Play Console › Para kazanma › Abonelikler ve RevenueCat › Products'tan
okunup **Android** sütunu doldurulmalı. iOS kimlikleri öneridir; App Store'da silinen bir product ID tekrar kullanılamaz.

| Plan | Android (Play) `product:base_plan` | iOS product ID (öneri) | RevenueCat paketi | Süre | Fiyat | Deneme (iOS intro offer) |
|---|---|---|---|---|---|---|
| Yıllık | `<doldur>` | `looplish_premium_annual` | `$rc_annual` (ANNUAL) | 1 yıl | Android TRY fiyatına en yakın Apple fiyat seviyesi | Free, 7 gün, yeni aboneler |
| Aylık | `<doldur>` | `looplish_premium_monthly` | `$rc_monthly` (MONTHLY) | 1 ay | aynı kural | Free, 7 gün, yeni aboneler |
| Haftalık | `<doldur>` | `looplish_premium_weekly` | `$rc_weekly` (WEEKLY) | 1 hafta | aynı kural | Free, 7 gün, yeni aboneler |

Yalnız Android'de gerçekten sunulan planları oluştur.
- Uygulama paketleri RevenueCat paket tipiyle (ANNUAL/MONTHLY/WEEKLY) eşliyor. iOS ürünleri, Android ürünlerinin bulunduğu
  **aynı** paketlere eklenmeli.
- Abonelik grubu: `Looplish Premium`. Tüm planlar aynı grupta olmalı; deneme hakkı grup başına bir kez.
- Grup içi seviye: Yıllık 1, Aylık 2, Haftalık 3.
- Deneme: Android'deki teklif 7 günse iOS'ta da 7 gün. Uygulama süreyi mağazadan okuyor; farklı olursa doğru gösterir ama
  iki platform tutarsız olur.

| Plan | Görünen ad (30) | Açıklama (45) |
|---|---|---|
| Yıllık | `Looplish Premium Yıllık` | `Tüm videolar ve quizler, 1 yıl` |
| Aylık | `Looplish Premium Aylık` | `Tüm videolar ve quizler, 1 ay` |
| Haftalık | `Looplish Premium Haftalık` | `Tüm videolar ve quizler, 1 hafta` |

Abonelik grubu görünen adı: `Looplish Premium`.
İnceleme ekran görüntüsü: TestFlight'taki ödeme ekranının görüntüsü.

## İncelemeci notu (App Review Information › Notes)
```
Looplish is a short-video English learning app (UI in Turkish).

- The first videos can be watched without signing in (an anonymous guest account is created automatically).
- Subscriptions are account-based and shared with our Android app, so the paywall asks the user to continue with Apple or Google before purchasing. Sign in with Apple requests no name or email. Purchases can be restored via "Satın alımları geri yükle" (Restore Purchases).
- To reach the paywall and purchase: tap "Kelimelerim" on the feed › "Hesabım" › "Premium planlarını gör" (See Premium plans). This entry is always available while the account has no active subscription.
- Account deletion: Kelimelerim › Hesabım › Hesabımı sil (Delete my account). The user re-authenticates, the Sign in with Apple token is revoked, and all account data is deleted. Deleting the account does not cancel an App Store subscription; the confirmation dialog explains this and links to subscription management.
- No demo account is needed; any Apple ID can be used.
```
Yol koddan doğrulandı: akış "Kelimelerim" → "Hesabım" → "Premium planlarını gör". Abonelik aktif değilken her zaman
görünür ve `SUBSCRIPTION_GATE_ENABLED`'dan bağımsızdır. Kapı kararı için bkz. docs/ios-release-checklist.md §5c.
