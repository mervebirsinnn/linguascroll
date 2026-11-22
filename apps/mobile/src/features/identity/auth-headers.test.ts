// 2026-11-22 — platforma göre abonelik kapısı: kullanıcıya ait istekler X-Client-Platform taşır.
const mockPlatform = { OS: "ios" };
jest.mock("react-native", () => ({ Platform: mockPlatform }));
jest.mock("./auth-gateway", () => ({ getIdToken: jest.fn(async () => "firebase-id-token") }));

import { authHeaders, clientPlatformHeader } from "./auth-headers";

describe("clientPlatformHeader", () => {
  it("iOS ve Android kendi değerini gönderir; başka platform (web) başlık göndermez", () => {
    expect(clientPlatformHeader("ios")).toEqual({ "X-Client-Platform": "ios" });
    expect(clientPlatformHeader("android")).toEqual({ "X-Client-Platform": "android" });
    expect(clientPlatformHeader("web")).toEqual({});
  });
});

describe("authHeaders", () => {
  it("kimlik token'ını korur ve çalışılan platformu ekler", async () => {
    mockPlatform.OS = "ios";
    expect(await authHeaders()).toEqual({ Authorization: "Bearer firebase-id-token", "X-Client-Platform": "ios" });
    mockPlatform.OS = "android";
    expect(await authHeaders()).toEqual({ Authorization: "Bearer firebase-id-token", "X-Client-Platform": "android" });
  });
});
