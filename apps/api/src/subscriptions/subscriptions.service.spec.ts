import type { ConfigService } from "@nestjs/config";
import type { UsersService } from "../users/users.service";
import type { VideosService } from "../videos/videos.service";
import type { RevenueCatClient } from "./revenue-cat-client";
import { SubscriptionsService } from "./subscriptions.service";

const USER_ID = "00000000-0000-4000-8000-000000000001";

function makeService(overrides: {
  createdAt?: Date | null;
  isSubscribed?: boolean;
  watchedToday?: number;
  onCheckEntitlement?: () => void;
  gateEnabled?: boolean;
} = {}): SubscriptionsService {
  const usersService = {
    getCreatedAt: () => Promise.resolve(overrides.createdAt ?? new Date(0)),
  } as unknown as UsersService;

  const videosService = {
    countDistinctVideosWatchedByUserSince: () => Promise.resolve(overrides.watchedToday ?? 0),
  } as unknown as VideosService;

  const revenueCatClient = {
    checkEntitlement: () => {
      overrides.onCheckEntitlement?.();
      return Promise.resolve(overrides.isSubscribed ?? false);
    },
  } as unknown as RevenueCatClient;

  const configService = {
    get: (key: string) => (key === "SUBSCRIPTION_GATE_ENABLED" ? String(overrides.gateEnabled ?? true) : undefined),
  } as unknown as ConfigService;

  return new SubscriptionsService(usersService, videosService, revenueCatClient, configService);
}

describe("SubscriptionsService.getPaywallGate", () => {
  it("SUBSCRIPTION_GATE_ENABLED kapalıyken (varsayılan) limit aşılmış olsa bile ASLA gated olmaz ve RevenueCat'e hiç gidilmez", async () => {
    const onCheckEntitlement = jest.fn();
    const service = makeService({
      createdAt: new Date(Date.now() - 48 * 60 * 60 * 1000),
      watchedToday: 100,
      onCheckEntitlement,
      gateEnabled: false,
    });

    expect((await service.getPaywallGate(USER_ID)).gated).toBe(false);
    expect(onCheckEntitlement).not.toHaveBeenCalled();
  });

  it("hesap ilk 24 saat içindeyse ASLA gated olmaz — izleme sayısı/abonelik hiç kontrol edilmez", async () => {
    const onCheckEntitlement = jest.fn();
    const service = makeService({ createdAt: new Date(Date.now() - 60 * 60 * 1000), watchedToday: 100, onCheckEntitlement });

    const gate = await service.getPaywallGate(USER_ID);

    expect(gate.gated).toBe(false);
    expect(onCheckEntitlement).not.toHaveBeenCalled();
  });

  it("24 saatten eski bir hesap, abone DEĞİLSE ve günlük limitin (10) ALTINDAYSA gated olmaz", async () => {
    const service = makeService({ createdAt: new Date(Date.now() - 48 * 60 * 60 * 1000), isSubscribed: false, watchedToday: 9 });
    expect((await service.getPaywallGate(USER_ID)).gated).toBe(false);
  });

  it("24 saatten eski bir hesap, abone DEĞİLSE ve günlük limite ULAŞMIŞSA (>=10) gated olur", async () => {
    const service = makeService({ createdAt: new Date(Date.now() - 48 * 60 * 60 * 1000), isSubscribed: false, watchedToday: 10 });
    expect((await service.getPaywallGate(USER_ID)).gated).toBe(true);
  });

  it("24 saatten eski bir hesap ama ABONEYSE, günlük izleme sayısı limiti aşsa bile gated OLMAZ", async () => {
    const service = makeService({ createdAt: new Date(Date.now() - 48 * 60 * 60 * 1000), isSubscribed: true, watchedToday: 999 });
    expect((await service.getPaywallGate(USER_ID)).gated).toBe(false);
  });

  it("RevenueCat entitlement kontrolü, AYNI userId için kısa sürede tekrar çağrılmaz (cache)", async () => {
    const onCheckEntitlement = jest.fn();
    const service = makeService({
      createdAt: new Date(Date.now() - 48 * 60 * 60 * 1000),
      isSubscribed: true,
      onCheckEntitlement,
    });

    await service.getPaywallGate(USER_ID);
    await service.getPaywallGate(USER_ID);

    expect(onCheckEntitlement).toHaveBeenCalledTimes(1);
  });

  it("kullanıcı bulunamazsa (createdAt null) fail-safe: gated olmaz (FeedService zaten userExists'i ayrıca kontrol ediyor)", async () => {
    const service = makeService({ createdAt: null });
    expect((await service.getPaywallGate(USER_ID)).gated).toBe(false);
  });
});
