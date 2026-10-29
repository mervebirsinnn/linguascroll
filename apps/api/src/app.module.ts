import { MiddlewareConsumer, Module, NestModule } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { APP_FILTER } from "@nestjs/core";
import { SentryGlobalFilter, SentryModule } from "@sentry/nestjs/setup";
import { z } from "zod";
import { AppController } from "./app.controller";
import { AuthModule } from "./auth/auth.module";
import { ContentAdminModule } from "./content-admin/content-admin.module";
import { DatabaseModule } from "./database/database.module";
import { FeedModule } from "./feed/feed.module";
import { QuizzesModule } from "./quizzes/quizzes.module";
import { RequestLoggingMiddleware } from "./request-logging.middleware";
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
const baseEnvSchema = z.object({
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

  // Deploy prep — content-admin/content-admin-secret.guard.ts'in okuduğu paylaşılan
  // secret (bkz. o dosyadaki yorum). R2_*/GEMINI_API_KEY ile AYNI kök nedenle
  // (yukarıdaki yorumlar) `.optional()`: boot-time zorunluluk yok (bu olmadan da
  // uygulama ayağa kalkar, sadece content-admin endpoint'leri kilitli kalır) — ama
  // ConfigService.get()'in bu değeri GÖREBİLMESİ için şemada YER ALMASI şart, aksi
  // halde `.env`'de/Render'da tanımlı olsa bile guard onu hiç göremez (AYNI
  // assignVariablesToProcess etkileşimi). Guard fail-closed: secret tanımlı değilse
  // TÜM content-admin isteklerini reddeder — yani prod'da fiilen zorunlu, ama dev/test
  // ortamını (bu env var'sız da boot olabildiği için) kırmıyor.
  CONTENT_ADMIN_SECRET: z.string().min(1).optional(),

  // Deploy prep — Render (ve benzeri platformlar) HTTP portunu kendisi seçip
  // process.env.PORT üzerinden enjekte eder; local dev'de tanımlı değildir (main.ts
  // bu durumda 3000'e düşer, bkz. main.ts). `z.coerce.number()` string'i sayıya
  // çevirir; geçersiz bir değer (örn. "abc") NaN'a coerce olup `.int()`/`.positive()`
  // kontrolünde fail-fast başarısız olur — sayısal olmayan bir PORT'la sessizce
  // yanlış bir porta bind olmak yerine boot'ta net bir hata.
  PORT: z.coerce.number().int().positive().optional(),

  // Sentry error tracking — R2_*/GEMINI_API_KEY/CONTENT_ADMIN_SECRET ile AYNI
  // kök nedenle (yukarıdaki yorumlar) `.optional()`: boot-time zorunluluk yok
  // (instrument.ts'teki Sentry.init() DSN tanımsızken kendiliğinden no-op'a
  // düşer, local/test boot'u bozmaz) — ama ConfigService'in bu değeri
  // GÖREBİLMESİ için şemada YER ALMASI şart (AYNI assignVariablesToProcess
  // etkileşimi). instrument.ts, Nest'in DI/ConfigModule'ü hiç var olmadan
  // NestFactory.create()'den ÖNCE çalıştığı için DSN'i process.env'den
  // DOĞRUDAN okuyor — ConfigService.get() KULLANMIYOR (aynı GEMINI_API_KEY
  // deseni).
  SENTRY_DSN: z.string().url().optional(),

  // 2026-10-01 — RevenueCat entitlement kontrolü (bkz. subscriptions/revenue-cat-client.ts).
  // AYNI `.optional()` kararı: gerçek bir RevenueCat hesabı/anahtarı olmadan
  // local dev'in boot'u bozulmamalı — tanımsızken RevenueCatClient her zaman
  // `false` (abone değil) döner, ücretsiz günlük limit geçerli kalır.
  REVENUECAT_SECRET_API_KEY: z.string().min(1).optional(),

  // 2026-10-03 — ücretsiz video hakkı (paywall kapısı) için ana şalter. "false": kimse
  // kilitlenmez (gerçek ürünler hazır olmadan canlı kullanıcıları kilitlememek için).
  // 2026-10-27 — production'da varsayılan YOK (bkz. aşağıdaki superRefine): eksik bir env
  // var'ı sessizce sınırsız erişim açmasın, operatör "true"/"false"u bilinçli seçsin.
  SUBSCRIPTION_GATE_ENABLED: z.enum(["true", "false"]).optional(),

  // 2026-10-27 — Firebase Authentication proje id'si: kullanıcıya ait TÜM endpoint'lerin
  // kimliği bu projenin ID token'larından doğrulanıyor (iss/aud bu değere bağlı, bkz.
  // auth/firebase-token-verifier.ts). Boot'ta ZORUNLU: yoksa hiçbir kullanıcı doğrulanamaz.
  // Gizli değil (mobile config'inde de var); servis hesabı/secret gerekmiyor.
  FIREBASE_PROJECT_ID: z.string().min(1, "FIREBASE_PROJECT_ID tanımlı olmalı"),

  // 2026-10-27 — medya URL'lerinin kısa ömürlü HMAC imzası (bkz. videos/signed-media-url.ts).
  // Media worker'a da AYNI değer `wrangler secret put MEDIA_URL_SIGNING_SECRET` ile verilmeli.
  // Tanımsızken URL'ler imzasız (local dev/test); kapı açıkken zorunlu.
  MEDIA_URL_SIGNING_SECRET: z.string().min(32, "MEDIA_URL_SIGNING_SECRET en az 32 karakter olmalı").optional(),

  // Sadece yukarıdaki production kuralı için okunuyor; şemada olmasa da process.env'de
  // kalırdı, ama superRefine'ın görebilmesi için burada tanımlı.
  NODE_ENV: z.string().optional(),
});

