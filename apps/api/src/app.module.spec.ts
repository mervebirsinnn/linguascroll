import { ConfigModule, ConfigService } from "@nestjs/config";
import { Test } from "@nestjs/testing";
import { APP_FILTER } from "@nestjs/core";
import { SentryGlobalFilter, SentryModule } from "@sentry/nestjs/setup";
import { AppModule, envSchema } from "./app.module";

/**
 * Regresyon testi — R2 smoke test sırasında bulunan gerçek hata:
 * `.env` dosyasında bir R2_* değişkeni tanımlı olsa bile, envSchema onu
 * içermiyorsa Zod'un `.parse()`'ı sessizce atıyor, `@nestjs/config` da
 * `ConfigService`'in gördüğü değerleri process.env'e SADECE validate()'in
 * dönüş değerinden yazıyor (`assignVariablesToProcess`) — yani ConfigService.get()
 * o değişkeni hiçbir zaman bulamıyordu. İlk test bunu, fake bir ConfigService stub'ı
 * DEĞİL, gerçek Nest ConfigModule + gerçek envSchema zincirini çalıştırarak doğruluyor
 * ki bu etkileşim tekrar sessizce bozulursa (ör. biri ileride bir alanı yanlışlıkla
 * şemadan çıkarırsa) test kırmızı olsun.
 */
