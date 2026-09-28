import * as Sentry from '@sentry/react-native';

/**
 * index.ts'teki EN İLK import olmalı — Sentry.init() App/registerRootComponent
 * dahil her şeyden önce çalışmalı ki bootstrap sırasında atılan hatalar da
 * yakalanabilsin (apps/api/src/instrument.ts ile aynı desen).
 *
 * EXPO_PUBLIC_SENTRY_DSN tanımsızsa (örn. yerel .env'de hiç set edilmemiş bir
 * dev makinesi) Sentry client'ı devre dışı kalır (no-op) — local/test akışını
 * bozmaz.
 *
 * tracesSampleRate: 0 — bu entegrasyonun kapsamı SADECE hata/crash takibi;
 * performance tracing, profiling, session replay ve logs kapsam dışı (MVP
 * kararı). sendDefaultPii: false — cihaz/kullanıcı PII'si (IP, vs.) event'e
 * otomatik eklenmiyor; kullanıcı metni, kayıtlı kelimeler, auth token veya API
 * response body'si zaten hiçbir yerde manuel olarak event context'ine
 * eklenmiyor.
 */
Sentry.init({
  dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
  environment: __DEV__ ? 'development' : 'production',
  tracesSampleRate: 0,
  sendDefaultPii: false,
});
