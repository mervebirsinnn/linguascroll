import AsyncStorage from "@react-native-async-storage/async-storage";
import { FirebaseError, getApp, getApps, initializeApp } from "firebase/app";
import {
  getAuth,
  getReactNativePersistence,
  GoogleAuthProvider,
  initializeAuth,
  linkWithCredential,
  OAuthProvider,
  reauthenticateWithCredential,
  onAuthStateChanged,
  signInAnonymously,
  signInWithCredential,
  signOut,
  type Auth,
  type OAuthCredential,
} from "@firebase/auth";
import { GoogleSignin, isErrorWithCode, isSuccessResponse, statusCodes } from "@react-native-google-signin/google-signin";
import * as AppleAuthentication from "expo-apple-authentication";
import * as Crypto from "expo-crypto";
import { Platform } from "react-native";
import * as Sentry from "@sentry/react-native";
import { fetchWithTimeout } from "../../shared/fetch-with-timeout";
import { FIREBASE_WEB_CONFIG, GOOGLE_IOS_CLIENT_ID, GOOGLE_WEB_CLIENT_ID } from "../../shared/firebase-config";
import { authProviderFromProviderIds, type AuthProvider, type AuthSession } from "./auth-state";

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
 * 2026-11-20 — iOS yayını: Apple Kuralı 4.8 (Google girişi sunan uygulama Apple girişini de sunmalı) gereği
 * Sign in with Apple (expo-apple-authentication, yalnızca iOS) eklendi; Google iOS'ta da çalışıyor. Apple ve
 * Google aynı giriş/bağlama/geçiş semantiğini paylaşıyor (signInWithProvider / linkProvider) — sağlayıcıya özel
 * olan yalnızca native credential'ı almak. Apple SDK'sı da bu dosyanın dışına çıkmıyor (AppleSignInButton
 * yalnızca native butonu çiziyor, kimlik akışına dokunmuyor).
 *
 * `@firebase/auth` doğrudan import ediliyor (firebase/auth şemsiyesi DEĞİL): Expo'nun TS
 * ayarındaki `react-native` koşulu sadece bu paketin export'larında tanımlı; böylece
 * `getReactNativePersistence` tip susturma olmadan kullanılabiliyor. Sürüm, `firebase`
 * paketinin sabitlediği sürümle AYNI (tek kopya).
 */

