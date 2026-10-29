import AsyncStorage from "@react-native-async-storage/async-storage";
import { FirebaseError, getApp, getApps, initializeApp } from "firebase/app";
import {
  getAuth,
  getReactNativePersistence,
  GoogleAuthProvider,
  initializeAuth,
  linkWithCredential,
  reauthenticateWithCredential,
  onAuthStateChanged,
  signInAnonymously,
  signInWithCredential,
  signOut,
  type Auth,
  type OAuthCredential,
} from "@firebase/auth";
import { GoogleSignin, isErrorWithCode, isSuccessResponse, statusCodes } from "@react-native-google-signin/google-signin";
import { FIREBASE_WEB_CONFIG, GOOGLE_WEB_CLIENT_ID } from "../../shared/firebase-config";
import type { AuthSession } from "./auth-state";

/**
 * 2026-10-27 — Firebase Authentication + Google Sign-In SDK'larına dokunan TEK dosya
 * (purchases-gateway.ts ile aynı "SDK adaptörü" deseni — state/hook/UI SDK'ları hiç bilmiyor).
 *
 * Akış: Google Sign-In (native, Android) → Google ID token → Firebase `signInWithCredential`
 * → Firebase oturumu. Backend'e giden her istek Firebase ID token'ı taşır (getIdToken); token
 * ~1 saatlik ve Firebase SDK'sı süresi dolmadan kendiliğinden yeniler. Oturum AsyncStorage'da
 * kalıcı (uygulama yeniden açılınca tekrar giriş gerekmez).
 *
 * 2026-10-28 — ilk açılışta anonim oturum (`signInAsGuest`), paywall'da Google hesabının bu
 * anonim kullanıcıya bağlanması (`linkGoogleAccount`). Akışın gerekçesi: auth-state.ts.
 *
 * `@firebase/auth` doğrudan import ediliyor (firebase/auth şemsiyesi DEĞİL): Expo'nun TS
 * ayarındaki `react-native` koşulu sadece bu paketin export'larında tanımlı; böylece
 * `getReactNativePersistence` tip susturma olmadan kullanılabiliyor. Sürüm, `firebase`
 * paketinin sabitlediği sürümle AYNI (tek kopya).
 */

export class AuthConfigurationError extends Error {
  constructor() {
    super("Giriş yapılandırması eksik (EXPO_PUBLIC_FIREBASE_* / EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID).");
    this.name = "AuthConfigurationError";
  }
}

export class NotSignedInError extends Error {
  constructor() {
    super("Oturum yok — önce giriş yapılmalı.");
    this.name = "NotSignedInError";
  }
}

let authInstance: Auth | null = null;
let googleConfigured = false;

function getFirebaseAuth(): Auth {
  if (authInstance) return authInstance;
  if (!FIREBASE_WEB_CONFIG) throw new AuthConfigurationError();
  const app = getApps().length > 0 ? getApp() : initializeApp(FIREBASE_WEB_CONFIG);
  try {
    authInstance = initializeAuth(app, { persistence: getReactNativePersistence(AsyncStorage) });
  } catch {
    // Fast Refresh sonrası initializeAuth ikinci kez çağrılırsa "already-initialized" fırlatır.
    authInstance = getAuth(app);
  }
  return authInstance;
}

function ensureGoogleConfigured(): void {
  if (googleConfigured) return;
  if (!GOOGLE_WEB_CLIENT_ID) throw new AuthConfigurationError();
  GoogleSignin.configure({ webClientId: GOOGLE_WEB_CLIENT_ID });
  googleConfigured = true;
}

/** Giriş yapılandırması bu build'de var mı (env değerleri gömülmüş mü)? */
export function isAuthConfigured(): boolean {
  return FIREBASE_WEB_CONFIG !== undefined && GOOGLE_WEB_CLIENT_ID !== undefined;
}

/**
 * Oturum değişikliklerini dinler (açılışta kalıcı oturum da bir kez bildirilir). Anonim oturum
 * da kalıcı: uygulama yeniden açılınca AYNI anonim kullanıcı (aynı ücretsiz hak sayacı) döner.
 * Not: `linkWithCredential` kullanıcıyı değiştirmediği için bu dinleyiciyi TETİKLEMEZ — bağlama
 * sonucu hook'ta ayrıca uygulanır (auth-state.ts, applyLinkSucceeded).
 */
