// RevenueCat'in Android PUBLIC SDK anahtarı (gizli REST anahtarı DEĞİL — o sadece
// backend'de, bkz. apps/api REVENUECAT_SECRET_API_KEY). EXPO_PUBLIC_ değişkenleri build
// zamanında gömülür; API_BASE_URL gibi, bu env'i okuyan TEK yer burası. Tanımsızsa
// satın alma kapalı kalır (paywall "yüklenemedi" gösterir) — uygulamanın geri kalanı etkilenmez.
export const REVENUECAT_ANDROID_API_KEY: string | undefined = process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY || undefined;
/** Backend REVENUECAT_ENTITLEMENT_ID ile aynı olmalı. */
export const REVENUECAT_ENTITLEMENT_ID = process.env.EXPO_PUBLIC_REVENUECAT_ENTITLEMENT_ID || "premium";
