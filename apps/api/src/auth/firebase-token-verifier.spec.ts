import { isFreshDeletionLogin } from "./firebase-token-verifier";

// 2026-11-20 — silme token'ı kuralı (saf fonksiyon; Firebase Admin gerekmez).
describe("isFreshDeletionLogin", () => {
  const now = 1_800_000_000;
  const token = (provider: string, authTime = now - 10) => ({ auth_time: authTime, firebase: { sign_in_provider: provider } });

  it("son 5 dakikada Google ile doğrulanmış token kabul edilir (mevcut Android davranışı)", () => {
    expect(isFreshDeletionLogin(token("google.com"), now)).toBe(true);
  });
  it("son 5 dakikada Apple ile doğrulanmış token kabul edilir (iOS — Apple kullanıcısı da silebilmeli)", () => {
    expect(isFreshDeletionLogin(token("apple.com"), now)).toBe(true);
  });
  it("misafir (anonymous) ve bilinmeyen sağlayıcı reddedilir", () => {
    expect(isFreshDeletionLogin(token("anonymous"), now)).toBe(false);
    expect(isFreshDeletionLogin(token("password"), now)).toBe(false);
    expect(isFreshDeletionLogin({ auth_time: now }, now)).toBe(false);
  });
  it("5 dakikadan eski ya da gelecekten gelen doğrulama reddedilir", () => {
    expect(isFreshDeletionLogin(token("apple.com", now - 301), now)).toBe(false);
    expect(isFreshDeletionLogin(token("google.com", now + 61), now)).toBe(false);
    expect(isFreshDeletionLogin(token("google.com", Number.NaN), now)).toBe(false);
  });
});
