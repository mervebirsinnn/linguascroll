# Looplish iOS 1.0.0 — birleşik yayın planı

Bu plan PR'ları, migration'ları, içerik yayınını, env/bayrakları ve build/submit sırasını sıralar.
Merge, production deploy, Neon migration'ı, içerik yayını ve submit **ayrı onay** ister.

## İçerik
| Kaynak | Commit | Taban | Durum |
|---|---|---|---|
| PR #18 `feat/ios-app-store` | 52d6bf8 | master | Açık |
| `fix/auth-provider-spinner` | 3183ebe | PR #18 | Yerel, push yok |
| `feat/passages-contract` (paragraf/okuma) | e8ec3e7 | master'dan 28 commit | Push'lu, PR yok |
| `feat/platform-subscription-gate` | 2ba70d2 | passages | Yerel, push yok |
| `feat/account-level-setting` | 2b6287e | passages | Yerel, push yok |
| Birleşik doğrulama: `release/ios-1.0.0` (yalnız yerel) | bkz. git log | master | Merge kaynağı **değil**; doğrulama ağacı |

Bu sürüme bilinçli olarak **dahil edilmeyenler** (ana checkout'ta commit edilmemiş, ayrı onay bekliyor):
- Cümle çevirisi (migration 0023, `context_sentence_tr`).
- Cabin Crew kategorisi (migration 0024).
- Paragraf "‹ Önceki" düğmesi.
- `.env.production` paragraf bayrağı satırı.

## PR sırası (master hedefli)
1. **PR #18** (iOS). Değişiklik yok, CI yeşil.
2. **Spinner PR** (`fix/auth-provider-spinner` → master). PR #18'den sonra yalnız 1 commit kalır.
3. **Paragraf PR** (`feat/passages-contract` → master). Migration 0020–0022 içerir. Merge, Neon migration planıyla birlikte
   yapılmalı (aşağıda). Çakışma: `PaywallFeedItem.test.tsx` sonundaki iki test bloğu; ikisi de korunur.
4. **Platform kapısı PR** (`feat/platform-subscription-gate` → master). Paragraf PR'ından sonra yalnız kendi commit'i kalır.
5. **Seviye PR** (`feat/account-level-setting` → master). Çakışma: `AccountScreen.test.tsx`; iki test seti de korunur.

Her PR'dan sonra master CI'ı yeşil olmalı. Birleşik ağaçta (release) tüm testler geçti; ayrıntı yayın raporunda.

## Production sırası
1. **Neon yedeği** (branch/snapshot).
2. **Neon migration 0020–0022** (paragraf tabloları, metinden kelime kaynağı, geçiş cümlesi). Migration'lar yalnız ekleme
   yapıyor (yeni tablo/kolon). Eski API bunlarla çalışmaya devam eder. Bu yüzden migration **önce**, API deploy'u **sonra**.
   Hedef DB host'u komuttan önce doğrulanmalı.
   - Yapılmazsa: yeni API'de `/passages` ve `/words/saved` 500 döner.
3. **API deploy** (PR'lar master'da). `SUBSCRIPTION_GATE_PLATFORMS` HENÜZ TANIMLANMAZ, yani davranış bugünkü gibi
   (herkes sınırsız). `SUBSCRIPTION_GATE_ENABLED=false` kalır.
4. **İçerik yayını (Neon):** yalnız yayına uygun paketler (bkz. İçerik durumu). Önce yalnız doğrulama, sonra `--apply`.
   Hedef DB yazdırılır ve kontrol edilir.
5. **iOS build 1.0.0 (2)** master'dan; paragraf bayrağı yalnız iOS'ta açık (bkz. Bayraklar). TestFlight'a submit.
6. **TestFlight kabul testi** (checklist §7, §7b): giriş/bağlama spinner'ı, seviye değişikliği, paragraf, satın alma,
   silme.
7. **Render: `SUBSCRIPTION_GATE_PLATFORMS=ios`** (App Review'a göndermeden önce). Android etkilenmez.
   `REVENUECAT_SECRET_API_KEY` yoksa API açılmaz (yapısal güvence).
   - Geri alma: değişkeni silmek.
8. **App Store Connect:** metinler (`docs/app-store-listing.md`), App Privacy, abonelikler → **Submit for Review**.

Android: aynı master'dan bir sonraki Android build'i başlık (`X-Client-Platform: android`), seviye değiştirme ve spinner
düzeltmesini alır. Abonelik kapısı Android'de kapalı kalır. Paragraf girişi Android'de bayrağa bağlı (bkz. Bayraklar).

## Bayraklar ve env
| Ad | Nerede | iOS 1.0.0 | Android | Not |
|---|---|---|---|---|
| `EXPO_PUBLIC_PASSAGES_ENABLED` | mobil build zamanı | **true** gerekli | karar bekliyor | Repo'da hiçbir yerde tanımlı değil (varsayılan kapalı). Öneri: yalnız iOS için `eas.json` → `build.production.ios.env.EXPO_PUBLIC_PASSAGES_ENABLED: "true"`. EAS ortam değişkeni iki platformu birden etkiler. **Değiştirilmedi.** |
| `SUBSCRIPTION_GATE_ENABLED` | Render | `false` | `false` | Değişmez |
| `SUBSCRIPTION_GATE_PLATFORMS` | Render | `ios` (adım 7) | — | Yeni; tanımsız = bugünkü davranış |
| `REVENUECAT_SECRET_API_KEY` | Render | zorunlu | — | Kapı herhangi bir platformda açıksa boot'ta zorunlu |
| `EXPO_PUBLIC_REVENUECAT_IOS_API_KEY`, `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` | EAS production | tanımlı | — | Doğrulandı |

## Mobil ↔ backend uyumluluğu
- Yayındaki Android sürümleri başlık göndermez → bilinmeyen platform → kapı kapalı. Davranış değişmez.
- Yeni mobil sürüm eski API'ye gelirse (deploy sırası bozulursa) `/passages` 404/500 verir. Bu yüzden API, iOS build'inden önce.
- Migration 0020–0022 eski API ile uyumlu (yalnız ekleme). 0023/0024 bu sürümde YOK; Neon'a uygulanmamalı.
- Paragraf metinleri Postgres'te; R2 gerekmez.

## İçerik durumu (release doğrulayıcısıyla, yalnız doğrulama)
| Paket | Adet | Seviye | Doğrulama | Yayına uygunluk |
|---|---|---|---|---|
| `passages-pilot` | 4 | B1, B2, C1, C2 (B1/B2 ücretsiz örnek) | ✔ | Özgün metin → uygun |
| `passages-newscientist` | 8 | C1 ×5, C2 ×3 | ✔ (0023 olmadan; Türkçe cümle çevirisi yayına girmez) | Kendi ifademizle yazıldı → uygun |
| `passages-nyt` | 8 | B1 ×4, B2 ×4 | yayın paketi değil | **UYGUN DEĞİL**: B2 kaynaktan kelimesi kelimesine, B1 sadeleştirilmiş uyarlama (telifli gazete) |
| `ft-reading-drafts` | 2 | C1, C2 | — | **UYGUN DEĞİL**: `verbatim-excerpt` (telifli) |

Uygun toplam: **12 metin** (B1 1 · B2 1 · C1 6 · C2 4). B1/B2'de yalnız ücretsiz örnek olduğu için Premium'un B1/B2'de
okuma değeri yok. İlk sürüm hedefi (6/6/6/6) karşılanmıyor; içerik onayı Merve'de.
