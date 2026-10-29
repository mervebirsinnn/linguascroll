import {
  applyAccessError,
  applyActivation,
  applyAccessResponse,
  applyFeedPlaybackUrl,
  applyRetry,
  initialPlaybackAccessState,
} from "./use-playback-access";

// 2026-10-27 — kimlik SDK'sı (Firebase/Google Sign-In, native) testte yüklenmez: API dosyalarının
// kullandığı header üreticisi sabit bir test token'ı döner.
jest.mock("../../identity/auth-headers", () => ({ authHeaders: () => Promise.resolve({ Authorization: "Bearer test-id-token" }) }));

const URL_A = "https://media.example.com/a.mp4?exp=1&sig=a";
const URL_B = "https://media.example.com/a.mp4?exp=2&sig=b";

describe("playback access state geçişleri", () => {
  it("feed URL taşıyorsa doğrudan ready; taşımıyorsa idle (henüz istek YOK)", () => {
    expect(initialPlaybackAccessState(URL_A)).toEqual({ status: "ready", playbackUrl: URL_A });
    expect(initialPlaybackAccessState(null)).toEqual({ status: "idle" });
  });

  it("erişim yalnızca video aktif olunca istenir — önceden mount edilen komşu hak tüketmez", () => {
    expect(applyActivation({ status: "idle" }, false)).toEqual({ status: "idle" });
    expect(applyActivation({ status: "idle" }, true)).toEqual({ status: "requesting" });
    const ready = { status: "ready" as const, playbackUrl: URL_A };
    expect(applyActivation(ready, true)).toBe(ready);
    expect(applyActivation({ status: "paywall" }, true)).toEqual({ status: "paywall" });
  });

  it("granted → ready (imzalı URL), paywall → paywall", () => {
    expect(applyAccessResponse({ status: "granted", playbackUrl: URL_A })).toEqual({ status: "ready", playbackUrl: URL_A });
    expect(applyAccessResponse({ status: "paywall" })).toEqual({ status: "paywall" });
  });

  it("hata yalnızca error'dan yeniden denenir; paywall yeniden denemeyle açılmaz", () => {
    expect(applyRetry(applyAccessError())).toEqual({ status: "requesting" });
    expect(applyRetry({ status: "paywall" })).toEqual({ status: "paywall" });
  });

  it("feed yenilenip URL gelirse (ör. abonelik sonrası) paywall/hata durumunun yerini alır", () => {
    expect(applyFeedPlaybackUrl({ status: "paywall" }, URL_A)).toEqual({ status: "ready", playbackUrl: URL_A });
    expect(applyFeedPlaybackUrl({ status: "ready", playbackUrl: URL_A }, URL_B)).toEqual({ status: "ready", playbackUrl: URL_B });
  });

  it("feed URL'i null kalırsa mevcut durum korunur (erişimle alınmış URL silinmez)", () => {
    const ready = { status: "ready" as const, playbackUrl: URL_A };
    expect(applyFeedPlaybackUrl(ready, null)).toBe(ready);
  });
});
