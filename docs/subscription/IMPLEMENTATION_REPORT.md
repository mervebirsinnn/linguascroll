# Looplish — hesap, abonelik ve öğrenme akışı

Tarih: 29 Ekim 2026. Paket: `app.looplish.mobile`.

## Kullanıcı davranışı

- Uygulama Firebase anonim oturumuyla başlar. Oynatma erişimi verilen **10 farklı video toplam ücretsizdir**; günlük sıfırlanmaz. Aynı videoyu yeniden açmak hak tüketmez. Quiz'ler sayılmaz. Ön yükleme hak tüketmez.
- 11. farklı videoda Premium gerekir. Kesin sınır API'deki transaction ve kullanıcı satırı kilidiyle korunur; feed kesmesi yalnızca görüntüleme içindir.
- Satın almadan önce Google hesabı bağlanır. Yeni Google hesabına bağlanırken Firebase UID korunur. Google hesabı zaten varsa o hesabın hakları kullanılır; misafir verileri o hesaba birleştirilmez.
- Fiyat, ödeme dönemi ve varsa uygun deneme/tanıtım teklifi Google Play/RevenueCat'ten alınır. Sabit veya herkese vaat edilen 7 günlük deneme yoktur. Android'de kullanıcının uygun `defaultOption` teklifi esas alınır. Deneme istemiyorsanız Play tekliflerini kaldırın.
- Satın alma ve geri yükleme ancak backend RevenueCat doğrulamasıyla erişim açar. Ağ hatası “abonelik yok” diye gösterilmez. Bekleyen ödeme ikinci satın alma başlatmaz; SDK güncellemesi, uygulamaya dönüş veya “Tekrar dene” backend kontrolü yapar.
- Hesabım kalan hakkı, Premium durumunu, bitiş/yenileme tarihini, iptal veya ödeme sorunu bilgisini gösterir. İptal Google Play ekranında kullanıcı tarafından tamamlanır. İptal edilen abonelik ücretli dönemin sonuna kadar açık kalır.

## Ek iyileştirmeler

- RevenueCat kimlik geçişleri ve mağaza işlemleri sıraya alındı. Eski hesabın geciken yanıtı yeni hesabın erişimini değiştiremez; başka entitlement Premium açmaz.
- Abonelik sorguları ve mobil yeni API çağrıları zaman sınırlı; sunucu abonelik önbelleği sınırlı boyutta, pozitif TTL 60 saniye. Bilinen bitiş tarihi önbelleği ayrıca sınırlar.
- Medya worker'ı secret yokken artık içerik sunmaz. İmza her zaman kontrol edilir; R2 koşullu 304 yanıtı güvenli işlenir; özel içerik herkese açık cache'e yazılmaz.
- Altyazıdaki kelimeye dokununca önceden hazırlanmış anlam anında açılır; **AI isteği yapılmaz**. Kullanıcı Kaydet derse yalnızca veri kaydı isteği gider. Backend anlamı segment sözlüğünden bulur, istemcinin anlamına güvenmez. Kaynak cümlesi ve mevcut tekrar sistemi korunur.
- Cümleyi tekrar oynatma ve video için altyazı/çeviri/seviye/oynatma geri bildirimi eklendi. Bildirimler `video_feedback` tablosunda tutulur; yönetim arayüzü eklenmedi.
- Hesabım'da yeniden Google doğrulamasıyla hesap silme eklendi. Öğrenme verileri FK cascade ile silinir, Firebase hesabı kaldırılır. Silinen UID'nin SHA-256 özeti, süresi dolmamış eski token'ın hesabı yeniden oluşturmasını önlemek için saklanır. Firebase admin kimlik bilgisi yoksa işlem güvenli biçimde kullanılamaz.
- Hesap silmek Play aboneliğini iptal etmez; silmeden önce yönetim bağlantısı ve açık uyarı gösterilir. Mağaza/RevenueCat mali kayıtları bu endpoint ile silinmez; gizlilik politikasındaki saklama açıklaması buna uygun olmalıdır.
- Gerçek gizlilik/koşul/destek URL'leri için env yapılandırması ve `pnpm --filter @linguascroll/mobile release:check` ön kontrolü eklendi. Yer tutucu URL kullanılmıyor.

## Doğrulama

