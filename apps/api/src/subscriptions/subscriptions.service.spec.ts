import type { ConfigService } from "@nestjs/config";
import type { VideosService } from "../videos/videos.service";
import type { RevenueCatClient } from "./revenue-cat-client";
import { SubscriptionsService } from "./subscriptions.service";

const USER_ID = "00000000-0000-4000-8000-000000000001";

function makeService(overrides: {
  isSubscribed?: boolean;
  watchedToday?: number;
  onCheckEntitlement?: () => void;
  gateEnabled?: boolean;
} = {}): SubscriptionsService {
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

  return new SubscriptionsService(videosService, revenueCatClient, configService);
}

describe("SubscriptionsService.getPaywallGate", () => {
  it("SUBSCRIPTION_GATE_ENABLED kapalıyken (varsayılan) limit aşılmış olsa bile ASLA gated olmaz ve RevenueCat'e hiç gidilmez", async () => {
    const onCheckEntitlement = jest.fn();
    const service = makeService({ watchedToday: 100, onCheckEntitlement, gateEnabled: false });

    expect((await service.getPaywallGate(USER_ID)).gated).toBe(false);
    expect(onCheckEntitlement).not.toHaveBeenCalled();
  });

  it("abone DEĞİLSE ve günlük limitin (10) ALTINDAYSA gated olmaz — hesabın ilk gününde de aynı kural", async () => {
    const service = makeService({ isSubscribed: false, watchedToday: 9 });
    expect((await service.getPaywallGate(USER_ID)).gated).toBe(false);
  });

  it("abone DEĞİLSE ve günlük limite ULAŞMIŞSA (>=10) gated olur — ilk gün bedava istisnası YOK", async () => {
    const service = makeService({ isSubscribed: false, watchedToday: 10 });
    expect((await service.getPaywallGate(USER_ID)).gated).toBe(true);
  });

  it("ABONEYSE, günlük izleme sayısı limiti aşsa bile gated OLMAZ", async () => {
    const service = makeService({ isSubscribed: true, watchedToday: 999 });
    expect((await service.getPaywallGate(USER_ID)).gated).toBe(false);
  });

  it("'abone DEĞİL' sonucu kısa süre (15s) önbelleklenir: satın alan kullanıcı uzun süre kilitli kalmaz, 'abone' ise 5 dk önbellekte kalır", async () => {
    const realNow = Date.now();
    const nowSpy = jest.spyOn(Date, "now");
    try {
      nowSpy.mockReturnValue(realNow);
      const notSubscribedChecks = jest.fn();
      const notSubscribed = makeService({ isSubscribed: false, watchedToday: 100, onCheckEntitlement: notSubscribedChecks });
      await notSubscribed.getPaywallGate(USER_ID);
      nowSpy.mockReturnValue(realNow + 10_000);
      await notSubscribed.getPaywallGate(USER_ID);
      expect(notSubscribedChecks).toHaveBeenCalledTimes(1); // 10s: hâlâ önbellekte
      nowSpy.mockReturnValue(realNow + 16_000);
      await notSubscribed.getPaywallGate(USER_ID);
      expect(notSubscribedChecks).toHaveBeenCalledTimes(2); // 16s: süre doldu, yeniden sorgulandı

      nowSpy.mockReturnValue(realNow);
      const subscribedChecks = jest.fn();
      const subscribed = makeService({ isSubscribed: true, onCheckEntitlement: subscribedChecks });
      await subscribed.getPaywallGate(USER_ID);
      nowSpy.mockReturnValue(realNow + 60_000);
      await subscribed.getPaywallGate(USER_ID);
      expect(subscribedChecks).toHaveBeenCalledTimes(1); // 60s: abone sonucu hâlâ önbellekte
    } finally {
      nowSpy.mockRestore();
    }
  });

  it("RevenueCat entitlement kontrolü, AYNI userId için kısa sürede tekrar çağrılmaz (cache)", async () => {
    const onCheckEntitlement = jest.fn();
    const service = makeService({ isSubscribed: true, onCheckEntitlement });

    await service.getPaywallGate(USER_ID);
    await service.getPaywallGate(USER_ID);

    expect(onCheckEntitlement).toHaveBeenCalledTimes(1);
  });
});