describe("app.module envSchema + ConfigModule entegrasyonu", () => {
  const REQUIRED_BASE_ENV = {
    DATABASE_URL: "postgres://user:pass@localhost:5432/db",
    FEED_CURSOR_SECRET: "a".repeat(32),
    FIREBASE_PROJECT_ID: "linguascroll-test",
  };

  it("R2_* değişkeni process.env'de tanımlıysa ConfigService bunu gerçekten görebiliyor", async () => {
    const previousValue = process.env.R2_BUCKET_NAME;
    process.env.R2_BUCKET_NAME = "regression-test-bucket";
    try {
      const moduleRef = await Test.createTestingModule({
        imports: [
          ConfigModule.forRoot({
            ignoreEnvFile: true,
            validate: (env) => envSchema.parse(env),
          }),
        ],
      }).compile();

      const configService = moduleRef.get(ConfigService);
      expect(configService.get<string>("R2_BUCKET_NAME")).toBe("regression-test-bucket");

      await moduleRef.close();
    } finally {
      if (previousValue === undefined) {
        delete process.env.R2_BUCKET_NAME;
      } else {
        process.env.R2_BUCKET_NAME = previousValue;
      }
    }
  });

  it("envSchema, R2_BUCKET_NAME tanımlıyken parse çıktısından ATMIYOR (regresyonun kök nedeni)", () => {
    const parsed = envSchema.parse({ ...REQUIRED_BASE_ENV, R2_BUCKET_NAME: "linguascroll-videos" });
    expect(parsed.R2_BUCKET_NAME).toBe("linguascroll-videos");
  });

  it("R2_* alanlarının hiçbiri tanımlı değilken envSchema.parse yine de BAŞARILI olur (boot-time zorunlu değil)", () => {
    expect(() => envSchema.parse(REQUIRED_BASE_ENV)).not.toThrow();
  });

  /**
   * Chunk 17C.1 — AYNI regresyonun ikinci, gerçek bir 502'ye yol açmış örneği:
   * `enrichment-llm-client.ts`'in doğrudan okuduğu `GEMINI_API_KEY`, envSchema'da
   * yer almadığı için process.env'e hiç ulaşmıyordu. Test değeri gerçek bir secret
   * DEĞİL — sabit, anlamsız bir test string'i (hiçbir çıktıya/log'a secret sızmıyor).
   */
  it("GEMINI_API_KEY tanımlıyken envSchema parse çıktısından ATMIYOR (Chunk 17C.1 regresyonunun kök nedeni)", () => {
    const parsed = envSchema.parse({ ...REQUIRED_BASE_ENV, GEMINI_API_KEY: "test-key-not-a-real-secret" });
    expect(parsed.GEMINI_API_KEY).toBe("test-key-not-a-real-secret");
  });

  it("GEMINI_API_KEY tanımlı değilken envSchema.parse yine de BAŞARILI olur (boot-time zorunlu değil)", () => {
    expect(() => envSchema.parse(REQUIRED_BASE_ENV)).not.toThrow();
  });

  /**
   * Deploy prep — CONTENT_ADMIN_SECRET, R2_* ve GEMINI_API_KEY alanlarıyla AYNI regresyona
   * (yukarıdaki yorumlar) açık: şemada yer almazsa ConfigService.get() onu hiçbir
   * zaman göremez, guard (content-admin-secret.guard.ts) her zaman fail-closed
   * davranır — yapılandırılmış bir secret'la bile.
   */
  it("CONTENT_ADMIN_SECRET tanımlıysa ConfigService bunu gerçekten görebiliyor", async () => {
    const previousValue = process.env.CONTENT_ADMIN_SECRET;
    process.env.CONTENT_ADMIN_SECRET = "regression-test-admin-secret";
    try {
      const moduleRef = await Test.createTestingModule({
        imports: [
          ConfigModule.forRoot({
            ignoreEnvFile: true,
            validate: (env) => envSchema.parse(env),
          }),
        ],
      }).compile();

      const configService = moduleRef.get(ConfigService);
      expect(configService.get<string>("CONTENT_ADMIN_SECRET")).toBe("regression-test-admin-secret");

      await moduleRef.close();
    } finally {
      if (previousValue === undefined) {
        delete process.env.CONTENT_ADMIN_SECRET;
      } else {
        process.env.CONTENT_ADMIN_SECRET = previousValue;
      }
    }
  });

  it("CONTENT_ADMIN_SECRET tanımlı değilken envSchema.parse yine de BAŞARILI olur (boot-time zorunlu değil)", () => {
    expect(() => envSchema.parse(REQUIRED_BASE_ENV)).not.toThrow();
  });

  /**
   * Deploy prep — PORT, Render gibi platformların process.env üzerinden enjekte
   * ettiği değer (bkz. main.ts). Sayısal bir string olarak gelir; `z.coerce.number()`
   * bunu gerçek bir `number`'a çeviriyor mu (main.ts'in `app.listen(port)`'a
   * doğrudan geçirebileceği şekilde) burada doğrulanıyor.
   */
  it("PORT sayısal bir string olarak tanımlıysa envSchema onu number'a coerce eder", () => {
    const parsed = envSchema.parse({ ...REQUIRED_BASE_ENV, PORT: "10000" });
    expect(parsed.PORT).toBe(10000);
  });

  it("PORT tanımlı değilken envSchema.parse yine de BAŞARILI olur (boot-time zorunlu değil, main.ts 3000'e düşer)", () => {
    const parsed = envSchema.parse(REQUIRED_BASE_ENV);
    expect(parsed.PORT).toBeUndefined();
  });

  it("PORT sayısal olmayan bir değerse envSchema.parse fail-fast ile FIRLATIR", () => {
    expect(() => envSchema.parse({ ...REQUIRED_BASE_ENV, PORT: "abc" })).toThrow();
  });

  /**
   * Sentry — R2_*, GEMINI_API_KEY ve CONTENT_ADMIN_SECRET ile AYNI regresyon şekli:
   * SENTRY_DSN şemada yer almazsa ConfigService.get() onu hiç göremez. instrument.ts
   * bu değeri ConfigService ÜZERİNDEN OKUMUYOR (process.env'den doğrudan okuyor,
   * bkz. o dosyadaki yorum) ama şemada yer alması yine de gerekli: aksi halde
   * .env/Render'da tanımlı olsa bile envSchema.parse() onu ATAR ve
   * assignVariablesToProcess onu process.env'e hiç YAZMAZ.
   */
  it("SENTRY_DSN geçerli bir URL ise envSchema parse çıktısından ATMIYOR", () => {
    const parsed = envSchema.parse({
      ...REQUIRED_BASE_ENV,
      SENTRY_DSN: "https://examplePublicKey@o0.ingest.sentry.io/0",
    });
    expect(parsed.SENTRY_DSN).toBe("https://examplePublicKey@o0.ingest.sentry.io/0");
  });

  it("SENTRY_DSN tanımlı değilken envSchema.parse yine de BAŞARILI olur (boot-time zorunlu değil)", () => {
    expect(() => envSchema.parse(REQUIRED_BASE_ENV)).not.toThrow();
  });

  it("SENTRY_DSN geçerli bir URL değilse envSchema.parse fail-fast ile FIRLATIR", () => {
    expect(() => envSchema.parse({ ...REQUIRED_BASE_ENV, SENTRY_DSN: "not-a-url" })).toThrow();
  });
});