export class AuthConfigurationError extends Error {
  constructor() {
    super("Giriş yapılandırması eksik (EXPO_PUBLIC_FIREBASE_* / EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID / iOS'ta EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID).");
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

/**
 * 2026-11-20 — iOS yayını: iOS'ta Google Sign-In, iOS OAuth client id'si olmadan NATIVE olarak çöküyor (JS
 * hatası değil, yakalanamaz). Bu yüzden iOS'ta bu id, web client id'si gibi ZORUNLU yapılandırma sayılıyor ve
 * isAuthConfigured'a dahil: eksikse uygulama "unconfigured" ekranında kalır, Google hiç denenmez.
 * Neden "Google'ı gizle, yalnızca Apple'ı göster" DEĞİL: AccountLinkControl.onLinkAccount (Google) zorunlu ve
 * tüm paywall/hesap UI'ı onu varsayıyor; iOS build'inde bu id eksikse app.config.js URL şemasını da üretemez —
 * yani bu bir build yapılandırma hatası, çalışma zamanı seçeneği değil. Sessizce yarım bir giriş ekranıyla
 * yayına çıkmaktansa geliştirme/TestFlight'ta hemen fark edilmesi tercih edildi. Android'de değişiklik yok.
 */
function googlePlatformClientConfigured(): boolean {
  return Platform.OS !== "ios" || GOOGLE_IOS_CLIENT_ID !== undefined;
}

function ensureGoogleConfigured(): void {
  if (googleConfigured) return;
  if (!GOOGLE_WEB_CLIENT_ID || !googlePlatformClientConfigured()) throw new AuthConfigurationError();
  // iosClientId Android'de yok sayılır; undefined geçmek Android davranışını değiştirmez.
  GoogleSignin.configure({ webClientId: GOOGLE_WEB_CLIENT_ID, iosClientId: GOOGLE_IOS_CLIENT_ID });
  googleConfigured = true;
}

/** Giriş yapılandırması bu build'de var mı (env değerleri gömülmüş mü)? iOS'ta Google iOS client id'si dahil. */
export function isAuthConfigured(): boolean {
  return FIREBASE_WEB_CONFIG !== undefined && GOOGLE_WEB_CLIENT_ID !== undefined && googlePlatformClientConfigured();
}

/**
 * 2026-11-20 — Sign in with Apple yalnızca iOS'ta sunuluyor (Kural 4.8 iOS uygulaması için; Android'de Apple'ın
 * web akışı ayrı bir Services ID/redirect kurulumu ister ve ürün kararı olarak yok). Expo SDK 57'nin asgari iOS
 * sürümü Sign in with Apple'ı (iOS 13+) zaten kapsadığı için isAvailableAsync'in asenkron kontrolüne gerek yok.
 */
export function isAppleSignInAvailable(): boolean {
  return Platform.OS === "ios";
}

/**
 * Oturum değişikliklerini dinler (açılışta kalıcı oturum da bir kez bildirilir). Anonim oturum
 * da kalıcı: uygulama yeniden açılınca AYNI anonim kullanıcı (aynı ücretsiz hak sayacı) döner.
 * Not: `linkWithCredential` kullanıcıyı değiştirmediği için bu dinleyiciyi TETİKLEMEZ — bağlama
 * sonucu hook'ta ayrıca uygulanır (auth-state.ts, applyLinkSucceeded).
 */
export function subscribeToAuthState(listener: (session: AuthSession | null) => void): () => void {
  return onAuthStateChanged(getFirebaseAuth(), (user) =>
    listener(
      user === null
        ? null
        : { uid: user.uid, isAnonymous: user.isAnonymous, provider: authProviderFromProviderIds(user.providerData.map((info) => info.providerId)) },
    ),
  );
}

/** 2026-10-28 — girişsiz ilk 10 video: cihaza özel anonim Firebase kullanıcısı. */
export async function signInAsGuest(): Promise<void> {
  await signInAnonymously(getFirebaseAuth());
}

/** Native Google hesap seçici → Firebase credential'ı; kullanıcı vazgeçerse null. */
async function requestGoogleCredential(): Promise<OAuthCredential | null> {
  ensureGoogleConfigured();
  // 2026-11-20 — Play Services yalnızca Android kavramı; iOS'ta bu kontrol anlamsız.
  if (Platform.OS === "android") {
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
  }
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

/** expo-apple-authentication, kullanıcı Apple sayfasını kapatınca bu kodla reddediyor (Google'daki iptal gibi). */
function isAppleCancellation(error: unknown): boolean {
  return error instanceof Error && "code" in error && error.code === "ERR_REQUEST_CANCELED";
}

type AppleCredential = { credential: OAuthCredential; authorizationCode: string | null };

/**
 * 2026-11-20 — native Apple sayfası → Firebase credential'ı; kullanıcı vazgeçerse null.
 * Nonce: Firebase, Apple identity token'ındaki `nonce` alanının ham nonce'un SHA-256 (hex) özeti olduğunu
 * doğruluyor — token'ın bu istek için üretildiğini (tekrar oynatılmadığını) kanıtlar. Apple'a özet, Firebase'e
 * ham değer gider.
 * Scope YOK: backend kullanıcı satırı yalnızca firebase_uid tutuyor (users.schema.ts — e-posta/ad yok), uygulama
 * da ad/e-posta göstermiyor. Kullanmadığımız veriyi istememek Apple'ın veri asgarisi beklentisiyle de uyumlu.
 * `authorizationCode` yalnızca silmede Apple belirtecini iptal etmek için döndürülüyor (bkz. revokeAppleToken).
 */
async function requestAppleCredential(): Promise<AppleCredential | null> {
  if (!isAppleSignInAvailable()) throw new Error("Apple ile giriş bu cihazda kullanılamıyor.");
  const rawNonce = Array.from(Crypto.getRandomBytes(32), (byte) => byte.toString(16).padStart(2, "0")).join("");
  const hashedNonce = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, rawNonce);
  try {
    const appleCredential = await AppleAuthentication.signInAsync({ requestedScopes: [], nonce: hashedNonce });
    if (!appleCredential.identityToken) {
      throw new Error("Apple identity token alınamadı.");
    }
    return {
      credential: new OAuthProvider("apple.com").credential({ idToken: appleCredential.identityToken, rawNonce }),
      authorizationCode: appleCredential.authorizationCode,
    };
  } catch (error) {
    if (isAppleCancellation(error)) {
      return null;
    }
    throw error;
  }
}

async function requestAppleSignInCredential(): Promise<OAuthCredential | null> {
  return (await requestAppleCredential())?.credential ?? null;
}

/**
 * 2026-11-20 — sağlayıcıdan bağımsız kısım: native credential'ı alma ve "zaten başka hesaba bağlı" hatasından
 * credential'ı geri çıkarma. Giriş/bağlama/geçiş semantiği (aşağıda) Google ve Apple için BİREBİR aynı kalsın
 * diye tek yerde.
 */
type ProviderFlow = {
  requestCredential: () => Promise<OAuthCredential | null>;
  credentialFromError: (error: FirebaseError) => OAuthCredential | null;
};

const GOOGLE_FLOW: ProviderFlow = {
  requestCredential: requestGoogleCredential,
  credentialFromError: (error) => GoogleAuthProvider.credentialFromError(error),
};

const APPLE_FLOW: ProviderFlow = {
  requestCredential: requestAppleSignInCredential,
  credentialFromError: (error) => OAuthProvider.credentialFromError(error),
};

export type SignInOutcome = "signed-in" | "cancelled";
/** Geriye dönük ad (2026-10-27); yeni kod SignInOutcome kullanır. */
export type GoogleSignInOutcome = SignInOutcome;

async function signInWithProvider(flow: ProviderFlow): Promise<SignInOutcome> {
  const auth = getFirebaseAuth();
  const credential = await flow.requestCredential();
  if (credential === null) {
    return "cancelled";
  }
  await signInWithCredential(auth, credential);
  return "signed-in";
}

/** Oturum YOKKEN (çıkış yapmış, daha önce hesap bağlamış cihaz) Google ile giriş. */
export async function signInWithGoogle(): Promise<SignInOutcome> {
  return signInWithProvider(GOOGLE_FLOW);
}

/** 2026-11-20 — signInWithGoogle'ın Apple karşılığı (yalnızca iOS). */
export async function signInWithApple(): Promise<SignInOutcome> {
  return signInWithProvider(APPLE_FLOW);
}

/**
 * - "linked": Google/Apple hesabı mevcut anonim kullanıcıya bağlandı — Firebase UID (dolayısıyla
 *   backend kullanıcısı, tüketilen haklar, RevenueCat kimliği) DEĞİŞMEDİ.
 * - "switched": bu hesap zaten başka bir Firebase kullanıcısına bağlı; o hesaba geçildi
 *   (oturum dinleyicisi yeni kullanıcıyı yükler). Anonim hesabın hakları bırakılır — iki hesabın
 *   otomatik birleştirilmesi yok (bkz. 2026-10-27 kararı: sahiplik kanıtı olmadan birleştirme yok).
 */
export type LinkOutcome = "linked" | "switched" | "cancelled";

/**
 * 2026-11-20 — oturumun GERÇEK sağlayıcısı (providerData). "linked" sonucunda state'e istenen değil bu yazılır: kullanıcı
 * zaten diğer sağlayıcıyla bağlıysa linkProvider erken "linked" döner ve istenen sağlayıcı yanlış olurdu.
 */
export function currentAuthProvider(): AuthProvider | null {
  const user = getFirebaseAuth().currentUser;
  return user ? authProviderFromProviderIds(user.providerData.map((info) => info.providerId)) : null;
}

async function linkProvider(flow: ProviderFlow): Promise<LinkOutcome> {
  const auth = getFirebaseAuth();
  const user = auth.currentUser;
  if (!user) throw new NotSignedInError();
  if (!user.isAnonymous) return "linked";
  const credential = await flow.requestCredential();
  if (credential === null) {
    return "cancelled";
  }
  try {
    await linkWithCredential(user, credential);
    await user.getIdToken(true);
    return "linked";
  } catch (error) {
    if (error instanceof FirebaseError && error.code === "auth/credential-already-in-use") {
      await signInWithCredential(auth, flow.credentialFromError(error) ?? credential);
      return "switched";
    }
    throw error;
  }
}

export async function linkGoogleAccount(): Promise<LinkOutcome> {
  return linkProvider(GOOGLE_FLOW);
}

/** 2026-11-20 — linkGoogleAccount'un Apple karşılığı (yalnızca iOS). */
export async function linkAppleAccount(): Promise<LinkOutcome> {
  return linkProvider(APPLE_FLOW);
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

/**
 * 2026-11-20 — iOS yayını: Apple, Sign in with Apple kullanan hesap silindiğinde Apple belirtecinin de iptal
 * edilmesini (revoke) zorunlu tutuyor. Firebase JS SDK'sının `revokeAccessToken`'ı yalnızca tokenType
 * "ACCESS_TOKEN" gönderiyor (node_modules @firebase/auth dist/rn'de doğrulandı), oysa native Apple akışı bize
 * bir `authorizationCode` veriyor. Bu yüzden native Firebase iOS SDK'sının yaptığı isteğin AYNISI doğrudan
 * Identity Toolkit'e atılıyor: tokenType "CODE", token = authorizationCode; Firebase kodu Apple'da belirtece
 * çevirip iptal ediyor. Önkoşul: Firebase konsolunda Apple sağlayıcısına Team ID / Key ID / özel anahtar
 * (Services ID ayarları) girilmiş olmalı — aksi hâlde istek hata döner (silmeyi DURDURMAZ, bkz. reauthenticateForDeletion).
 * X-Ios-Bundle-Identifier: native SDK her istekte gönderiyor; Firebase kodun audience'ını (bundle id) bununla eşleştiriyor.
 * Değer app.json ios.bundleIdentifier ile AYNI olmalı.
 * authorizationCode tek kullanımlık ve ~5 dakika geçerli: her deneme taze bir Apple doğrulamasıyla gelir.
 */
const IOS_BUNDLE_IDENTIFIER = "app.looplish.mobile";

async function revokeAppleToken(authorizationCode: string, idToken: string): Promise<void> {
  if (!FIREBASE_WEB_CONFIG) throw new AuthConfigurationError();
  const response = await fetchWithTimeout(
    `https://identitytoolkit.googleapis.com/v2/accounts:revokeToken?key=${encodeURIComponent(FIREBASE_WEB_CONFIG.apiKey)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Ios-Bundle-Identifier": IOS_BUNDLE_IDENTIFIER },
      body: JSON.stringify({ providerId: "apple.com", tokenType: "CODE", token: authorizationCode, idToken }),
    },
  );
  if (!response.ok) {
    throw new Error(`Apple belirteci iptal edilemedi (HTTP ${response.status}).`);
  }
}

/**
 * Yıkıcı hesap silmeden önce mağaza hesabı değil Firebase hesabı taze credential ile doğrulanır.
 * 2026-11-20 — yeniden doğrulama kullanıcının GERÇEKTEN bağlı olduğu sağlayıcıyla (providerData) yapılır: Apple
 * kullanıcısından Google istemek hem çalışmaz (farklı hesap → auth/user-mismatch) hem de kafa karıştırır.
 * Apple'da yeniden doğrulamanın hemen ardından Apple belirteci iptal edilir. 2026-11-20 inceleme kararı: iptal
 * başarısız olursa Sentry'ye bildirilir ve silme YİNE DE sürer — iptali silmenin önkoşulu yapmak, bir konsol yapılandırma
 * hatasında (Apple key eksik/yanlış) HİÇBİR Apple kullanıcısının hesabını silememesi demekti; bu hem kullanıcının
 * silme hakkını engeller hem de App Store 5.1.1(v) reddi getirir. İptalin gerçekten 200 döndüğü TestFlight'ta doğrulanır
 * (docs/ios-release-checklist.md). true dönmesi = "silme isteği atılabilir".
 * İptal silmeden ÖNCE: backend silme sonrası Firebase kullanıcısı/ID token'ı geçersizleşebilir, o zaman revoke
 * isteğindeki idToken reddedilirdi.
 */
export async function reauthenticateForDeletion(): Promise<boolean> {
  const user = getFirebaseAuth().currentUser;
  if (!user || user.isAnonymous) throw new NotSignedInError();
  const provider = authProviderFromProviderIds(user.providerData.map((info) => info.providerId));
  if (provider === "apple") {
    const apple = await requestAppleCredential();
    if (!apple) return false;
    if (!apple.authorizationCode) throw new Error("Apple authorization code alınamadı (belirteç iptal edilemez).");
    await reauthenticateWithCredential(user, apple.credential);
    const idToken = await user.getIdToken(true);
    await revokeAppleToken(apple.authorizationCode, idToken).catch((error: unknown) => Sentry.captureException(error));
    return true;
  }
  if (provider === null) throw new Error("Hesabın giriş sağlayıcısı belirlenemedi.");
  const credential = await requestGoogleCredential();
  if (!credential) return false;
  await reauthenticateWithCredential(user, credential);
  await user.getIdToken(true);
  return true;
}
