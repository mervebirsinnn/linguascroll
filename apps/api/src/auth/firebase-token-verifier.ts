import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { getApps, initializeApp } from "firebase-admin/app";
import { getAuth, type Auth } from "firebase-admin/auth";

/** Default app yerine adlandırılmış app: başka bir kod parçası default Firebase app'i başka ayarla açarsa çakışmasın. */
const FIREBASE_APP_NAME = "linguascroll-auth";

/**
 * Bu hata kodları "token geçersiz" demek (→ 401). Diğer her şey (ör. Google'ın public
 * sertifikalarına ulaşılamaması: auth/internal-error) bir altyapı hatasıdır ve 401'e
 * GİZLENMEZ — fırlatılır, global filter 500'e çevirir ve Sentry'ye düşer.
 */
const INVALID_TOKEN_ERROR_CODES = new Set([
  "auth/argument-error",
  "auth/invalid-argument",
  "auth/id-token-expired",
  "auth/id-token-revoked",
  "auth/invalid-id-token",
  "auth/user-disabled",
]);

/**
 * 2026-10-27 — Firebase Authentication ID token doğrulaması (resmi firebase-admin).
 * `verifyIdToken` şunları kontrol eder: RS256 imzası (Google'ın securetoken public anahtarları,
 * önbellekli), `iss` = https://securetoken.google.com/<projectId>, `aud` = <projectId>,
 * `exp` gelecekte, `iat`/`auth_time` geçmişte, `sub` boş değil. Doğrulanmış kimlik = `uid` (`sub`).
 *
 * Sadece token DOĞRULAMA yaptığı için servis hesabı/credential gerekmiyor — projectId yeterli.
 * İptal edilmiş oturum kontrolü (`checkRevoked`) credential gerektirdiği için KAPALI: hesabı
 * Firebase'de devre dışı bırakmak, mevcut token'ın süresi (≤1 saat) dolunca etkili olur.
 *
 * 2026-10-28 — giriş sağlayıcısına BİLİNÇLİ olarak bakılmıyor: mobil ilk 10 video için ANONİM
 * Firebase oturumu açıyor (sign_in_provider = "anonymous") ve bu token da geçerli bir kimlik.
 * Google hesabı sonradan bu kullanıcıya bağlanınca `uid` değişmez → backend kullanıcısı, tüketilen
 * ücretsiz haklar ve RevenueCat kimliği aynı kalır. Satın alma için hesap bağlama şartını mobil
 * paywall uyguluyor; backend için anonim ya da Google kullanıcısı aynı kurallara tabi.
 */
@Injectable()
export class FirebaseTokenVerifier {
  private readonly auth: Auth;

  constructor(configService: ConfigService) {
    const projectId = configService.getOrThrow<string>("FIREBASE_PROJECT_ID");
    const app = getApps().find((existing) => existing.name === FIREBASE_APP_NAME) ?? initializeApp({ projectId }, FIREBASE_APP_NAME);
    this.auth = getAuth(app);
  }

  /** Geçerliyse Firebase UID, geçersizse null. Altyapı hatasında fırlatır. */
  async verify(idToken: string): Promise<string | null> {
    try {
      const decoded = await this.auth.verifyIdToken(idToken);
      return decoded.uid;
    } catch (error) {
      const code = typeof error === "object" && error !== null && "code" in error ? String((error as { code: unknown }).code) : undefined;
      if (code !== undefined && INVALID_TOKEN_ERROR_CODES.has(code)) {
        return null;
      }
      throw error;
    }
  }
}
