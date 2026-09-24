import type { ConfigService } from "@nestjs/config";
import type { Video } from "@linguascroll/shared-types";
import { VideosService } from "./videos.service";
import type { VideosRepository } from "./videos-repository";

/**
 * Chunk 17D — R2/local playback branching'i (toPlayableVideo, module-private)
 * gerçek Nest DI/ConfigModule/dotenv'den TAMAMEN bağımsız test ediliyor —
 * r2-storage.service.spec.ts'teki `fakeConfigService` deseninin AYNISI. Gerçek
 * bir e2e (AppModule + gerçek .env) denemesi burada BİLİNÇLİ OLARAK YOK: bu
 * repodaki ConfigModule/dotenv, aynı Jest process'i içinde art arda derlenen
 * birden fazla `Test.createTestingModule` çağrısı arasında env değerlerini
 * kalıcı/paylaşılan şekilde önbelleğe alıyor — bu yüzden bir testin
 * `process.env.R2_PUBLIC_BASE_URL`'i request'ten ÖNCE override etmesi güvenilir
 * değil (gerçek .env'deki değerle üzerine yazılabiliyor, gözlemlendi). Doğrudan
 * `new VideosService(...)` ile bu belirsizlik yapısal olarak ortadan kalkıyor.
 */
function fakeConfigService(env: Record<string, string | undefined>): ConfigService {
  return {
    getOrThrow: (key: string) => {
      const value = env[key];
      if (!value) {
        throw new Error(`"${key}" tanımlı değil`);
      }
      return value;
    },
    get: (key: string) => env[key],
  } as unknown as ConfigService;
}

function fakeVideosRepository(videos: Video[]): VideosRepository {
  return { findVideos: jest.fn().mockResolvedValue(videos) } as unknown as VideosRepository;
}

const BASE_VIDEO: Video = {
  id: "00000000-0000-4000-8000-000000000001",
  learningLanguage: "en",
  cefrLevel: "B1",
  muxAssetId: "local-ordering-food",
  storageKey: null,
  topic: "travel",
  durationMs: 5000,
};

function buildService(videos: Video[], env: Record<string, string | undefined>): VideosService {
  return new VideosService(
    fakeVideosRepository(videos),
    undefined as unknown as ConstructorParameters<typeof VideosService>[1],
    undefined as unknown as ConstructorParameters<typeof VideosService>[2],
    undefined as unknown as ConstructorParameters<typeof VideosService>[3],
    fakeConfigService(env),
  );
}

describe("VideosService.getVideoFeed — playback URL çözümü (Chunk 17D)", () => {
  it("storageKey null İSE mevcut resolvePlaybackUrl(muxAssetId, mediaBaseUrl) davranışını kullanır (regresyon)", async () => {
    const service = buildService([BASE_VIDEO], { PUBLIC_MEDIA_BASE_URL: "http://localhost:3000" });

    const [video] = await service.getVideoFeed();

    expect(video?.playbackUrl).toBe("http://localhost:3000/media/ordering-food.mp4");
  });

  it("storageKey DOLU İSE R2_PUBLIC_BASE_URL + storageKey'e çözer, mediaBaseUrl/muxAssetId'yi KULLANMAZ", async () => {
    const service = buildService(
      [{ ...BASE_VIDEO, storageKey: "originals/a1final1/9f8e7d6c-uuid.mp4" }],
      { PUBLIC_MEDIA_BASE_URL: "http://localhost:3000", R2_PUBLIC_BASE_URL: "https://media.example.com" },
    );

    const [video] = await service.getVideoFeed();

    expect(video?.playbackUrl).toBe("https://media.example.com/originals/a1final1/9f8e7d6c-uuid.mp4");
  });

  it("storageKey DOLU ama R2_PUBLIC_BASE_URL tanımlı DEĞİLSE açıkça throw eder (sessizce yanlış/eksik URL üretmez)", async () => {
    const service = buildService(
      [{ ...BASE_VIDEO, storageKey: "originals/a1final1/uuid.mp4" }],
      { PUBLIC_MEDIA_BASE_URL: "http://localhost:3000" }, // R2_PUBLIC_BASE_URL YOK
    );

    await expect(service.getVideoFeed()).rejects.toThrow(/R2_PUBLIC_BASE_URL tanımlı değil/);
  });

  it("API leakage: dönen PlayableVideo'da ne muxAssetId ne storageKey anahtarı bulunur", async () => {
    const service = buildService(
      [{ ...BASE_VIDEO, storageKey: "originals/a1final1/uuid.mp4" }],
      { PUBLIC_MEDIA_BASE_URL: "http://localhost:3000", R2_PUBLIC_BASE_URL: "https://media.example.com" },
    );

    const [video] = await service.getVideoFeed();

    expect(video).not.toHaveProperty("muxAssetId");
    expect(video).not.toHaveProperty("storageKey");
    expect(video?.playbackUrl).toEqual(expect.any(String));
  });
});
