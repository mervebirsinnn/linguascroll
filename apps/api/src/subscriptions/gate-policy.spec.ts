import { GATE_PLATFORMS_PATTERN, gatePolicyFromEnv, isGateActive, parseClientPlatform } from "./gate-policy";

// 2026-11-22 — platforma göre abonelik kapısı kuralı (saf; Nest/DB yok).
describe("isGateActive", () => {
  const cases: Array<[string | undefined, string | undefined, "ios" | "android" | null, boolean]> = [
    // [SUBSCRIPTION_GATE_ENABLED, SUBSCRIPTION_GATE_PLATFORMS, istemci platformu, kapı açık mı]
    ["false", undefined, "ios", false],
    ["false", undefined, "android", false],
    ["false", undefined, null, false],
    ["false", "ios", "ios", true],
    ["false", "ios", "android", false],
    ["false", "ios", null, false],
    ["false", "ios,android", "android", true],
    ["true", undefined, "ios", true],
    ["true", undefined, "android", true],
    ["true", undefined, null, true],
    ["true", "ios", "android", true],
    [undefined, undefined, "ios", false],
  ];
  it.each(cases)("ENABLED=%s PLATFORMS=%s platform=%s → %s", (enabled, platforms, platform, expected) => {
    expect(isGateActive(gatePolicyFromEnv(enabled, platforms), platform)).toBe(expected);
  });
});

describe("parseClientPlatform", () => {
  it("ios/android (büyük-küçük harf ve boşluk toleranslı) tanınır", () => {
    expect(parseClientPlatform("ios")).toBe("ios");
    expect(parseClientPlatform(" Android ")).toBe("android");
  });
  it("eksik, boş, bilinmeyen ya da tekrarlı (dizi) başlık → null (bilinmeyen platform)", () => {
    expect(parseClientPlatform(undefined)).toBeNull();
    expect(parseClientPlatform("")).toBeNull();
    expect(parseClientPlatform("web")).toBeNull();
    expect(parseClientPlatform(["ios", "android"])).toBeNull();
  });
});

describe("GATE_PLATFORMS_PATTERN (env biçimi)", () => {
  it.each(["ios", "android", "ios,android"])("%s geçerli", (value) => expect(GATE_PLATFORMS_PATTERN.test(value)).toBe(true));
  it.each(["", "IOS", "ios, android", "web", "ios,"])("%s geçersiz", (value) => expect(GATE_PLATFORMS_PATTERN.test(value)).toBe(false));
});
