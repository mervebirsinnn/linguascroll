import type { ConfigService } from "@nestjs/config";
import { RevenueCatClient } from "./revenue-cat-client";

function makeClient(secretApiKey: string | undefined): RevenueCatClient {
  const configService = { get: () => secretApiKey } as unknown as ConfigService;
  return new RevenueCatClient(configService);
}

describe("RevenueCatClient.checkEntitlement", () => {
  const originalFetch = global.fetch;
  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("REVENUECAT_SECRET_API_KEY tanımsızsa fetch'e hiç gitmeden false döner", async () => {
    const fetchSpy = jest.fn();
    global.fetch = fetchSpy as unknown as typeof fetch;

    const result = await makeClient(undefined).checkEntitlement("user-1");

    expect(result).toBe(false);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("aktif (expires_date: null → süresiz) bir entitlement varsa true döner", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ subscriber: { entitlements: { premium: { expires_date: null } } } }),
    }) as unknown as typeof fetch;

    expect(await makeClient("secret").checkEntitlement("user-1")).toBe(true);
  });

  it("gelecekteki bir expires_date ile aktif bir entitlement varsa true döner", async () => {
    const future = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ subscriber: { entitlements: { premium: { expires_date: future } } } }),
    }) as unknown as typeof fetch;

    expect(await makeClient("secret").checkEntitlement("user-1")).toBe(true);
  });

  it("SÜRESİ GEÇMİŞ (geçmişteki expires_date) bir entitlement false sayılır", async () => {
    const past = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ subscriber: { entitlements: { premium: { expires_date: past } } } }),
    }) as unknown as typeof fetch;

    expect(await makeClient("secret").checkEntitlement("user-1")).toBe(false);
  });

  it("hiç entitlement'ı olmayan bir subscriber için false döner", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ subscriber: { entitlements: {} } }),
    }) as unknown as typeof fetch;

    expect(await makeClient("secret").checkEntitlement("user-1")).toBe(false);
  });

  it("404 (hiç abonelik denemesi olmamış kullanıcı) fail-closed false döner, hata fırlatmaz", async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 404 }) as unknown as typeof fetch;
    await expect(makeClient("secret").checkEntitlement("user-1")).resolves.toBe(false);
  });

  it("5xx/diğer hata kodları fail-closed false döner, hata fırlatmaz", async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 500 }) as unknown as typeof fetch;
    await expect(makeClient("secret").checkEntitlement("user-1")).resolves.toBe(false);
  });

  it("network hatası (fetch reject) fail-closed false döner, hata fırlatmaz", async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error("network down")) as unknown as typeof fetch;
    await expect(makeClient("secret").checkEntitlement("user-1")).resolves.toBe(false);
  });
});
