import { BadRequestException, NotFoundException } from "@nestjs/common";
import type { ConfigService } from "@nestjs/config";
import type { PlayableVideo } from "@linguascroll/shared-types";
import type { UsersService } from "../users/users.service";
import type { VideosService } from "../videos/videos.service";
import type { FreeGrantResult, FreeVideoGrantsRepository } from "./free-video-grants-repository";
import type { RevenueCatClient } from "./revenue-cat-client";
import { FREE_VIDEO_CAP, SubscriptionsService } from "./subscriptions.service";

const USER_ID = "00000000-0000-4000-8000-000000000001";
const VIDEO_ID = "00000000-0000-4000-8000-0000000000a1";
const PLAYBACK_URL = "https://media.example.com/a.mp4?exp=1&sig=x";

/**
 * Defterin (free_video_grants) bellek-içi karşılığı — atomiklik/eşzamanlılık burada DEĞİL,
 * gerçek Postgres'e karşı free-video-grants-repository.integration.spec.ts'te test ediliyor.
 * Bu dosya SADECE service'in karar mantığını sınıyor.
 */
function makeLedger(initialGranted: string[] = []) {
  const granted = new Set(initialGranted);
  const tryGrantCalls: string[] = [];
  const repository = {
    getOrCreatePreview: async () => new Set(Array.from({length: 10}, (_, i) => `v${i+1}`)),
    tryGrant: (_userId: string, videoId: string, cap: number): Promise<FreeGrantResult> => {
      tryGrantCalls.push(videoId);
      if (granted.has(videoId)) return Promise.resolve("already-granted");
      if (granted.size >= cap) return Promise.resolve("exhausted");
      granted.add(videoId);
      return Promise.resolve("granted");
    },
    getUsage: (_userId: string, candidates: readonly string[]) =>
      Promise.resolve({ consumed: granted.size, grantedVideoIds: new Set(candidates.filter((id) => granted.has(id))) }),
  } as unknown as FreeVideoGrantsRepository;
  return { repository, granted, tryGrantCalls };
}

function makeService(overrides: {
  isSubscribed?: boolean | (() => boolean);
  gateEnabled?: boolean;
  userExists?: boolean;
  videoExists?: boolean;
  ledger?: ReturnType<typeof makeLedger>;
  onCheckEntitlement?: () => void;
  gatePlatforms?: string;
} = {}) {
  const ledger = overrides.ledger ?? makeLedger();
  const videosService = {
    getVideoFeed: async () => Array.from({length: 15}, (_, i) => ({id: `v${i+1}`, playbackUrl: PLAYBACK_URL})),
    getPlayableVideoById: (id: string) =>
      Promise.resolve(overrides.videoExists === false ? null : ({ id, playbackUrl: PLAYBACK_URL } as unknown as PlayableVideo)),
  } as unknown as VideosService;
  const usersService = { userExists: () => Promise.resolve(overrides.userExists ?? true) } as unknown as UsersService;
  const revenueCatClient = {
    readSubscription: async () => ({ active: typeof overrides.isSubscribed === "function" ? overrides.isSubscribed() : overrides.isSubscribed ?? false, expiresAt: null }),
    checkEntitlement: () => {
      overrides.onCheckEntitlement?.();
      const value = overrides.isSubscribed;
      return Promise.resolve(typeof value === "function" ? value() : (value ?? false));
    },
  } as unknown as RevenueCatClient;
  const configService = {
    get: (key: string) =>
      key === "SUBSCRIPTION_GATE_ENABLED" ? String(overrides.gateEnabled ?? true) : key === "SUBSCRIPTION_GATE_PLATFORMS" ? overrides.gatePlatforms : undefined,
  } as unknown as ConfigService;

  return { service: new SubscriptionsService(videosService, usersService, ledger.repository, revenueCatClient, configService), ledger };
}

const videoIds = (count: number, prefix = "v") => Array.from({ length: count }, (_, i) => `${prefix}${i + 1}`);

