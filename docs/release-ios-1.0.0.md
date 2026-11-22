# Looplish iOS 1.0.0 — birleşik yayın planı

Bu plan PR'ları, migration'ları, içerik yayınını, env/bayrakları ve build/submit sırasını sıralar.
Merge, push, production deploy, Neon migration'ı, içerik yayını ve submit **ayrı onay** ister.

## Branch ve PR durumu (2026-11-22)
| Branch | Commit | Taban | Uzakta | PR |
|---|---|---|---|---|
| `feat/ios-app-store` | 52d6bf8 | master | ✔ | #18 açık |
| `fix/auth-provider-spinner` | 3183ebe | #18 | — | yok |
| `chore/ios-release-config` (iOS Okuma bayrağı + dokümanlar) | bkz. git log | #18 | — | yok |
| `feat/passages-contract` | b63c085 | master | origin'de e8ec3e7: **2 commit geride** | #16 taslak |
| `feat/platform-subscription-gate` | 4151322 | b63c085 | — | yok |
| `feat/account-level-setting` (yalnız withLevel + testler) | edd0922 | b63c085 | — | yok |
| `release/ios-1.0.0` | yerel doğrulama ağacı | master | — | PR kaynağı **değil** |

`feat/passages-contract` üzerindeki yeni yerel commit'ler:
- `8724471` (içerik; eski 2d59b92) ve `b63c085` (eski d4c7037). Repo **public** olduğu için NYT ve FT klasörleri
  (`docs/content/passages-nyt`, `docs/content/ft-reading-drafts`) Merve'nin kararıyla bu iki yerel commit'ten çıkarıldı.
  Dosyalar diskte duruyor ve `.git/info/exclude` ile yerelde görmezden geliniyor. Eski commit'lere hiçbir branch'ten
  erişilmiyor.
- `b63c085`: Cabin Crew (0024), cümle çevirisi (0023), paragraf "‹ Önceki", Hesabım seviye satırı, Cabin Crew görünen adı
  "Gramer Pratiği".

`feat/ios-release` (eski, paragraf tabanlı) ve onun üstündeki `5eef2db`: kullanılmıyor. `5eef2db` yarım bir spinner
düzeltmesi (`signInProvider` set edilmiyor) ve #17'nin kopyası. Tam düzeltme `fix/auth-provider-spinner`'da.

## PR sırası (master hedefli)
Güncel master (5e72ec5) üzerinde bu sırayla yapılan birleştirme, test edilen release ağacını veriyor.
1. **#18** (iOS). Temiz.
2. **Spinner** (`fix/auth-provider-spinner`). Temiz.
3. **iOS release config** (`chore/ios-release-config`). Temiz.
4. **#16 paragraf** (`feat/passages-contract`; NYT/FT çıkarıldı, push'a hazır). Çakışmalar:
   `PaywallFeedItem.test.tsx` ve `AccountScreen.test.tsx`; iki tarafın testleri de korunur.
5. **Platform kapısı** (`feat/platform-subscription-gate`). Temiz.
6. **Seviye** (`feat/account-level-setting`). Temiz.

## Production veritabanının mevcut durumu (ft-reading-drafts/README.md'den)
- Neon `looplish`'e migration **0020–0022 zaten uygulanmış** (Merve'nin onayıyla). Eksik olanlar yalnız **0023 ve 0024**.
- İki FT paketi (C1 internet kesintileri, C2 konut piyasası; birebir FT alıntısı) Neon'a **yüklü**. Paragraf API'si
  deploy edildiği anda kullanıcılara sunulur. **API deploy'undan önce Neon'da emekliye ayrılmalı ya da silinmeli.**

## Production sırası
Render master'ı otomatik deploy ediyorsa **migration'lar #16 birleşmeden önce** uygulanmalı. Aksi hâlde yeni API,
tabloları olmayan DB'ye karşı açılır.
1. **Neon yedeği** (branch/snapshot).
2. **Neon migration 0023–0024** (0020–0022 zaten uygulanmış; önce `drizzle.__drizzle_migrations` ile doğrulanır). Yalnız
   ekleme yapıyorlar (0023 kolon, 0024 kategori CHECK genişletmesi); eski API bunlarla çalışır. Hedef host komuttan önce
   doğrulanır.
2b. **Neon'daki FT paketleri emekliye ayrılır ya da silinir** (API deploy'undan önce).
3. **PR'ların birleşmesi ve API deploy'u.** `SUBSCRIPTION_GATE_ENABLED=false`, `SUBSCRIPTION_GATE_PLATFORMS`
   **tanımsız** (herkes bugünkü gibi sınırsız).
4. **İçerik yayını (Neon):** yalnız kullanım hakkı onaylanmış paketler. Önce doğrulama, sonra `--apply`; hedef DB yazdırılır.
5. **iOS build 1.0.0 (2)** master'dan (Okuma yalnız iOS'ta açık, Cabin Crew kapalı) → TestFlight.
6. **TestFlight kabul testi** (checklist §7, §7b): giriş butonları, seviye kalıcılığı, Okuma, satın alma, geri yükleme,
   hesap silme.
