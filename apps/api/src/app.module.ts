import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { z } from "zod";
import { AppController } from "./app.controller";
import { ContentAdminModule } from "./content-admin/content-admin.module";
import { DatabaseModule } from "./database/database.module";
import { FeedModule } from "./feed/feed.module";
import { QuizzesModule } from "./quizzes/quizzes.module";
import { UsersModule } from "./users/users.module";
import { VideosModule } from "./videos/videos.module";
import { WordsModule } from "./words/words.module";

// Uygulamanın zorunlu ortam değişkenleri. ConfigModule.forRoot'un validate fonksiyonu
// olarak kullanılıyor: process.env eksik/bozuksa NestFactory.create() sırasında,
// app.listen()'a hiç ulaşmadan fail-fast crash eder — ilk HTTP isteğini beklemez.
// Ayrı bir config dosyası/framework açmıyoruz, birkaç alanlık bir Zod şeması yeterli.
// export edilmesinin tek sebebi app.module.spec.ts'in gerçek ConfigModule + bu şema
// zincirini (process.env'e ne yazıldığı dahil) Nest app'in tamamını boot etmeden
// test edebilmesi — başka hiçbir yerden import edilmiyor.
export const envSchema = z.object({
  DATABASE_URL: z
    .string()
    .min(1, "DATABASE_URL tanımlı olmalı")
    .refine(
      (value) => {
        try {
          const protocol = new URL(value).protocol;
          return protocol === "postgres:" || protocol === "postgresql:";
        } catch {
          return false;
        }
      },
      { message: "DATABASE_URL geçerli bir postgres:// veya postgresql:// URL'si olmalı" },
    ),
  // Chunk 8: feed pagination cursor'ının HMAC imzası (bkz. feed/feed-cursor.ts).
  // Confidentiality değil tamper-detection hedefi — yine de zayıf/tahmin edilebilir
  // bir secret imzayı anlamsız kılar, bu yüzden minimum bir uzunluk zorunlu.
  FEED_CURSOR_SECRET: z.string().min(32, "FEED_CURSOR_SECRET en az 32 karakter olmalı"),
  // Chunk 10 — curated (locally üretilmiş) video dosyalarının servis edildiği
  // base URL (bkz. main.ts'teki static asset serving, resolve-playback-url.ts).
  // Mobile'daki EXPO_PUBLIC_API_BASE_URL ile AYNI operasyonel gerçeklik: localhost
  // sadece web/simulator için işe yarar, fiziksel cihazda gerçek bir LAN IP'si
  // gerekir — bu yüzden burada da bir default var ama production/cihaz testi
  // için override edilmesi bekleniyor.
  PUBLIC_MEDIA_BASE_URL: z.string().url().default("http://localhost:3000"),

  // Chunk 17 — R2_* (bkz. content-admin/r2-storage.service.ts) burada `.optional()`
  // olarak duruyor: BOOT-TIME ZORUNLULUK yok — feed/videos/words/quizzes gibi mevcut
  // hiçbir özellik R2'ye ihtiyaç duymuyor, eksikse uygulama yine de ayağa kalkar.
  // R2StorageService kendi env okumasını lazy yapıyor, eksikse SADECE upload
  // çağrıldığında net bir hatayla patlıyor (bkz. o dosyadaki yorum) — bu davranış
  // AYNI kalıyor.
  //
  // Smoke-test bulgusu (Chunk 17 sonrası): bu alanlar şemadan TAMAMEN çıkarılmışsa
  // Zod'un `z.object()` `.parse()`'ı onları şemada olmayan anahtar olarak SESSİZCE
  // ATAR; `@nestjs/config`, `ConfigService`'in gördüğü değerleri process.env'e SADECE
  // `validate()`'in DÖNÜŞ DEĞERİNDEN yazıyor (`assignVariablesToProcess`) — yani
  // `.env` dosyasında gerçekten tanımlı olsalar bile ConfigService.get() onları hiç
  // bulamıyordu (gerçek .env + gerçek ConfigModule ile test edilmeden fark edilmeyen
  // bir etkileşim). `.optional()` ile şemada YER ALMALARI, boot'u zorunlu kılmadan bu
  // değerlerin parse çıktısında hayatta kalıp process.env'e ulaşmasını sağlıyor.
  R2_ACCOUNT_ID: z.string().min(1).optional(),
  R2_ACCESS_KEY_ID: z.string().min(1).optional(),
  R2_SECRET_ACCESS_KEY: z.string().min(1).optional(),
  R2_BUCKET_NAME: z.string().min(1).optional(),
  R2_PUBLIC_BASE_URL: z.string().min(1).optional(),

  // Chunk 17C.1 — R2_*'nin AYNI kök nedeni (yukarıdaki yorum), farklı bir tüketici:
  // `content-enrichment/enrichment-llm-client.ts` (Chunk 15, değiştirilmedi)
  // `process.env.GEMINI_API_KEY`'i DOĞRUDAN okuyor (R2StorageService'in aksine
  // ConfigService.get() KULLANMIYOR — bu chunk'ta bilinçli olarak DEĞİŞTİRİLMEDİ,
  // kapsam dışı). Bugüne kadar bu satır sadece `pnpm enrich` CLI'ından (Nest'in
  // dışında, `.env`'i farklı yoldan gören bir process) çağrıldığı için sorun hiç
  // görünmemişti; Chunk 17C onu İLK KEZ bir NestJS process'i (bu envSchema'nın
  // gözetimindeki process.env) içinden çağırınca 502 "GEMINI_API_KEY tanımlı değil"
  // olarak ortaya çıktı. R2 ile AYNI çözüm: boot-time ZORUNLULUK yok (enrichment
  // olmadan da uygulama ayağa kalkar) — `.optional()` sadece parse çıktısında hayatta
  // kalıp process.env'e ulaşmasını sağlıyor; eksikse `enrichTranscript` kendi hatasını
  // (değişmeden) fırlatmaya devam ediyor.
  GEMINI_API_KEY: z.string().min(1).optional(),
});

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: (env) => envSchema.parse(env),
    }),
    DatabaseModule,
    UsersModule,
    VideosModule,
    QuizzesModule,
    WordsModule,
    FeedModule,
    ContentAdminModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