- API typecheck ve production derlemesi geçti.
- API unit: **48 suite, 636 test geçti**. Bu sayı PostgreSQL entegrasyon/e2e testlerini içermez.
- Mobil typecheck/test typecheck ve tam Jest suite'i geçti: **24 suite, 232 test**. Android JS/Hermes bundle export başarılı.
- Worker typecheck ve **4 gerçek fetch handler testi** geçti: secret eksik, geçerli/bozuk/süresi dolmuş imza, body içermeyen 304 ve başarısız If-Match için 412.
- Yeni PostgreSQL e2e testleri: bağlama dayalı idempotent kelime kaydı, kaynak cümlesi/tekrar, geri bildirim sahipliği, abonelik özeti ve silinen token ile hesabın diriltilememesi.
- Yerelde Docker/PostgreSQL çalıştırılamadığı için PostgreSQL 17 servisli GitHub Actions eklendi. [CI çalışması](https://github.com/mervebirsinnn/linguascroll/actions/runs/40866291324) başarılı: tüm migration'lar uygulandı, **77 API suite / 917 test**, 24 mobil suite / 232 test geçti. İlk CI pnpm sürüm çakışması testler başlamadan düzeltildi. Son worker 412 iyileştirmesi ayrıca yerelde 4/4 testle doğrulandı.
- Testlerde dış Firebase/RevenueCat servisleri taklit edilir. Google girişi, Play ödeme/iptal/geri yükleme ve Android native çalışma gerçek cihazda henüz doğrulanmadı. JS export native build veya cihaz testi yerine geçmez.

## Yayına hazırlık sırası

1. Firebase Authentication'da **Anonymous + Google** açık olsun. Android kayıt `app.looplish.mobile`; debug, EAS ve Play App Signing SHA-1'leri doğru uygulamada bulunsun. Web client ID Android client ID değildir.
2. Mobil development/preview/production EAS ortamlarında mevcut Firebase dört alanı, `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`, `EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY`, gerekiyorsa `EXPO_PUBLIC_REVENUECAT_ENTITLEMENT_ID` (varsayılan `premium`) ve HTTPS privacy/terms/support URL'leri tanımlansın. `.env.example` isimleri verir.
3. API: `FIREBASE_PROJECT_ID`, mevcut DB/cursor/admin env'leri; hesap silme için **yalnızca sunucuda** `FIREBASE_ADMIN_SERVICE_ACCOUNT_JSON`; `REVENUECAT_SECRET_API_KEY`, `REVENUECAT_ENTITLEMENT_ID` (mobil ile aynı), güçlü `MEDIA_URL_SIGNING_SECRET`. Service-account JSON mobilde/EXPO_PUBLIC altında/repoda olmamalı.
4. API ve worker aynı medya secret'ını kullansın. Worker artık secret eksikken 503 verir; canlı güncelleme API imza üretimi ve worker secret/deploy'u koordine etmelidir. R2 public `r2.dev`/başka doğrudan erişim kapalı olmalı.
5. DB migration'ları 0013–0017'yi sırasıyla uygulayın; mevcut 0013/0014 kuruluysa yalnızca yeniler çalışır. Önce test/staging veritabanında tam suite, sonra yedekli production migration. Komut: `pnpm --filter @linguascroll/api db:migrate`.
6. RevenueCat: Android paket, Play servis hesabı JSON'u, ürün/base plan, `premium` entitlement, current offering/package eşleşmeleri kontrol edilsin. Restore behavior: **Keep with original App User ID**; eski anonim aboneler varsa geçiş etkisi incelensin.
7. Play kapalı test için Metro/LAN bağımlılığı olmayan yeni preview/production AAB ve token API birlikte yayımlansın. Development APK grup testine uygun değildir. Play license tester ayarı ücret alınmayan ödeme testleri içindir; kapalı test grubu üyeliğinden ayrıdır.
8. Google Grubu üyeliği + Play teste katılım bağlantısı + mağazadan kurulum sırasını uygulayın. Test hesabı Play'de kullanılan hesapla aynı olmalı.
9. Gerçek cihaz senaryoları: yeni misafir, ilk 10/11. video, yeniden açma, kategori/prefetch, hesap bağlama ve diğer hesap, oturum kalıcılığı, satın alma, bekleyen/iptal/başarısız ödeme, backend kesintisi, geri yükleme, mağazada iptal ve dönem sonu, hesap silme/retry, altyazı kelime kaydı ve tekrar.
10. Doğrulama bitene kadar production **`SUBSCRIPTION_GATE_ENABLED=false`** kalsın. Bu değerle 10 video kapısı uygulanmaz ve ücretsiz hak yazılmaz. Test/staging'de `true` ile sınırı test edin; yalnızca kabul tamamlanınca production'da açın. Bu PR deploy veya canlı env değişikliği yapmaz.

Geri bildirimlerin incelenmesi (salt okuma):
```sql
SELECT video_id, reason, comment, updated_at
FROM video_feedback ORDER BY updated_at DESC LIMIT 100;
```

## Bilinen sınırlar

- Misafir oturumunu silmek veya başka Google hesabı kullanmak yeni hak sağlayabilir; bu sınır kişi değil hesap başınadır. Cihaz parmak izi eklenmedi.
- Önceden verilmiş imzalı MP4 URL'si 1 saat çalışabilir; kişiye bağlı değildir. DRM veya anlık URL iptali yoktur.
- RevenueCat webhook'u yoktur; aktif erişim önbelleği en fazla 60 saniye gecikebilir. Abonelik sorgusu kesilirse yeni sınırsız erişim verilmez.
- Hesap silme servisler arasında tek transaction değildir: önce yerel hesap kilitlenir, Firebase silinir, sonra yerel veriler temizlenir. Hata durumunda aynı kısa ömürlü yeniden doğrulama token'ıyla tekrar denenebilir; kalıcı arıza destek müdahalesi gerektirebilir.
- Eski kullanıcı-id tabanlı load-test scriptleri hâlâ güncel token akışına geçirilmedi. iOS/Apple satın alma kapsam dışı.

## Tasarım kaynakları

- [Google Play abonelik yönetimi ve yaşam döngüsü](https://developer.android.com/google/play/billing/subscriptions): mağaza iptal ekranı, dönem sonuna kadar erişim, bekleyen ödeme.
- [RevenueCat subscription offers](https://www.revenuecat.com/docs/subscription-guidance/subscription-offers): Android uygun teklif ve fiyat aşamaları.
- [RevenueCat Customer Center](https://www.revenuecat.com/docs/tools/customer-center): kendi kendine yönetim/geri yükleme yaklaşımı; ücretli/ayrı Customer Center SDK'sı eklenmedi.
- [Duolingo Super](https://join.duolingo.com/plus): açık fayda, fiyat/deneme ve iptal anlatımı referansı; arayüz kopyalanmadı.
- [Expo SDK 57](https://docs.expo.dev/versions/v57.0.0/): mevcut Expo sürümüne uygun uygulama yaklaşımı.
