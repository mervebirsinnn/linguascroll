import { ContentAdminController } from "./content-admin.controller";
import type { ContentAdminService } from "./content-admin.service";
import type { EnrichmentProcessingService } from "./enrichment-processing.service";
import type { PublishProcessingService } from "./publish-processing.service";
import type { SttProcessingService } from "./stt-processing.service";

// GEÇİCİ test — controller.ts'teki "sentry-test" endpoint'inin (bkz. o dosyadaki
// yorum) gerçekten bir Error fırlattığını doğrular. Diğer 4 constructor
// dependency'si bu endpoint tarafından hiç kullanılmıyor, gerçek implementasyonları
// GEREKMİYOR (ContentAdminService.spec.ts'teki AYNI "fake/cast" deseni).
describe("ContentAdminController.sentryTest", () => {
  it('"Looplish Sentry production test" mesajlı bir Error fırlatır', () => {
    const controller = new ContentAdminController(
      {} as unknown as ContentAdminService,
      {} as unknown as SttProcessingService,
      {} as unknown as EnrichmentProcessingService,
      {} as unknown as PublishProcessingService,
    );

    expect(() => controller.sentryTest()).toThrow(new Error("Looplish Sentry production test"));
  });
});
