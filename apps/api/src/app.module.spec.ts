import { ConfigModule, ConfigService } from "@nestjs/config";
import { Test } from "@nestjs/testing";
import { envSchema } from "./app.module";

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
});
