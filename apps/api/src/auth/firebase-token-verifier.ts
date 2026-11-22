import { Injectable, UnauthorizedException, ServiceUnavailableException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth, type Auth } from "firebase-admin/auth";


/**
 * 2026-11-20 — iOS yayını: silme yalnızca SON 5 DAKİKADA gerçek bir hesap sağlayıcısıyla yeniden doğrulanmış token'la
 * yapılır. Eskiden yalnızca "google.com" kabul ediliyordu; iOS'ta Sign in with Apple eklenince Apple kullanıcısının
 * token'ı ("apple.com") her silmede 401 alıyordu → Apple kullanıcısı hesabını HİÇ silemezdi (App Store 5.1.1(v) reddi).
 * "anonymous" bilinçli olarak dışarıda: misafirin silinecek kalıcı hesabı yok ve taze doğrulama kanıtı olamaz.
 */
const DELETION_PROVIDERS: ReadonlySet<string> = new Set(["google.com", "apple.com"]);

export function isFreshDeletionLogin(decoded: { auth_time: number; firebase?: { sign_in_provider?: string } }, nowSeconds: number): boolean {
  return Number.isFinite(decoded.auth_time)
    && nowSeconds - decoded.auth_time <= 300
    && decoded.auth_time <= nowSeconds + 60
    && DELETION_PROVIDERS.has(decoded.firebase?.sign_in_provider ?? "");
}

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
  private readonly canDelete: boolean;

  constructor(configService: ConfigService) {
    const projectId = configService.getOrThrow<string>("FIREBASE_PROJECT_ID");
    const credentialJson = configService.get<string>("FIREBASE_ADMIN_SERVICE_ACCOUNT_JSON");
    this.canDelete = Boolean(credentialJson);
    const credential = credentialJson ? cert(JSON.parse(credentialJson)) : undefined;
    const app = getApps().find((existing) => existing.name === FIREBASE_APP_NAME) ?? initializeApp({ projectId, ...(credential ? { credential } : {}) }, FIREBASE_APP_NAME);
    this.auth = getAuth(app);
  }

  async verifyDeletionToken(token: string): Promise<string> {
    if (!this.canDelete) throw new ServiceUnavailableException("Hesap silme şu an kullanılamıyor. Destek ekibiyle iletişime geç.");
    let decoded;
    try { decoded = await this.auth.verifyIdToken(token); }
    catch (error) {
      const code = typeof error === "object" && error !== null && "code" in error ? String(error.code) : undefined;
      if (code && INVALID_TOKEN_ERROR_CODES.has(code)) throw new UnauthorizedException("Hesabınla yeniden doğrula");
      throw new ServiceUnavailableException("Kimlik doğrulanamadı; tekrar dene.");
    }
    if (!isFreshDeletionLogin(decoded, Date.now() / 1000)) {
      throw new UnauthorizedException("Hesabını silmek için hesabınla yeniden doğrula");
    }
    return decoded.uid;
  }

  async deleteFirebaseUser(uid: string): Promise<void> {
    try { await this.auth.deleteUser(uid); }
    catch (error) {
      if (typeof error === "object" && error !== null && "code" in error && error.code === "auth/user-not-found") return;
      throw new ServiceUnavailableException("Hesap silme tamamlanamadı; tekrar deneyebilirsin.");
    }
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
