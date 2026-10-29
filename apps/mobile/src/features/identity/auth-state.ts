/**
 * 2026-10-27 — gerçek hesap (Firebase Authentication) durum makinesi.
 * use-feed.ts / paywall-state.ts ile AYNI desen: geçişler saf fonksiyonlar, hook sadece
 * bunları SDK'ya ve backend'e bağlıyor (React'siz test edilir).
 *
 * `signedIn.userId` = backend'in SABİT kullanıcı id'si (GET /me) — Firebase UID değil.
 * RevenueCat App User ID'si bu değer; backend entitlement'ı aynı id ile sorgular.
 *
 * 2026-10-28 — ürün kararı değişti: ilk 10 video GİRİŞSİZ izlenir. Cihazda hiç Google hesabı
 * bağlanmamışsa açılışta otomatik bir ANONİM Firebase oturumu açılır ("startingGuest"); backend
 * ücretsiz hakkı bu anonim kullanıcıya sayar. Paywall'da Google girişi bu anonim hesaba BAĞLANIR
 * (Firebase account linking) — Firebase UID değişmediği için backend kullanıcısı, tüketilen
 * haklar ve RevenueCat kimliği AYNEN kalır. Google hesabı zaten başka bir Firebase kullanıcısına
 * bağlıysa o hesaba geçilir ("switched"; anonim hesabın hakları bırakılır).
 *
 * Bilinen ve KABUL EDİLEN sınır (kullanıcı onayı, 2026-10-28): anonim hak cihaza bağlı —
 * uygulamayı silip yeniden kuran tekrar 10 video alır. Bu kapıyı en azından "çıkış yap → yeni
 * anonim hesap" ile açmamak için: cihazda bir kez Google hesabı bağlandıysa (`guestAllowed`
 * false) çıkıştan sonra misafir oturumu AÇILMAZ, giriş ekranı gösterilir.
 */
export type AuthSession = { uid: string; isAnonymous: boolean };

export type AuthState =
  | { status: "unconfigured" }
  | { status: "initializing" }
  | { status: "startingGuest" }
  | { status: "guestFailed" }
  | { status: "signedOut"; notice: string | null }
  | { status: "signingIn" }
  | { status: "loadingUser"; session: AuthSession }
  | { status: "signedIn"; userId: string; session: AuthSession; linking: boolean; notice: string | null }
  | { status: "userLoadFailed"; session: AuthSession };

/** Feed/paywall/Memory'nin hesap bağlama için ihtiyaç duyduğu dar arayüz (App.tsx doldurur). */
export type AccountLinkControl = {
  isAnonymous: boolean;
  linking: boolean;
  notice: string | null;
  onLinkAccount: () => void;
  onDeleteAccount?: () => Promise<boolean>;
};

export const NOTICE_SIGN_IN_FAILED = "Giriş yapılamadı. İnternet bağlantını kontrol edip tekrar dene.";
export const NOTICE_LINK_FAILED = "Google ile giriş yapılamadı. İnternet bağlantını kontrol edip tekrar dene.";

export function initialAuthState(configured: boolean): AuthState {
  return configured ? { status: "initializing" } : { status: "unconfigured" };
}

/**
 * Firebase oturum dinleyicisi (açılışta kalıcı oturum da bir kez bildirilir).
 * - Oturum yok: cihazda hiç Google hesabı bağlanmadıysa misafir oturumu açılır, yoksa giriş ekranı.
 * - Oturum var: aynı Firebase kullanıcısı için zaten yüklenmiş/yükleniyorsa baştan başlatılmaz;
 *   FARKLI kullanıcıysa (hesap değişimi, "switched") backend kullanıcısı yeniden yüklenir.
 */
export function applyAuthChanged(state: AuthState, session: AuthSession | null, guestAllowed: boolean): AuthState {
  if (session === null) {
    if (guestAllowed) {
      return state.status === "startingGuest" ? state : { status: "startingGuest" };
    }
    return { status: "signedOut", notice: state.status === "signedOut" ? state.notice : null };
  }
  if (state.status === "signedIn" && state.session.uid === session.uid) {
    return state.session.isAnonymous === session.isAnonymous ? state : { ...state, session };
  }
  if (state.status === "loadingUser" && state.session.uid === session.uid) {
    return state;
  }
  return { status: "loadingUser", session };
}

export function applyGuestFailed(state: AuthState): AuthState {
  return state.status === "startingGuest" ? { status: "guestFailed" } : state;
}

export function applyGuestRetry(state: AuthState): AuthState {
  return state.status === "guestFailed" ? { status: "startingGuest" } : state;
}

export function applySignInStarted(state: AuthState): AuthState {
  return state.status === "signedOut" ? { status: "signingIn" } : state;
}

/**
 * İptal/hata SADECE hâlâ "signingIn" iken uygulanır: oturum dinleyicisi giriş promise'inden
 * önce tetiklenip durumu ilerletmiş olabilir — o ilerleme geri alınmamalı.
 */
export function applySignInCancelled(state: AuthState): AuthState {
  return state.status === "signingIn" ? { status: "signedOut", notice: null } : state;
}

export function applySignInFailed(state: AuthState): AuthState {
  return state.status === "signingIn" ? { status: "signedOut", notice: NOTICE_SIGN_IN_FAILED } : state;
}

export function applyUserLoaded(state: AuthState, userId: string): AuthState {
  return state.status === "loadingUser" ? { status: "signedIn", userId, session: state.session, linking: false, notice: null } : state;
}

export function applyUserLoadFailed(state: AuthState): AuthState {
  return state.status === "loadingUser" ? { status: "userLoadFailed", session: state.session } : state;
}

export function applyUserRetry(state: AuthState): AuthState {
  return state.status === "userLoadFailed" ? { status: "loadingUser", session: state.session } : state;
}

/** Hesap bağlama yalnızca anonim, giriş yapılmış ve başka bir bağlama sürmüyorken başlar (çift tıklama koruması). */
export function canStartLink(state: AuthState): boolean {
  return state.status === "signedIn" && state.session.isAnonymous && !state.linking;
}

export function applyLinkStarted(state: AuthState): AuthState {
  return canStartLink(state) && state.status === "signedIn" ? { ...state, linking: true, notice: null } : state;
}

/** Aynı Firebase kullanıcısı artık Google'a bağlı: backend kullanıcısı (userId) DEĞİŞMEZ. */
export function applyLinkSucceeded(state: AuthState): AuthState {
  return state.status === "signedIn" ? { ...state, linking: false, session: { ...state.session, isAnonymous: false } } : state;
}

/**
 * İptal ya da "switched" (başka hesaba geçildi — yeni kullanıcıyı oturum dinleyicisi yükler):
 * sadece bekleme göstergesi kapanır.
 */
export function applyLinkEnded(state: AuthState): AuthState {
  return state.status === "signedIn" ? { ...state, linking: false } : state;
}

export function applyLinkFailed(state: AuthState): AuthState {
  return state.status === "signedIn" ? { ...state, linking: false, notice: NOTICE_LINK_FAILED } : state;
}
