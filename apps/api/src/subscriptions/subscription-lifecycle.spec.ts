import { parseSubscription, RevenueCatClient } from "./revenue-cat-client";
import type { ConfigService } from "@nestjs/config";
const future = "2099-01-01T00:00:00.000Z";
const body = (extra = {}) => ({ subscriber: { entitlements: { premium: { expires_date: future, product_identifier: "monthly" } }, subscriptions: { monthly: extra } } });
it("iptal sonraki yenilemeyi durdurur; erişim bitişe kadar sürer", () => {
  expect(parseSubscription(body({ unsubscribe_detected_at: "2026-01-01" }), "premium")).toMatchObject({ active: true, renewal: "cancelled", expiresAt: future });
});
it("deneme ve ödeme sorununu ayrı gösterir", () => {
  expect(parseSubscription(body({ period_type: "trial" }), "premium").period).toBe("trial");
  expect(parseSubscription(body({ billing_issues_detected_at: "2026-01-01" }), "premium").renewal).toBe("billing_issue");
});
it("başka entitlement veya eksik tarih Premium açmaz", () => {
  expect(parseSubscription(body(), "other").active).toBe(false);
  expect(() => parseSubscription({ subscriber: { entitlements: { premium: {} } } }, "premium")).toThrow();
});
it("grace bitişi orijinal bitişten sonraysa erişim sürer", () => {
  expect(parseSubscription({ subscriber: { entitlements: { premium: { expires_date: "2000-01-01", grace_period_expires_date: future } } } }, "premium").active).toBe(true);
});
it("doğrulama servisi kesintisini abonelik yok gibi sunmaz, timeout sinyali gönderir", async () => {
  const original = global.fetch;
  const fetchMock = jest.fn().mockResolvedValue({ ok: false, status: 503 });
  global.fetch = fetchMock;
  try {
    const client = new RevenueCatClient({ get: (key: string) => key === "REVENUECAT_SECRET_API_KEY" ? "test-key" : undefined } as ConfigService);
    await expect(client.readSubscription("user")).rejects.toThrow();
    expect(fetchMock.mock.calls[0][1].signal).toBeDefined();
    await expect(client.checkEntitlement("user")).resolves.toBe(false);
  } finally { global.fetch = original; }
});