7. **App Privacy, RevenueCat, mağaza bilgileri, ekran görüntüleri.**
8. **Render: `SUBSCRIPTION_GATE_PLATFORMS=ios`** → son kontrol → **Submit for Review**.
   - Geri alma: değişkeni silmek.

Android: aynı master'dan bir sonraki build başlığı (`X-Client-Platform: android`), seviye ve spinner düzeltmesini alır.
Kapı kapalı kalır; Okuma ve Cabin Crew Android'de gizli.

## Bayraklar ve env (release ağacında doğrulandı)
| Ad | iOS production | Android production | Kaynak |
|---|---|---|---|
| `EXPO_PUBLIC_PASSAGES_ENABLED` | **true** | yok (kapalı) | `eas.json` → `build.production.ios.env`. `.env.production` `false` diyor, ama `@expo/env` ortamda zaten tanımlı değişkeni ezmediği için EAS'in `true` değeri geçerli. Yerel build'lerde `false`. TestFlight'ta "Okuma" girişinin göründüğü doğrulanmalı |
| `EXPO_PUBLIC_CABINCREW_ENABLED` | yok (kapalı) | yok (kapalı) | Cabin Crew/"Gramer Pratiği" bu sürümde gizli |
| `SUBSCRIPTION_GATE_ENABLED` | Render `false` | `false` | Değişmez |
| `SUBSCRIPTION_GATE_PLATFORMS` | Render `ios` (adım 8) | — | Tanımsız = bugünkü davranış |
| `REVENUECAT_SECRET_API_KEY` | Render, zorunlu | — | Kapı herhangi bir platformda açıksa boot'ta zorunlu |

## Platform başlığı: güvenlik sınırı DEĞİL
Başlık gönderilmezse (ya da `android` gönderilirse) kapı uygulanmıyor. Bu yüzden istemciyi değiştiren ya da trafiği proxy'den
geçiren bir iOS kullanıcısı ücretsiz Android erişimini elde edebilir. Bu, yayındaki eski Android sürümleriyle uyumluluk için
bilinçli bir tercih ve **güvenli bir abonelik sınırı değildir**:
- Premium yetkisi her zaman backend'in RevenueCat doğrulamasından gelir; taklit edilemez.
- Taklitle elde edilen en fazla şey, Android uygulamasının bugün herkese ücretsiz verdiği erişimdir.

Gerçek bir sınır için seçenekler (ayrı iş):
- **Global kapı:** Android'de de kapıyı açmak (`SUBSCRIPTION_GATE_ENABLED=true`). Başlık bağımlılığı tamamen kalkar.
- **Cihaz kanıtı:** Firebase App Check (iOS App Attest / Android Play Integrity) ile platformu istemci beyanı yerine
  kanıtla belirlemek. Yeni native bağımlılık ve konsol işi gerektirir.
- **Bilinmeyen platformu kapılı saymak:** Tüm desteklenen sürümler başlık gönderdikten sonra (zorunlu güncelleme ile).
  Tek başına yine taklide açık; App Check'le birlikte anlamlı.

## Mobil ↔ backend uyumluluğu
- Yayındaki Android sürümleri başlık göndermez → bilinmeyen platform → kapı kapalı.
- Migration 0020–0024 eski API ile uyumlu (yalnız ekleme). Yeni API, migration'sız DB'de `/passages`, `/words/saved` ve
  feed'de 500 verir. Sıra: migration → API → mobil.
- Paragraf metinleri Postgres'te; R2 gerekmez.

## İçerik durumu
| Paket | Adet | Seviye | Doğrulama | Kullanım hakkı |
|---|---|---|---|---|
| `passages-pilot` | 4 | B1, B2 (ücretsiz), C1, C2 (Premium) | ✔ | Özgün metin, kaynak kullanılmadı. Hukuki onay Merve'de |
| `passages-newscientist` | 8 | C1 ×5, C2 ×3 (Premium) | ✔ (0023 artık dahil; Türkçe cümle çevirileri de yayına girer) | **DOĞRULANMADI.** New Scientist makalelerine dayanan yeniden anlatım. Olgular serbest, ama yapıya yakın anlatım türev sayılabilir. İzin ya da hukuki görüş olmadan yayına alınmamalı |
| `passages-nyt` | 8 | B1 ×4, B2 ×4 | yayın paketi değil | **UYGUN DEĞİL**: B2 birebir, B1 uyarlama (telifli). Yalnız yerel; git'te yok |
| `ft-reading-drafts` | 2 | C1, C2 | — | **UYGUN DEĞİL**: `verbatim-excerpt`. Yalnız yerel; git'te yok. **Neon production'a YÜKLÜ** (bkz. aşağı) |
| Onaylı video artefaktları (`content-enrichment/approved`) | 19 | B1/B2 genel + Cabin Crew gramer soruları | — | Video yayını ayrı karar; Cabin Crew bu sürümde gizli |

Kaynak bağımlılığı olmayan tek grup pilot: **4 metin**. New Scientist onaylanırsa 12 olur. B1/B2'de ücretli metin yok;
mağaza metni buna göre yazıldı.