/**
 * 2026-10-27 — eksik yapılandırma sessizce sınırsız (ya da doğrulanamayan) erişim açmasın:
 * - Kapı açıkken RevenueCat secret'ı zorunlu (yoksa hiçbir abone doğrulanamaz) ve medya
 *   imza secret'ı zorunlu (yoksa URL'ler kalıcı/herkese açık olur, hak kontrolü delinir).
 * - Production'da SUBSCRIPTION_GATE_ENABLED açıkça verilmeli; local/test'te varsayılan "false".
 */
export const envSchema = baseEnvSchema
  .superRefine((env, ctx) => {
    if (env.NODE_ENV === "production" && env.SUBSCRIPTION_GATE_ENABLED === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["SUBSCRIPTION_GATE_ENABLED"],
        message: 'Production\'da SUBSCRIPTION_GATE_ENABLED açıkça "true" ya da "false" olarak verilmeli',
      });
    }
    if (env.SUBSCRIPTION_GATE_ENABLED === "true") {
      if (!env.REVENUECAT_SECRET_API_KEY) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["REVENUECAT_SECRET_API_KEY"], message: "SUBSCRIPTION_GATE_ENABLED=true iken REVENUECAT_SECRET_API_KEY zorunlu" });
      }
      if (!env.MEDIA_URL_SIGNING_SECRET) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["MEDIA_URL_SIGNING_SECRET"], message: "SUBSCRIPTION_GATE_ENABLED=true iken MEDIA_URL_SIGNING_SECRET zorunlu" });
      }
    }
  })
  .transform((env) => ({ ...env, SUBSCRIPTION_GATE_ENABLED: env.SUBSCRIPTION_GATE_ENABLED ?? "false" }));

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: (env) => envSchema.parse(env),
    }),
    // SENTRY_DSN tanımsızken (local/test) instrument.ts'teki Sentry.init() zaten
    // no-op — bu modül de aynı şekilde koşulsuz import edilir, ekstra bir dallanma
    // gerekmez.
    SentryModule.forRoot(),
    DatabaseModule,
    AuthModule,
    UsersModule,
    VideosModule,
    QuizzesModule,
    WordsModule,
    FeedModule,
    ContentAdminModule,
  ],
  controllers: [AppController],
  // Global exception filter — istisnasız her route'ta (mevcut hiçbir
  // controller-scoped filter yok, tek istisna content-admin'in kendi
  // MulterUploadExceptionFilter'ı — o ayrı bir @UseFilters ile SADECE o
  // controller'a scope'lu, burayla çakışmaz) beklenmeyen hataları Sentry'ye
  // raporlayıp Nest'in normal HTTP exception davranışına (durum kodu/body)
  // aynen devam ediyor.
  providers: [{ provide: APP_FILTER, useClass: SentryGlobalFilter }],
})
export class AppModule implements NestModule {
  // Global request logging — her route'a (eşleşmeyen/404 dahil) uygulanıyor. Bkz.
  // request-logging.middleware.ts'teki yorum: middleware/interceptor kararı ve neden.
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(RequestLoggingMiddleware).forRoutes("*");
  }
}
