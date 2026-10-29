import { fetchWithTimeout } from "../../shared/fetch-with-timeout";
import { API_BASE_URL } from "../../shared/api-base-url";
import { authHeaders } from "./auth-headers";
import { useCallback, useEffect, useRef, useState } from "react";
import * as Sentry from "@sentry/react-native";
import { logOutPurchases } from "../subscription/purchases-gateway";
import { fetchCurrentUser } from "./api/fetch-current-user";
import { isAuthConfigured, reauthenticateForDeletion, linkGoogleAccount, signInAsGuest, signInWithGoogle, signOutOfAuth, subscribeToAuthState } from "./auth-gateway";
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
  type AuthState,
} from "./auth-state";
import { markAccountLinked, readLinkedAccountFlag } from "./linked-account-flag";

type UseAuthResult = {
  state: AuthState;
  signIn: () => void;
  deleteAccount: () => Promise<boolean>;
  signOut: () => void;
  linkAccount: () => void;
  retryUser: () => void;
  retryGuest: () => void;
};

/**
 * Geçişler auth-state.ts'te; bu hook sadece SDK'ya (auth-gateway) ve backend'e (GET /me) bağlar.
 * 2026-10-28 — misafir (anonim) oturum + hesap bağlama eklendi (gerekçe: auth-state.ts).
 */
export function useAuth(): UseAuthResult {
  const [state, setState] = useState<AuthState>(() => initialAuthState(isAuthConfigured()));
  const stateRef = useRef(state);
  stateRef.current = state;
  // Bayrak okunmadan dinleyici bağlanmıyor (aşağıda) — dinleyici her zaman kesin değeri görür.
  const lastUid = useRef<string | null>(null);
  const linkingLock = useRef(false);
  const deletionToken = useRef<{ Authorization: string } | null>(null);
  const guestAllowedRef = useRef(false);

  useEffect(() => {
    if (!isAuthConfigured()) return undefined;
    let cancelled = false;
    let unsubscribe: (() => void) | null = null;
    readLinkedAccountFlag().then((linkedBefore) => {
      if (cancelled) return;
      guestAllowedRef.current = !linkedBefore;
      unsubscribe = subscribeToAuthState((session) => {
        if (lastUid.current !== (session?.uid ?? null)) deletionToken.current = null;
        lastUid.current = session?.uid ?? null;
        // Kalıcı bir Google oturumu da "bu cihazda hesap bağlandı" demektir — bayrak bu akıştan önce
        // (ör. 2026-10-27 build'i, girişin zorunlu olduğu sürüm) açılmış oturumlarda hiç yazılmamış
        // olabilir. Yazılmazsa çıkış giriş ekranı yerine YENİ misafir (yeni 10 hak) açmaya çalışır
        // (cihazda gerçekten yaşandı, 2026-10-28).
        if (session !== null && !session.isAnonymous && guestAllowedRef.current) {
          rememberLinkedAccount();
        }
        setState((current) => applyAuthChanged(current, session, guestAllowedRef.current));
      });
    });
    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, []);

  useEffect(() => {
    if (state.status !== "startingGuest") return;
    // Başarıda durum oturum dinleyicisinden ilerliyor (loadingUser → signedIn).
    signInAsGuest().catch((error: unknown) => {
      Sentry.captureException(error);
      // Ekranda kullanıcıya genel "bağlantı" mesajı gösteriliyor; geliştirmede gerçek sebep
      // (ör. Firebase'de Anonymous sağlayıcısı kapalı: auth/admin-restricted-operation) Metro'da görünsün.
      if (__DEV__) console.warn("[auth] misafir oturumu açılamadı:", error);
      setState(applyGuestFailed);
    });
  }, [state.status]);

  // Aynı "loadingUser" durumunda farklı Firebase kullanıcısına geçilirse (hesap değişimi) yeniden yüklenmeli.
  const loadingUid = state.status === "loadingUser" ? state.session.uid : null;
  useEffect(() => {
    if (loadingUid === null) return undefined;
    let cancelled = false;
    fetchCurrentUser()
      .then(({ userId }) => {
        if (!cancelled) setState((current) => applyUserLoaded(current, userId));
      })
      .catch((error: unknown) => {
        Sentry.captureException(error);
        if (__DEV__) console.warn("[auth] backend kullanıcısı (GET /me) yüklenemedi:", error);
        if (!cancelled) setState(applyUserLoadFailed);
      });
    return () => {
      cancelled = true;
    };
  }, [loadingUid]);

  // Sadece ref ve setState kullanıyor → render'lar arası sabit; linkAccount'ın useCallback'i buna dayanıyor.
  const rememberLinkedAccount = useCallback((): void => {
    guestAllowedRef.current = false;
    markAccountLinked().catch((error: unknown) => Sentry.captureException(error));
  }, []);

  function signIn(): void {
    setState(applySignInStarted);
    signInWithGoogle()
      .then((outcome) => {
        // "signed-in" için durum oturum dinleyicisinden ilerliyor (loadingUser → signedIn).
        if (outcome === "cancelled") setState(applySignInCancelled);
        else rememberLinkedAccount();
      })
      .catch((error: unknown) => {
        Sentry.captureException(error);
        setState(applySignInFailed);
      });
  }

  // Sabit referans: App.tsx bunu useMemo'lu `account` nesnesine koyuyor (Feed'in FlatList extraData'sı).
  const linkAccount = useCallback((): void => {
    if (linkingLock.current || !canStartLink(stateRef.current)) return;
    linkingLock.current = true;
    setState(applyLinkStarted);
    linkGoogleAccount()
      .then((outcome) => {
        if (outcome === "cancelled") {
          setState(applyLinkEnded);
          return;
        }
        rememberLinkedAccount();
        // "switched": yeni kullanıcıyı oturum dinleyicisi yüklüyor; burada sadece gösterge kapanır.
        setState(outcome === "linked" ? applyLinkSucceeded : applyLinkEnded);
      })
      .catch((error: unknown) => {
        Sentry.captureException(error);
        setState(applyLinkFailed);
      }).finally(() => { linkingLock.current = false; });
  }, [rememberLinkedAccount]);

  function signOut(): void {
    // Önce RevenueCat oturumu kapatılır: bir sonraki hesap, öncekinin önbellekteki müşteri
    // bilgisini (aboneliğini) göremesin. Hata olsa da Firebase çıkışı yapılır.
    logOutPurchases()
      .catch((error: unknown) => Sentry.captureException(error))
      .finally(() => {
        signOutOfAuth().catch((error: unknown) => Sentry.captureException(error));
      });
  }

  const deleteAccount = useCallback(async (): Promise<boolean> => {
    if (!deletionToken.current) {
      if (!(await reauthenticateForDeletion())) return false;
      deletionToken.current = await authHeaders();
    }
    const response = await fetchWithTimeout(`${API_BASE_URL}/account`, { method: "DELETE", headers: deletionToken.current });
    if (!response.ok) {
      if (response.status === 401) deletionToken.current = null;
      throw new Error("Hesap silinemedi. Daha sonra tekrar dene.");
    }
    await logOutPurchases().catch(() => {});
    await signOutOfAuth();
    deletionToken.current = null;
    return true;
  }, []);

  return {
    state,
    signIn,
    deleteAccount,
    signOut,
    linkAccount,
    retryUser: () => setState(applyUserRetry),
    retryGuest: () => setState(applyGuestRetry),
  };
}