/**
 * Sentry wiring — DB/HTTP bootstrap GEREKTİRMEDEN (bkz. testing conventions:
 * *.spec.ts = no DB), AppModule'ün @Module() metadata'sını doğrudan okuyarak
 * SentryModule'ün import edildiğini ve SentryGlobalFilter'ın global APP_FILTER
 * olarak kayıtlı olduğunu doğrular. Reflect-metadata polyfill'i zaten AppModule
 * import edilirken (yukarıdaki describe bloğu) global olarak kuruluyor.
 */
describe("app.module Sentry wiring", () => {
  it("SentryModule.forRoot() AppModule'ün imports listesinde yer alıyor", () => {
    const imports = (Reflect.getMetadata("imports", AppModule) ?? []) as unknown[];
    const sentryImport = imports.find(
      (imp): imp is { module: unknown } =>
        typeof imp === "object" && imp !== null && "module" in imp && (imp as { module: unknown }).module === SentryModule,
    );
    expect(sentryImport).toBeDefined();
  });

  it("SentryGlobalFilter global APP_FILTER olarak kayıtlı", () => {
    const providers = (Reflect.getMetadata("providers", AppModule) ?? []) as unknown[];
    expect(providers).toContainEqual({ provide: APP_FILTER, useClass: SentryGlobalFilter });
  });
});

describe("app.module envSchema — abonelik kapısı yapılandırması (2026-10-27)", () => {
  const BASE = { DATABASE_URL: "postgres://user:pass@localhost:5432/db", FEED_CURSOR_SECRET: "a".repeat(32), FIREBASE_PROJECT_ID: "linguascroll-test" };
  const GATE_ON_COMPLETE = {
    ...BASE,
    SUBSCRIPTION_GATE_ENABLED: "true",
    REVENUECAT_SECRET_API_KEY: "sk_test_not_real",
    MEDIA_URL_SIGNING_SECRET: "m".repeat(32),
  };

  it("local/test'te SUBSCRIPTION_GATE_ENABLED verilmezse \"false\"a düşer (kimse kilitlenmez)", () => {
    expect(envSchema.parse(BASE).SUBSCRIPTION_GATE_ENABLED).toBe("false");
  });

  it("production'da SUBSCRIPTION_GATE_ENABLED verilmezse boot fail-fast olur (sessiz sınırsız erişim yok)", () => {
    expect(() => envSchema.parse({ ...BASE, NODE_ENV: "production" })).toThrow(/SUBSCRIPTION_GATE_ENABLED/);
  });

  it("production'da açıkça \"false\" verilirse boot olur", () => {
    expect(envSchema.parse({ ...BASE, NODE_ENV: "production", SUBSCRIPTION_GATE_ENABLED: "false" }).SUBSCRIPTION_GATE_ENABLED).toBe("false");
  });

  it("kapı açıkken REVENUECAT_SECRET_API_KEY eksikse boot fail-fast olur", () => {
    const { REVENUECAT_SECRET_API_KEY: _omit, ...env } = GATE_ON_COMPLETE;
    expect(() => envSchema.parse(env)).toThrow(/REVENUECAT_SECRET_API_KEY/);
  });

  it("kapı açıkken MEDIA_URL_SIGNING_SECRET eksikse boot fail-fast olur (imzasız kalıcı URL hak kontrolünü deler)", () => {
    const { MEDIA_URL_SIGNING_SECRET: _omit, ...env } = GATE_ON_COMPLETE;
    expect(() => envSchema.parse(env)).toThrow(/MEDIA_URL_SIGNING_SECRET/);
  });

  it("kapı açık + tüm secret'lar tanımlıyken boot olur", () => {
    expect(envSchema.parse({ ...GATE_ON_COMPLETE, NODE_ENV: "production" }).SUBSCRIPTION_GATE_ENABLED).toBe("true");
  });

  it("MEDIA_URL_SIGNING_SECRET 32 karakterden kısaysa reddedilir", () => {
    expect(() => envSchema.parse({ ...BASE, MEDIA_URL_SIGNING_SECRET: "short" })).toThrow(/MEDIA_URL_SIGNING_SECRET/);
  });
});

describe("app.module envSchema — FIREBASE_PROJECT_ID (2026-10-27)", () => {
  it("tanımlı değilse boot fail-fast olur (hiçbir kullanıcı doğrulanamazdı)", () => {
    expect(() => envSchema.parse({ DATABASE_URL: "postgres://user:pass@localhost:5432/db", FEED_CURSOR_SECRET: "a".repeat(32) })).toThrow(/FIREBASE_PROJECT_ID/);
  });
});