export function subscribeToAuthState(listener: (session: AuthSession | null) => void): () => void {
  return onAuthStateChanged(getFirebaseAuth(), (user) => listener(user === null ? null : { uid: user.uid, isAnonymous: user.isAnonymous }));
}

/** 2026-10-28 — girişsiz ilk 10 video: cihaza özel anonim Firebase kullanıcısı. */
export async function signInAsGuest(): Promise<void> {
  await signInAnonymously(getFirebaseAuth());
}

/** Native Google hesap seçici → Firebase credential'ı; kullanıcı vazgeçerse null. */
async function requestGoogleCredential(): Promise<OAuthCredential | null> {
  ensureGoogleConfigured();
  await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
  try {
    const response = await GoogleSignin.signIn();
    if (!isSuccessResponse(response)) {
      return null;
    }
    const { idToken } = response.data;
    if (!idToken) {
      // webClientId yanlışsa Google idToken üretmez — yapılandırma hatası, "başarılı" sayılamaz.
      throw new Error("Google ID token alınamadı (webClientId yapılandırmasını kontrol et).");
    }
    return GoogleAuthProvider.credential(idToken);
  } catch (error) {
    if (isErrorWithCode(error) && error.code === statusCodes.IN_PROGRESS) {
      return null;
    }
    throw error;
  }
}

export type GoogleSignInOutcome = "signed-in" | "cancelled";

/** Oturum YOKKEN (çıkış yapmış, daha önce hesap bağlamış cihaz) Google ile giriş. */
export async function signInWithGoogle(): Promise<GoogleSignInOutcome> {
  const auth = getFirebaseAuth();
  const credential = await requestGoogleCredential();
  if (credential === null) {
    return "cancelled";
  }
  await signInWithCredential(auth, credential);
  return "signed-in";
}

/**
 * - "linked": Google hesabı mevcut anonim kullanıcıya bağlandı — Firebase UID (dolayısıyla
 *   backend kullanıcısı, tüketilen haklar, RevenueCat kimliği) DEĞİŞMEDİ.
 * - "switched": bu Google hesabı zaten başka bir Firebase kullanıcısına bağlı; o hesaba geçildi
 *   (oturum dinleyicisi yeni kullanıcıyı yükler). Anonim hesabın hakları bırakılır — iki hesabın
 *   otomatik birleştirilmesi yok (bkz. 2026-10-27 kararı: sahiplik kanıtı olmadan birleştirme yok).
 */
export type LinkOutcome = "linked" | "switched" | "cancelled";

export async function linkGoogleAccount(): Promise<LinkOutcome> {
  const auth = getFirebaseAuth();
  const user = auth.currentUser;
  if (!user) throw new NotSignedInError();
  if (!user.isAnonymous) return "linked";
  const credential = await requestGoogleCredential();
  if (credential === null) {
    return "cancelled";
  }
  try {
    await linkWithCredential(user, credential);
    await user.getIdToken(true);
    return "linked";
  } catch (error) {
    if (error instanceof FirebaseError && error.code === "auth/credential-already-in-use") {
      await signInWithCredential(auth, GoogleAuthProvider.credentialFromError(error) ?? credential);
      return "switched";
    }
    throw error;
  }
}

/** Firebase oturumunu ve Google hesabı seçimini kapatır (bir sonraki girişte hesap yeniden seçilir). */
export async function signOutOfAuth(): Promise<void> {
  await signOut(getFirebaseAuth());
  if (googleConfigured) {
    await GoogleSignin.signOut();
  }
}

/** Backend istekleri için güncel Firebase ID token'ı (gerekirse SDK yeniler). */
export async function getIdToken(): Promise<string> {
  const user = getFirebaseAuth().currentUser;
  if (!user) throw new NotSignedInError();
  return user.getIdToken();
}

/** Yıkıcı hesap silmeden önce mağaza hesabı değil Firebase hesabı taze Google credential ile doğrulanır. */
export async function reauthenticateForDeletion(): Promise<boolean> {
  const user = getFirebaseAuth().currentUser;
  if (!user || user.isAnonymous) throw new NotSignedInError();
  const credential = await requestGoogleCredential();
  if (!credential) return false;
  await reauthenticateWithCredential(user, credential);
  await user.getIdToken(true);
  return true;
}
