import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);

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
