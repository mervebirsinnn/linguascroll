// Sentry — EN İLK import olmalı (bkz. instrument.ts'teki yorum): Sentry.init()
// NestFactory.create() dahil her şeyden önce çalışmalı.
import "./instrument";
import "reflect-metadata";
import { join } from "node:path";
import { NestFactory } from "@nestjs/core";
import { ConfigService } from "@nestjs/config";
import type { NestExpressApplication } from "@nestjs/platform-express";
import { AppModule } from "./app.module";
import { requireSignedMediaUrl } from "./videos/require-signed-media-url.middleware";

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Chunk 10 — curated (locally üretilmiş, gerçek TTS sesi + waveform görseli
  // taşıyan) öğrenme videolarını `/media/*` altında servis eder. Yeni bir
  // dependency DEĞİL: @nestjs/platform-express zaten var olan bir dependency,
  // Express'in kendi native static-file middleware'ini sarmalıyor — gerçek bir
  // CDN/object-storage/Mux entegrasyonu gelene kadar bu, ihtiyacı yeterince
  // temiz çözen mevcut platform kapasitesi.
  //
  // 2026-10-27 — MEDIA_URL_SIGNING_SECRET tanımlıysa static sunumdan ÖNCE imza kontrolü:
  // aksi halde feed'in/playback-access'in verdiği URL'ler kalıcı ve herkese açık olur,
  // ücretsiz hak kontrolü delinirdi (bkz. videos/signed-media-url.ts). Tanımsızken
  // (local dev) eski davranış. Kapı açıkken secret boot'ta zorunlu (envSchema).
  const mediaUrlSigningSecret = app.get(ConfigService).get<string>("MEDIA_URL_SIGNING_SECRET");
  if (mediaUrlSigningSecret) {
    app.use("/media", requireSignedMediaUrl(mediaUrlSigningSecret));
  }
  app.useStaticAssets(join(__dirname, "..", "public", "media"), { prefix: "/media/" });

  // DatabaseModule'ün onModuleDestroy'unun (pool.end()) gerçekten tetiklenmesi için
  // gerekli — bu olmadan Nest'in shutdown lifecycle hook'ları çalışmaz.
  app.enableShutdownHooks();

  // Development-only CORS: tüm origin'lere izin veriyoruz çünkü Expo dev sunucusunun
  // origin'i değişken (web/tunnel/LAN IP'sine göre değişir). Bu bilinçli olarak gevşek
  // bir dev-stage kararı — production'a taşınmadan önce belirli origin'lere
  // kısıtlanmalı. Auth/Redis gibi gerçek güvenlik katmanları henüz yok, bu yüzden
  // şimdilik kısıtlamamanın ek bir risk maliyeti de yok.
  app.enableCors();

  // Render gibi hosting platformları PORT'u kendileri seçip process.env üzerinden
  // enjekte eder ve servisin ONA bind olmasını bekler; env'de tanımlı değilse
  // (local dev) mevcut sabit 3000 davranışı korunur. Değer app.module.ts'teki
  // envSchema'dan geçtiği için burada tekrar parse/validate ETMİYORUZ — geçersiz bir
  // PORT zaten NestFactory.create() içinde (ilk satır) fail-fast ile patlamış olurdu.
  const port = app.get(ConfigService).get<number>("PORT") ?? 3000;
  await app.listen(port);
}

void bootstrap();
