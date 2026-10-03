import { shouldApplyHydratedLanguage } from "./use-explanation-language";

describe("shouldApplyHydratedLanguage", () => {
  it("effect iptal edilmediyse ve kullanıcı henüz manuel seçim yapmadıysa hydration uygulanır", () => {
    expect(shouldApplyHydratedLanguage(false, false)).toBe(true);
  });

  // Root cause: kullanıcı AsyncStorage okuması resolve olmadan (mount-time
  // hydration devam ederken) manuel bir dil seçtiyse, geç gelen storage
  // sonucu bu seçimi SESSİZCE ezmemeli.
  it("kullanıcı zaten manuel bir dil seçtiyse hydration UYGULANMAZ (stale-read race önlenir)", () => {
    expect(shouldApplyHydratedLanguage(false, true)).toBe(false);
  });

  it("effect iptal edildiyse (component unmount/segment değişti) hydration UYGULANMAZ", () => {
    expect(shouldApplyHydratedLanguage(true, false)).toBe(false);
  });

  it("hem iptal edilmiş HEM kullanıcı override etmişse yine UYGULANMAZ", () => {
    expect(shouldApplyHydratedLanguage(true, true)).toBe(false);
  });
});
