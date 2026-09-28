import * as Sentry from "@sentry/nestjs";
import { scrubSensitiveRequestData } from "./sentry-privacy";

/**
 * main.ts'teki EN İLK import olmalı (bkz. o dosyadaki yorum) — Sentry.init()
 * NestFactory.create() dahil her şeyden önce çalışmalı ki bootstrap sırasında
 * atılan hatalar da yakalanabilsin.
 *
 * SENTRY_DSN burada process.env'den DOĞRUDAN okunuyor, ConfigService'ten DEĞİL:
 * bu dosya Nest'in DI container'ı (dolayısıyla ConfigModule) hiç var olmadan,
 * NestFactory.create()'den ÖNCE çalışıyor. DSN tanımsızsa Sentry client'ı
 * devre dışı kalır (no-op) — local/test boot'u bozmaz; envSchema'daki SENTRY_DSN
 * de bu yüzden .optional() (bkz. app.module.ts).
 *
 * tracesSampleRate: 0 — bu entegrasyonun amacı SADECE hata takibi, performance/
 * tracing kapsam dışı. beforeSend (bkz. sentry-privacy.ts) Authorization/Cookie
 * header'larını ve structured cookie verisini event'ten çıkarır — body/query gibi
 * başka kullanıcı verisi buraya BİLİNÇLİ olarak hiç eklenmiyor.
 */
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV ?? "development",
  tracesSampleRate: 0,
  beforeSend: scrubSensitiveRequestData,
});
