import "reflect-metadata";
import { join } from "node:path";
import { NestFactory } from "@nestjs/core";
import type { NestExpressApplication } from "@nestjs/platform-express";
import { AppModule } from "./app.module";

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Chunk 10 — curated (locally üretilmiş, gerçek TTS sesi + waveform görseli
  // taşıyan) öğrenme videolarını `/media/*` altında servis eder. Yeni bir
  // dependency DEĞİL: @nestjs/platform-express zaten var olan bir dependency,
  // Express'in kendi native static-file middleware'ini sarmalıyor — gerçek bir
  // CDN/object-storage/Mux entegrasyonu gelene kadar bu, ihtiyacı yeterince
  // temiz çözen mevcut platform kapasitesi.
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

  await app.listen(3000);
}

void bootstrap();