describe("SubscriptionsService.requestPlaybackAccess", () => {
  it("ilk 10 farklı video açılır, 11. paywall döner", async () => {
    const { service } = makeService();
    for (const id of videoIds(FREE_VIDEO_CAP)) {
      expect(await service.requestPlaybackAccess(USER_ID, null, id)).toEqual({ status: "granted", playbackUrl: PLAYBACK_URL });
    }
    expect(await service.requestPlaybackAccess(USER_ID, null, "v11")).toEqual({ status: "paywall" });
  });

  it("hak bittikten sonra daha önce açılmış bir video yeniden açılabilir (aynı video hak tüketmez)", async () => {
    const ledger = makeLedger(videoIds(FREE_VIDEO_CAP));
    const { service } = makeService({ ledger });
    expect((await service.requestPlaybackAccess(USER_ID, null, "v3")).status).toBe("granted");
    expect(ledger.granted.size).toBe(FREE_VIDEO_CAP);
  });

  it("aktif abone sınırsız erişir ve deftere hiç yazılmaz", async () => {
    const ledger = makeLedger(videoIds(FREE_VIDEO_CAP));
    const { service } = makeService({ isSubscribed: true, ledger });
    expect((await service.requestPlaybackAccess(USER_ID, null, "v99")).status).toBe("granted");
    expect(ledger.tryGrantCalls).toEqual([]);
  });

  it("abonelik bitince tüketilmiş haklar sıfırlanmaz", async () => {
    let subscribed = true;
    const ledger = makeLedger(videoIds(FREE_VIDEO_CAP));
    const { service } = makeService({ isSubscribed: () => subscribed, ledger });
    expect((await service.requestPlaybackAccess(USER_ID, null, "v50")).status).toBe("granted");

    subscribed = false;
    await service.refreshSubscription(USER_ID);
    expect(await service.requestPlaybackAccess(USER_ID, null, "v51")).toEqual({ status: "paywall" });
  });

  it("kapı kapalıyken herkes erişir, RevenueCat'e gidilmez ve deftere yazılmaz", async () => {
    let entitlementChecks = 0;
    const ledger = makeLedger(videoIds(FREE_VIDEO_CAP));
    const { service } = makeService({ gateEnabled: false, ledger, onCheckEntitlement: () => entitlementChecks++ });
    expect((await service.requestPlaybackAccess(USER_ID, null, "v11")).status).toBe("granted");
    expect(entitlementChecks).toBe(0);
    expect(ledger.tryGrantCalls).toEqual([]);
  });

  it("video yoksa 404, kullanıcı yoksa 400 — hak tüketilmez", async () => {
    const missingVideo = makeService({ videoExists: false });
    await expect(missingVideo.service.requestPlaybackAccess(USER_ID, null, VIDEO_ID)).rejects.toThrow(NotFoundException);
    expect(missingVideo.ledger.tryGrantCalls).toEqual([]);

    const missingUser = makeService({ userExists: false });
    await expect(missingUser.service.requestPlaybackAccess(USER_ID, null, VIDEO_ID)).rejects.toThrow(BadRequestException);
    expect(missingUser.ledger.tryGrantCalls).toEqual([]);
  });
});

describe("SubscriptionsService.refreshSubscription", () => {
  it("önbelleği atlar: 'abone değil' önbellekteyken satın alma sonrası refresh erişimi hemen açar", async () => {
    let subscribed = false;
    const ledger = makeLedger(videoIds(FREE_VIDEO_CAP));
    const { service } = makeService({ isSubscribed: () => subscribed, ledger });
    expect(await service.requestPlaybackAccess(USER_ID, null, "v11")).toEqual({ status: "paywall" });

    subscribed = true; // RevenueCat satın almayı kaydetti
    expect(await service.refreshSubscription(USER_ID)).toEqual({ active: true });
    expect((await service.requestPlaybackAccess(USER_ID, null, "v11")).status).toBe("granted");
  });

  it("başarısız/iptal edilmiş satın alma (RevenueCat'te entitlement yok) erişim açmaz", async () => {
    const ledger = makeLedger(videoIds(FREE_VIDEO_CAP));
    const { service } = makeService({ isSubscribed: false, ledger });
    expect(await service.refreshSubscription(USER_ID)).toEqual({ active: false });
    expect(await service.requestPlaybackAccess(USER_ID, null, "v11")).toEqual({ status: "paywall" });
  });

  it("kullanıcı yoksa 400", async () => {
    const { service } = makeService({ userExists: false });
    await expect(service.refreshSubscription(USER_ID)).rejects.toThrow(BadRequestException);
  });
});

describe("SubscriptionsService.getFeedAllowance", () => {
  it("kapı kapalı ya da abone → sınırsız", async () => {
    expect(await makeService({ gateEnabled: false }).service.getFeedAllowance(USER_ID, null, ["v1"])).toEqual({ unlimited: true });
    expect(await makeService({ isSubscribed: true }).service.getFeedAllowance(USER_ID, null, ["v1"])).toEqual({ unlimited: true });
  });

  it("önceki tüketimden bağımsız sabit seçkiye erişim verir; yeni hak tüketmez", async () => {
    const { service } = makeService({ ledger: makeLedger(["v1", "v2", "v3"]) });
    expect(await service.getFeedAllowance(USER_ID, null, ["v1", "v11"])).toEqual({
      unlimited: false, grantedVideoIds: new Set(videoIds(10)), newVideoBudget: 0,
    });
  });
});

