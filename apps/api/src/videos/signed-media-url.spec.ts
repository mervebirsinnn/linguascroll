import { isValidMediaSignature, signMediaUrl } from "./signed-media-url";

const SECRET = "test-media-signing-secret-at-least-32-chars";
const NOW = Date.UTC(2026, 9, 27, 12, 0, 0);

function paramsOf(url: string): { pathname: string; exp: string | undefined; sig: string | undefined } {
  const parsed = new URL(url);
  return { pathname: parsed.pathname, exp: parsed.searchParams.get("exp") ?? undefined, sig: parsed.searchParams.get("sig") ?? undefined };
}

describe("signMediaUrl / isValidMediaSignature", () => {
  it("imzalı URL, süresi dolmadan doğrulanır", () => {
    const { pathname, exp, sig } = paramsOf(signMediaUrl("https://media.example.com/originals/a/b.mp4", SECRET, 3600, NOW));
    expect(isValidMediaSignature(pathname, exp, sig, SECRET, NOW + 1000)).toBe(true);
  });

  it("süresi geçmiş URL reddedilir", () => {
    const { pathname, exp, sig } = paramsOf(signMediaUrl("https://media.example.com/a.mp4", SECRET, 60, NOW));
    expect(isValidMediaSignature(pathname, exp, sig, SECRET, NOW + 61_000)).toBe(false);
  });

  it("başka bir videonun path'i için aynı imza geçmez", () => {
    const { exp, sig } = paramsOf(signMediaUrl("https://media.example.com/a.mp4", SECRET, 3600, NOW));
    expect(isValidMediaSignature("/b.mp4", exp, sig, SECRET, NOW)).toBe(false);
  });

  it("exp değiştirilirse (süre uzatma denemesi) imza geçmez", () => {
    const { pathname, exp, sig } = paramsOf(signMediaUrl("https://media.example.com/a.mp4", SECRET, 60, NOW));
    expect(isValidMediaSignature(pathname, String(Number(exp) + 3600), sig, SECRET, NOW)).toBe(false);
  });

  it("farklı secret ile imzalanmış URL geçmez", () => {
    const { pathname, exp, sig } = paramsOf(signMediaUrl("https://media.example.com/a.mp4", `${SECRET}-other`, 3600, NOW));
    expect(isValidMediaSignature(pathname, exp, sig, SECRET, NOW)).toBe(false);
  });

  it("eksik/bozuk parametreler reddedilir", () => {
    expect(isValidMediaSignature("/a.mp4", undefined, "x", SECRET, NOW)).toBe(false);
    expect(isValidMediaSignature("/a.mp4", "123", undefined, SECRET, NOW)).toBe(false);
    expect(isValidMediaSignature("/a.mp4", "12abc", "x", SECRET, NOW)).toBe(false);
  });

  it("percent-encoded path imzalanırken ham haliyle korunur", () => {
    const signed = signMediaUrl("https://media.example.com/originals/a%20b.mp4", SECRET, 3600, NOW);
    const { pathname, exp, sig } = paramsOf(signed);
    expect(pathname).toBe("/originals/a%20b.mp4");
    expect(isValidMediaSignature(pathname, exp, sig, SECRET, NOW)).toBe(true);
  });
});
