// 2026-11-20 — iOS yayın öncesi kontrol: Apple ile bağlama / kayıtlı hesaba geçiş / silme+iptal yolları. auth-gateway
// SDK adaptörü olduğu için Firebase, Apple, Google ve ağ katmanı sahte; burada doğrulanan şey adaptörün SDK'ları
// HANGİ argümanlarla, HANGİ sırada çağırdığı ve sonucu nasıl sınıflandırdığı (gerçek Firebase/Apple davranışı TestFlight'ta).

const mockUser = {
  uid: "guest-uid",
  isAnonymous: true,
  providerData: [] as { providerId: string }[],
  getIdToken: jest.fn(async () => "firebase-id-token"),
};
const mockAuth = { currentUser: mockUser as typeof mockUser | null };

jest.mock("react-native", () => ({ Platform: { OS: "ios" } }));
jest.mock("@react-native-async-storage/async-storage", () => ({}));
jest.mock("@sentry/react-native", () => ({ captureException: jest.fn() }));
jest.mock("../../shared/fetch-with-timeout", () => ({ fetchWithTimeout: jest.fn() }));
jest.mock("../../shared/firebase-config", () => ({
  FIREBASE_WEB_CONFIG: { apiKey: "public-api-key", authDomain: "x", projectId: "x", appId: "x" },
  GOOGLE_WEB_CLIENT_ID: "web-client",
  GOOGLE_IOS_CLIENT_ID: "123-abc.apps.googleusercontent.com",
}));
jest.mock("firebase/app", () => {
  class FirebaseError extends Error {
    constructor(public code: string, message: string) {
      super(message);
    }
  }
  return { FirebaseError, getApps: () => [{}], getApp: () => ({}), initializeApp: jest.fn() };
});
jest.mock("@firebase/auth", () => {
  class OAuthProvider {
    static credentialFromError = jest.fn();
    constructor(public providerId: string) {}
    credential(options: { idToken: string; rawNonce: string }) {
      return { providerId: this.providerId, ...options };
    }
  }
  return {
    OAuthProvider,
    GoogleAuthProvider: { credential: jest.fn(), credentialFromError: jest.fn() },
    initializeAuth: jest.fn(() => mockAuth),
    getAuth: jest.fn(() => mockAuth),
    getReactNativePersistence: jest.fn(),
    linkWithCredential: jest.fn(),
    signInWithCredential: jest.fn(),
    reauthenticateWithCredential: jest.fn(),
    onAuthStateChanged: jest.fn(),
    signInAnonymously: jest.fn(),
    signOut: jest.fn(),
  };
});
jest.mock("@react-native-google-signin/google-signin", () => ({
  GoogleSignin: { configure: jest.fn(), signIn: jest.fn(), signOut: jest.fn(), hasPlayServices: jest.fn() },
  isErrorWithCode: () => false,
  isSuccessResponse: () => true,
  statusCodes: {},
}));
jest.mock("expo-crypto", () => ({
  getRandomBytes: (n: number) => new Uint8Array(n).fill(171),
  digestStringAsync: jest.fn(async (_algorithm: string, value: string) => `sha256(${value})`),
  CryptoDigestAlgorithm: { SHA256: "SHA-256" },
}));
jest.mock("expo-apple-authentication", () => ({ signInAsync: jest.fn() }));

import * as AppleAuthentication from "expo-apple-authentication";
import * as Sentry from "@sentry/react-native";
import { FirebaseError } from "firebase/app";
import { linkWithCredential, OAuthProvider, reauthenticateWithCredential, signInWithCredential } from "@firebase/auth";
import { fetchWithTimeout } from "../../shared/fetch-with-timeout";
import { linkAppleAccount, reauthenticateForDeletion } from "./auth-gateway";

const RAW_NONCE = "ab".repeat(32);
const appleSignIn = jest.mocked(AppleAuthentication.signInAsync);
const link = jest.mocked(linkWithCredential);
const signIn = jest.mocked(signInWithCredential);
const reauth = jest.mocked(reauthenticateWithCredential);
const fetchMock = jest.mocked(fetchWithTimeout);
const credentialFromError = jest.mocked(OAuthProvider.credentialFromError);

function appleResponse(overrides: Partial<{ identityToken: string | null; authorizationCode: string | null }> = {}) {
  return { identityToken: "apple-identity-token", authorizationCode: "apple-auth-code", user: "apple-sub", ...overrides } as Awaited<ReturnType<typeof AppleAuthentication.signInAsync>>;
}
function cancelledError(): Error {
  return Object.assign(new Error("The user canceled the authorization attempt"), { code: "ERR_REQUEST_CANCELED" });
}

beforeEach(() => {
  jest.clearAllMocks();
  mockAuth.currentUser = mockUser;
  mockUser.uid = "guest-uid";
  mockUser.isAnonymous = true;
  mockUser.providerData = [];
});