describe("SubscriptionsService.getFeedAllowance — izole kategori (Cabin Crew)", () => {
  it("ücretsiz seçki katalogu ana akıştan istenir: cabincrew hak havuzuna girmez", async () => {
    const filters: unknown[] = [];
    const videosService = {
      getVideoFeed: async (filter: unknown) => {
        filters.push(filter);
        return videoIds(15).map((id) => ({ id, playbackUrl: PLAYBACK_URL }));
      },
    } as unknown as VideosService;
    const service = new SubscriptionsService(
      videosService,
      { userExists: () => Promise.resolve(true) } as unknown as UsersService,
      makeLedger().repository,
      { checkEntitlement: () => Promise.resolve(false) } as unknown as RevenueCatClient,
      { get: (key: string) => (key === "SUBSCRIPTION_GATE_ENABLED" ? "true" : undefined) } as unknown as ConfigService,
    );
    await service.getFeedAllowance(USER_ID, null, ["v1"]);
    expect(filters).toEqual([{ excludeCategories: ["cabincrew"] }]);
  });
});

describe("SubscriptionsService abonelik önbelleği", () => {
  it("'abone değil' kısa süre önbelleklenir: art arda isteklerde RevenueCat'e tekrar gidilmez", async () => {
    let checks = 0;
    const { service } = makeService({ isSubscribed: false, onCheckEntitlement: () => checks++ });
    await service.requestPlaybackAccess(USER_ID, null, "v1");
    await service.requestPlaybackAccess(USER_ID, null, "v2");
    expect(checks).toBe(1);
  });
});

describe("SubscriptionsService.hasFullAccess (okuma pratiği erişim kararı)", () => {
  it("kapı kapalıyken herkes tam erişimli ve RevenueCat'e hiç gidilmez", async () => {
    let entitlementChecks = 0;
    const { service } = makeService({ gateEnabled: false, onCheckEntitlement: () => (entitlementChecks += 1) });
    expect(await service.hasFullAccess(USER_ID, null)).toBe(true);
    expect(entitlementChecks).toBe(0);
  });

  it("kapı açık + aktif abone → tam erişim", async () => {
    const { service } = makeService({ gateEnabled: true, isSubscribed: true });
    expect(await service.hasFullAccess(USER_ID, null)).toBe(true);
  });

  it("kapı açık + abone değil → tam erişim yok; ücretsiz hak defterine (free_video_grants) dokunulmaz", async () => {
    const ledger = makeLedger();
    const { service } = makeService({ gateEnabled: true, isSubscribed: false, ledger });
    expect(await service.hasFullAccess(USER_ID, null)).toBe(false);
    expect(ledger.tryGrantCalls).toEqual([]);
    expect(ledger.granted.size).toBe(0);
  });
});

// 2026-11-22 — platforma göre kapı: global şalter kapalı, SUBSCRIPTION_GATE_PLATFORMS="ios".
describe("SubscriptionsService — platforma göre kapı (yalnız iOS)", () => {
  const iosOnly = () => makeService({ gateEnabled: false, gatePlatforms: "ios", isSubscribed: false });

  it("iOS: 10 ücretsiz video, 11. video paywall; Android ve bilinmeyen platform sınırsız", async () => {
    const { service } = iosOnly();
    for (let i = 1; i <= 10; i += 1) expect((await service.requestPlaybackAccess(USER_ID, "ios", `v${i}`)).status).toBe("granted");
    expect(await service.requestPlaybackAccess(USER_ID, "ios", "v11")).toEqual({ status: "paywall" });
    expect((await service.requestPlaybackAccess(USER_ID, "android", "v11")).status).toBe("granted");
    expect((await service.requestPlaybackAccess(USER_ID, null, "v11")).status).toBe("granted");
  });

  it("Android isteği ücretsiz hak defterine hiç yazmaz ve RevenueCat'e gitmez", async () => {
    let entitlementChecks = 0;
    const ledger = makeLedger();
    const { service } = makeService({ gateEnabled: false, gatePlatforms: "ios", ledger, onCheckEntitlement: () => (entitlementChecks += 1) });
    expect(await service.getFeedAllowance(USER_ID, "android", ["v1"])).toEqual({ unlimited: true });
    expect(await service.hasFullAccess(USER_ID, "android")).toBe(true);
    expect(ledger.granted.size).toBe(0);
    expect(entitlementChecks).toBe(0);
  });

  it("iOS'ta Premium (backend doğrulaması) sınırsız açar; başlık Premium'u taklit edemez", async () => {
    const subscribed = makeService({ gateEnabled: false, gatePlatforms: "ios", isSubscribed: true });
    expect((await subscribed.service.requestPlaybackAccess(USER_ID, "ios", "v11")).status).toBe("granted");
    expect(await subscribed.service.hasFullAccess(USER_ID, "ios")).toBe(true);
    const { service } = iosOnly();
    expect(await service.hasFullAccess(USER_ID, "ios")).toBe(false);
  });

  it("global şalter açıkken platformdan bağımsız herkes kapılı (bugünkü davranış)", async () => {
    const { service } = makeService({ gateEnabled: true, isSubscribed: false });
    expect(await service.hasFullAccess(USER_ID, "android")).toBe(false);
    expect(await service.hasFullAccess(USER_ID, null)).toBe(false);
  });
});

