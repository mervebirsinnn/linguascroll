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
} = {}) {
  const ledger = overrides.ledger ?? makeLedger();
  const videosService = {
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
    get: (key: string) => (key === "SUBSCRIPTION_GATE_ENABLED" ? String(overrides.gateEnabled ?? true) : undefined),
  } as unknown as ConfigService;

  return { service: new SubscriptionsService(videosService, usersService, ledger.repository, revenueCatClient, configService), ledger };
}

const videoIds = (count: number, prefix = "v") => Array.from({ length: count }, (_, i) => `${prefix}${i + 1}`);

describe("SubscriptionsService.requestPlaybackAccess", () => {
  it("ilk 10 farklı video açılır, 11. paywall döner", async () => {
    const { service } = makeService();
    for (const id of videoIds(FREE_VIDEO_CAP)) {
      expect(await service.requestPlaybackAccess(USER_ID, id)).toEqual({ status: "granted", playbackUrl: PLAYBACK_URL });
    }
    expect(await service.requestPlaybackAccess(USER_ID, "v11")).toEqual({ status: "paywall" });
  });

  it("hak bittikten sonra daha önce açılmış bir video yeniden açılabilir (aynı video hak tüketmez)", async () => {
    const ledger = makeLedger(videoIds(FREE_VIDEO_CAP));
    const { service } = makeService({ ledger });
    expect((await service.requestPlaybackAccess(USER_ID, "v3")).status).toBe("granted");
    expect(ledger.granted.size).toBe(FREE_VIDEO_CAP);
  });

  it("aktif abone sınırsız erişir ve deftere hiç yazılmaz", async () => {
    const ledger = makeLedger(videoIds(FREE_VIDEO_CAP));
    const { service } = makeService({ isSubscribed: true, ledger });
    expect((await service.requestPlaybackAccess(USER_ID, "v99")).status).toBe("granted");
    expect(ledger.tryGrantCalls).toEqual([]);
  });

  it("abonelik bitince tüketilmiş haklar sıfırlanmaz", async () => {
    let subscribed = true;
    const ledger = makeLedger(videoIds(FREE_VIDEO_CAP));
    const { service } = makeService({ isSubscribed: () => subscribed, ledger });
    expect((await service.requestPlaybackAccess(USER_ID, "v50")).status).toBe("granted");

    subscribed = false;
    await service.refreshSubscription(USER_ID);
    expect(await service.requestPlaybackAccess(USER_ID, "v51")).toEqual({ status: "paywall" });
  });

  it("kapı kapalıyken herkes erişir, RevenueCat'e gidilmez ve deftere yazılmaz", async () => {
    let entitlementChecks = 0;
    const ledger = makeLedger(videoIds(FREE_VIDEO_CAP));
    const { service } = makeService({ gateEnabled: false, ledger, onCheckEntitlement: () => entitlementChecks++ });
    expect((await service.requestPlaybackAccess(USER_ID, "v11")).status).toBe("granted");
    expect(entitlementChecks).toBe(0);
    expect(ledger.tryGrantCalls).toEqual([]);
  });

  it("video yoksa 404, kullanıcı yoksa 400 — hak tüketilmez", async () => {
    const missingVideo = makeService({ videoExists: false });
    await expect(missingVideo.service.requestPlaybackAccess(USER_ID, VIDEO_ID)).rejects.toThrow(NotFoundException);
    expect(missingVideo.ledger.tryGrantCalls).toEqual([]);

    const missingUser = makeService({ userExists: false });
    await expect(missingUser.service.requestPlaybackAccess(USER_ID, VIDEO_ID)).rejects.toThrow(BadRequestException);
    expect(missingUser.ledger.tryGrantCalls).toEqual([]);
  });
});

describe("SubscriptionsService.refreshSubscription", () => {
  it("önbelleği atlar: 'abone değil' önbellekteyken satın alma sonrası refresh erişimi hemen açar", async () => {
    let subscribed = false;
    const ledger = makeLedger(videoIds(FREE_VIDEO_CAP));
    const { service } = makeService({ isSubscribed: () => subscribed, ledger });
    expect(await service.requestPlaybackAccess(USER_ID, "v11")).toEqual({ status: "paywall" });

    subscribed = true; // RevenueCat satın almayı kaydetti
    expect(await service.refreshSubscription(USER_ID)).toEqual({ active: true });
    expect((await service.requestPlaybackAccess(USER_ID, "v11")).status).toBe("granted");
  });

  it("başarısız/iptal edilmiş satın alma (RevenueCat'te entitlement yok) erişim açmaz", async () => {
    const ledger = makeLedger(videoIds(FREE_VIDEO_CAP));
    const { service } = makeService({ isSubscribed: false, ledger });
    expect(await service.refreshSubscription(USER_ID)).toEqual({ active: false });
    expect(await service.requestPlaybackAccess(USER_ID, "v11")).toEqual({ status: "paywall" });
  });

  it("kullanıcı yoksa 400", async () => {
    const { service } = makeService({ userExists: false });
    await expect(service.refreshSubscription(USER_ID)).rejects.toThrow(BadRequestException);
  });
});

describe("SubscriptionsService.getFeedAllowance", () => {
  it("kapı kapalı ya da abone → sınırsız", async () => {
    expect(await makeService({ gateEnabled: false }).service.getFeedAllowance(USER_ID, ["v1"])).toEqual({ unlimited: true });
    expect(await makeService({ isSubscribed: true }).service.getFeedAllowance(USER_ID, ["v1"])).toEqual({ unlimited: true });
  });

  it("bütçe = 10 − KALICI tüketim; açılmış videolar ayrıca işaretlenir", async () => {
    const { service } = makeService({ ledger: makeLedger(["v1", "v2", "v3"]) });
    const allowance = await service.getFeedAllowance(USER_ID, ["v1", "v4"]);
    expect(allowance).toEqual({ unlimited: false, grantedVideoIds: new Set(["v1"]), newVideoBudget: 7 });
  });

  it("gösterilip açılmamış videolar bütçeden düşülmez (prefetch/yarıda bırakılan sayfa erken kilitlemez)", async () => {
    // Bir önceki sayfada 10 yeni video GÖSTERİLDİ ama hiçbiri açılmadı: defter boş → bütçe hâlâ 10.
    const { service } = makeService({ ledger: makeLedger([]) });
    expect(await service.getFeedAllowance(USER_ID, ["v11", "v12"])).toMatchObject({ unlimited: false, newVideoBudget: 10 });
  });

  it("bütçe negatife düşmez", async () => {
    const { service } = makeService({ ledger: makeLedger(videoIds(FREE_VIDEO_CAP)) });
    expect(await service.getFeedAllowance(USER_ID, ["v11"])).toMatchObject({ newVideoBudget: 0 });
  });
});

describe("SubscriptionsService abonelik önbelleği", () => {
  it("'abone değil' kısa süre önbelleklenir: art arda isteklerde RevenueCat'e tekrar gidilmez", async () => {
    let checks = 0;
    const { service } = makeService({ isSubscribed: false, onCheckEntitlement: () => checks++ });
    await service.requestPlaybackAccess(USER_ID, "v1");
    await service.requestPlaybackAccess(USER_ID, "v2");
    expect(checks).toBe(1);
  });
});