describe("linkAppleAccount", () => {
  it("YENİ Apple hesabı misafire bağlanır: aynı Firebase kullanıcısı, oturum değişmez (UID → backend id → RevenueCat id korunur)", async () => {
    appleSignIn.mockResolvedValue(appleResponse());
    link.mockResolvedValue({} as Awaited<ReturnType<typeof linkWithCredential>>);

    await expect(linkAppleAccount()).resolves.toBe("linked");

    // Apple'a ham nonce'un özeti, Firebase'e ham nonce + identity token gider; kişisel veri scope'u istenmez.
    expect(appleSignIn).toHaveBeenCalledWith({ requestedScopes: [], nonce: `sha256(${RAW_NONCE})` });
    expect(link).toHaveBeenCalledWith(mockUser, { providerId: "apple.com", idToken: "apple-identity-token", rawNonce: RAW_NONCE });
    expect(signIn).not.toHaveBeenCalled();
    expect(mockAuth.currentUser?.uid).toBe("guest-uid");
  });

  it("DAHA ÖNCE bağlanmış Apple hesabı (temiz kurulum misafiri): credential-already-in-use → o hesaba geçilir", async () => {
    appleSignIn.mockResolvedValue(appleResponse());
    link.mockRejectedValue(new FirebaseError("auth/credential-already-in-use", "already linked"));
    const recovered = { providerId: "apple.com", idToken: "recovered" };
    credentialFromError.mockReturnValue(recovered as unknown as ReturnType<typeof OAuthProvider.credentialFromError>);

    await expect(linkAppleAccount()).resolves.toBe("switched");
    expect(signIn).toHaveBeenCalledWith(mockAuth, recovered);
  });

  it("credentialFromError null dönerse orijinal Apple credential'ıyla geçilir", async () => {
    appleSignIn.mockResolvedValue(appleResponse());
    link.mockRejectedValue(new FirebaseError("auth/credential-already-in-use", "already linked"));
    credentialFromError.mockReturnValue(null);

    await expect(linkAppleAccount()).resolves.toBe("switched");
    expect(signIn).toHaveBeenCalledWith(mockAuth, { providerId: "apple.com", idToken: "apple-identity-token", rawNonce: RAW_NONCE });
  });

  it("kullanıcı Apple sayfasını kapatırsa 'cancelled'; Firebase'e dokunulmaz", async () => {
    appleSignIn.mockRejectedValue(cancelledError());
    await expect(linkAppleAccount()).resolves.toBe("cancelled");
    expect(link).not.toHaveBeenCalled();
  });

  it("başka bir bağlama hatası yutulmaz", async () => {
    appleSignIn.mockResolvedValue(appleResponse());
    link.mockRejectedValue(new FirebaseError("auth/invalid-credential", "audience mismatch"));
    await expect(linkAppleAccount()).rejects.toThrow("audience mismatch");
    expect(signIn).not.toHaveBeenCalled();
  });
});

describe("reauthenticateForDeletion (Apple kullanıcısı)", () => {
  beforeEach(() => {
    mockUser.uid = "apple-uid";
    mockUser.isAnonymous = false;
    mockUser.providerData = [{ providerId: "apple.com" }];
  });

  it("Apple ile yeniden doğrular, ardından Firebase revokeToken sözleşmesiyle authorization code'u iptal eder", async () => {
    appleSignIn.mockResolvedValue(appleResponse());
    fetchMock.mockResolvedValue({ ok: true, status: 200 } as Response);

    await expect(reauthenticateForDeletion()).resolves.toBe(true);

    expect(reauth).toHaveBeenCalledWith(mockUser, { providerId: "apple.com", idToken: "apple-identity-token", rawNonce: RAW_NONCE });
    expect(mockUser.getIdToken).toHaveBeenCalledWith(true);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://identitytoolkit.googleapis.com/v2/accounts:revokeToken?key=public-api-key");
    expect(init?.method).toBe("POST");
    expect(init?.headers).toEqual({ "Content-Type": "application/json", "X-Ios-Bundle-Identifier": "app.looplish.mobile" });
    // Apple identity token iptale GİTMEZ (yalnızca Firebase'e giriş kanıtı); iptal edilen authorization code.
    expect(JSON.parse(String(init?.body))).toEqual({ providerId: "apple.com", tokenType: "CODE", token: "apple-auth-code", idToken: "firebase-id-token" });
    expect(reauth.mock.invocationCallOrder[0]).toBeLessThan(fetchMock.mock.invocationCallOrder[0]);
  });

  it("kullanıcı Apple sayfasını kapatırsa false: yeniden doğrulama/iptal yok, silme isteği atılmaz", async () => {
    appleSignIn.mockRejectedValue(cancelledError());
    await expect(reauthenticateForDeletion()).resolves.toBe(false);
    expect(reauth).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("iptal servisi hata verirse silme sürer; Sentry'ye giden hata token/code içermez", async () => {
    appleSignIn.mockResolvedValue(appleResponse());
    fetchMock.mockResolvedValue({ ok: false, status: 400 } as Response);

    await expect(reauthenticateForDeletion()).resolves.toBe(true);
    const captured = jest.mocked(Sentry.captureException).mock.calls[0][0];
    expect(String(captured)).toContain("HTTP 400");
    const serialized = JSON.stringify(captured) + String(captured);
    for (const secret of ["apple-auth-code", "apple-identity-token", "firebase-id-token", RAW_NONCE]) {
      expect(serialized).not.toContain(secret);
    }
  });

  it("Apple yeniden doğrulaması başarısızsa hata fırlar (silme isteği atılmaz) ve iptal denenmez", async () => {
    appleSignIn.mockResolvedValue(appleResponse());
    reauth.mockRejectedValueOnce(new FirebaseError("auth/user-mismatch", "different apple id"));
    await expect(reauthenticateForDeletion()).rejects.toThrow("different apple id");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("authorization code gelmezse hata fırlar (iptal edilemeyen silme başlatılmaz)", async () => {
    appleSignIn.mockResolvedValue(appleResponse({ authorizationCode: null }));
    await expect(reauthenticateForDeletion()).rejects.toThrow();
    expect(reauth).not.toHaveBeenCalled();
  });
});
