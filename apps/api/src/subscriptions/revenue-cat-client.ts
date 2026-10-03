import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

const REVENUE_CAT_API_BASE_URL = "https://api.revenuecat.com/v1";

/**
 * 2026-10-01 — RevenueCat'in server-side REST API'sine (webhook YOK, bkz.
 * subscriptions.service.ts yorumu) canlı bir "bu kullanıcının aktif bir
 * entitlement'ı var mı" sorgusu. `REVENUECAT_SECRET_API_KEY` tanımsızsa
 * (local dev, henüz gerçek bir RevenueCat hesabı yokken) HER ZAMAN `false`
 * döner — R2_PUBLIC_BASE_URL'in VideosService'teki optional-config deseniyle
 * AYNI (bkz. videos.service.ts, boot-time zorunluluk yok).
 *
 * Hata durumunda (network, 4xx/5xx, timeout) THROW ETMİYOR — `false` döner ve
 * loglar. Bu bilinçli bir "fail-closed": ücretsiz günlük limit geçerli kalır,
 * bir RevenueCat kesintisi asla sessizce sınırsız erişim açmaz (`check-user-exists.ts`'in
 * mobile'daki "hatada güvenli tarafa düş" deseniyle AYNI karar).
 */
@Injectable()
export class RevenueCatClient {
  private readonly logger = new Logger(RevenueCatClient.name);
  private readonly secretApiKey: string | undefined;

  constructor(configService: ConfigService) {
    this.secretApiKey = configService.get<string>("REVENUECAT_SECRET_API_KEY");
  }

  async checkEntitlement(userId: string): Promise<boolean> {
    if (!this.secretApiKey) {
      return false;
    }

    try {
      const response = await fetch(`${REVENUE_CAT_API_BASE_URL}/subscribers/${encodeURIComponent(userId)}`, {
        headers: { Authorization: `Bearer ${this.secretApiKey}` },
      });

      if (!response.ok) {
        // RevenueCat, hiç abonelik denemesi olmamış bir app_user_id için 404
        // döner — bu bir hata değil, "hiç entitlement'ı yok" ile aynı anlama
        // gelir, loglamaya değmez. Diğer hata kodları (401/5xx/vb.) gerçek bir
        // sorun olabilir, logluyoruz ama yine de fail-closed (false) dönüyoruz.
        if (response.status !== 404) {
          this.logger.warn(`RevenueCat API ${response.status} döndü (userId: ${userId})`);
        }
        return false;
      }

      const body: unknown = await response.json();
      return hasActiveEntitlement(body);
    } catch (error) {
      this.logger.warn(`RevenueCat API çağrısı başarısız oldu (userId: ${userId}): ${error instanceof Error ? error.message : String(error)}`);
      return false;
    }
  }
}

/**
 * RevenueCat'in `GET /subscribers/{id}` response şekli:
 * `{ subscriber: { entitlements: { [entitlementId]: { expires_date: string | null } } } }`.
 * `expires_date: null` süresiz aktif (lifetime) demek; doluysa gelecekte mi
 * geçmişte mi olduğuna bakılır. Hangi entitlement id'sinin tanımlı olduğu
 * RevenueCat dashboard'unda kullanıcının (henüz) seçmediği bir isim — bu yüzden
 * TEK bir sabit entitlement adı aramak yerine, dönen nesnedeki HERHANGİ bir
 * entitlement'ın aktif olup olmadığına bakılıyor (v1'de tek bir ürün/plan var).
 */
function hasActiveEntitlement(body: unknown): boolean {
  if (typeof body !== "object" || body === null || !("subscriber" in body)) {
    return false;
  }
  const subscriber = (body as { subscriber?: unknown }).subscriber;
  if (typeof subscriber !== "object" || subscriber === null || !("entitlements" in subscriber)) {
    return false;
  }
  const entitlements = (subscriber as { entitlements?: unknown }).entitlements;
  if (typeof entitlements !== "object" || entitlements === null) {
    return false;
  }
  const now = Date.now();
  return Object.values(entitlements).some((entitlement) => {
    if (typeof entitlement !== "object" || entitlement === null || !("expires_date" in entitlement)) {
      return false;
    }
    const expiresDate = (entitlement as { expires_date?: unknown }).expires_date;
    if (expiresDate === null || expiresDate === undefined) {
      return true;
    }
    return typeof expiresDate === "string" && new Date(expiresDate).getTime() > now;
  });
}
