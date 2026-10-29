import {
  applyAuthChanged,
  applyGuestFailed,
  applyGuestRetry,
  applyLinkEnded,
  applyLinkFailed,
  applyLinkStarted,
  applyLinkSucceeded,
  applySignInCancelled,
  applySignInFailed,
  applySignInStarted,
  applyUserLoaded,
  applyUserLoadFailed,
  applyUserRetry,
  canStartLink,
  initialAuthState,
  NOTICE_LINK_FAILED,
  NOTICE_SIGN_IN_FAILED,
  type AuthSession,
  type AuthState,
} from "./auth-state";

const USER_ID = "00000000-0000-4000-8000-000000000001";
const OTHER_USER_ID = "00000000-0000-4000-8000-000000000002";
const guest: AuthSession = { uid: "anon-uid", isAnonymous: true };
const google: AuthSession = { uid: "google-uid", isAnonymous: false };
const signedOut: AuthState = { status: "signedOut", notice: null };
const signedInGuest: AuthState = { status: "signedIn", userId: USER_ID, session: guest, linking: false, notice: null };

describe("auth state — açılış", () => {
  it("yapılandırma yoksa unconfigured, varsa initializing başlar", () => {
    expect(initialAuthState(false)).toEqual({ status: "unconfigured" });
    expect(initialAuthState(true)).toEqual({ status: "initializing" });
  });

  it("ilk açılış (cihazda hiç hesap bağlanmamış): oturum yoksa GİRİŞ EKRANI DEĞİL misafir oturumu başlar", () => {
    expect(applyAuthChanged({ status: "initializing" }, null, true)).toEqual({ status: "startingGuest" });
  });

  it("misafir oturumu açılınca backend kullanıcısı yüklenir → feed (giriş yapılmadan)", () => {
    const loading = applyAuthChanged({ status: "startingGuest" }, guest, true);
    expect(loading).toEqual({ status: "loadingUser", session: guest });
    expect(applyUserLoaded(loading, USER_ID)).toEqual(signedInGuest);
  });

  it("uygulama yeniden açılınca kalıcı oturum (misafir ya da Google) aynen yüklenir", () => {
    expect(applyAuthChanged({ status: "initializing" }, guest, true)).toEqual({ status: "loadingUser", session: guest });
    expect(applyAuthChanged({ status: "initializing" }, google, false)).toEqual({ status: "loadingUser", session: google });
  });

  it("misafir oturumu açılamazsa (ağ yok) yeniden denenebilir", () => {
    const failed = applyGuestFailed({ status: "startingGuest" });
    expect(failed).toEqual({ status: "guestFailed" });
    expect(applyGuestRetry(failed)).toEqual({ status: "startingGuest" });
    expect(applyGuestFailed(signedOut)).toBe(signedOut);
  });
});

describe("auth state — çıkış ve tekrar giriş", () => {
  it("cihazda daha önce hesap bağlandıysa çıkış YENİ misafir (yeni 10 hak) açmaz, giriş ekranı gösterir", () => {
    const signedInGoogle: AuthState = { status: "signedIn", userId: USER_ID, session: google, linking: false, notice: null };
    expect(applyAuthChanged(signedInGoogle, null, false)).toEqual(signedOut);
  });

  it("başarılı Google girişi: signingIn → (oturum dinleyicisi) loadingUser → signedIn(backend id)", () => {
    const signingIn = applySignInStarted(signedOut);
    expect(signingIn).toEqual({ status: "signingIn" });
    const loading = applyAuthChanged(signingIn, google, false);
    expect(applyUserLoaded(loading, USER_ID)).toEqual({ status: "signedIn", userId: USER_ID, session: google, linking: false, notice: null });
  });

  it("iptal ve hata yalnızca signingIn iken uygulanır; dinleyicinin ilerlettiği durumu geri almaz", () => {
    expect(applySignInCancelled({ status: "signingIn" })).toEqual(signedOut);
    expect(applySignInFailed({ status: "signingIn" })).toEqual({ status: "signedOut", notice: NOTICE_SIGN_IN_FAILED });
    const loading: AuthState = { status: "loadingUser", session: google };
    expect(applySignInFailed(loading)).toBe(loading);
  });

  it("aynı kullanıcı için tekrar 'oturum var' bildirimi kullanıcıyı yeniden yüklemez", () => {
    expect(applyAuthChanged(signedInGuest, guest, true)).toBe(signedInGuest);
  });

  it("FARKLI Firebase kullanıcısı bildirilirse (hesap değişimi) backend kullanıcısı yeniden yüklenir", () => {
    expect(applyAuthChanged(signedInGuest, google, false)).toEqual({ status: "loadingUser", session: google });
  });

  it("backend kullanıcısı yüklenemezse oturum korunarak yeniden denenebilir", () => {
    const failed = applyUserLoadFailed({ status: "loadingUser", session: guest });
    expect(failed).toEqual({ status: "userLoadFailed", session: guest });
    expect(applyUserRetry(failed)).toEqual({ status: "loadingUser", session: guest });
    expect(applyUserRetry(signedOut)).toBe(signedOut);
  });
});

describe("auth state — misafiri Google hesabına bağlama (paywall)", () => {
  it("yalnızca misafir ve bağlama sürmüyorken başlar (çift tıklama koruması)", () => {
    expect(canStartLink(signedInGuest)).toBe(true);
    const linking = applyLinkStarted(signedInGuest);
    expect(linking).toEqual({ ...signedInGuest, linking: true });
    expect(canStartLink(linking)).toBe(false);
    expect(applyLinkStarted(linking)).toBe(linking);
    const signedInGoogle: AuthState = { status: "signedIn", userId: USER_ID, session: google, linking: false, notice: null };
    expect(canStartLink(signedInGoogle)).toBe(false);
  });

  it("'linked': backend kullanıcısı (userId) ve Firebase UID AYNI kalır, sadece misafirlik biter", () => {
    const linked = applyLinkSucceeded(applyLinkStarted(signedInGuest));
    expect(linked).toEqual({ status: "signedIn", userId: USER_ID, session: { uid: guest.uid, isAnonymous: false }, linking: false, notice: null });
  });

  it("'switched': gösterge kapanır, ardından dinleyici başka kullanıcıyı bildirince o kullanıcı yüklenir", () => {
    const ended = applyLinkEnded(applyLinkStarted(signedInGuest));
    expect(ended).toEqual(signedInGuest);
    const loading = applyAuthChanged(ended, google, false);
    expect(applyUserLoaded(loading, OTHER_USER_ID)).toEqual({ status: "signedIn", userId: OTHER_USER_ID, session: google, linking: false, notice: null });
  });

  it("dinleyici 'switched' promise'inden önce tetiklenirse bağlama sonucu ilerlemeyi geri almaz", () => {
    const loading = applyAuthChanged(applyLinkStarted(signedInGuest), google, false);
    expect(applyLinkEnded(loading)).toBe(loading);
  });

  it("hata: misafir kalınır, kullanıcıya bildirim gösterilir, tekrar denenebilir", () => {
    const failed = applyLinkFailed(applyLinkStarted(signedInGuest));
    expect(failed).toEqual({ ...signedInGuest, notice: NOTICE_LINK_FAILED });
    expect(canStartLink(failed)).toBe(true);
    expect(applyLinkStarted(failed)).toEqual({ ...signedInGuest, linking: true, notice: null });
  });
});
