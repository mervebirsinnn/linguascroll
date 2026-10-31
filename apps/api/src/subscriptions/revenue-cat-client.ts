import { Injectable, Logger, ServiceUnavailableException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { SubscriptionDetails } from "@linguascroll/shared-types";
import { z } from "zod";

const payloadSchema = z.object({ subscriber: z.object({
  entitlements: z.record(z.object({ expires_date: z.string().nullable(), product_identifier: z.string().optional().nullable(), grace_period_expires_date: z.string().optional().nullable() })),
  subscriptions: z.record(z.object({ unsubscribe_detected_at: z.string().optional().nullable(), billing_issues_detected_at: z.string().optional().nullable(), period_type: z.string().optional() })).optional(),
}) });
export const NO_SUBSCRIPTION: SubscriptionDetails = { active: false, expiresAt: null, renewal: "unknown", period: "unknown", productId: null };

/** Yalnızca yapılandırılmış entitlement yetki verir; bozuk yanıt lifetime gibi yorumlanmaz. */
export function parseSubscription(body: unknown, entitlementId: string, now = Date.now()): SubscriptionDetails {
  const { subscriber } = payloadSchema.parse(body);
  const entitlement = subscriber.entitlements[entitlementId];
  if (!entitlement) return { ...NO_SUBSCRIPTION };
  const dates = [entitlement.expires_date, entitlement.grace_period_expires_date].filter((d): d is string => typeof d === "string");
  if (dates.some((d) => !Number.isFinite(Date.parse(d)))) throw new Error("Geçersiz abonelik tarihi");
  const expiresAt = dates.length ? new Date(Math.max(...dates.map(Date.parse))).toISOString() : null;
  const subscription = entitlement.product_identifier ? subscriber.subscriptions?.[entitlement.product_identifier] : undefined;
  const period = subscription?.period_type?.toLowerCase();
  return {
    active: expiresAt === null || Date.parse(expiresAt) > now,
    expiresAt,
    productId: entitlement.product_identifier ?? null,
    renewal: subscription?.billing_issues_detected_at ? "billing_issue" : subscription?.unsubscribe_detected_at ? "cancelled" : subscription ? "renews" : "unknown",
    period: period === "trial" || period === "intro" || period === "normal" ? period : "unknown",
  };
}

@Injectable()
export class RevenueCatClient {
  private readonly logger = new Logger(RevenueCatClient.name);
  private readonly secret: string | undefined;
  private readonly entitlementId: string;
  constructor(config: ConfigService) {
    this.secret = config.get<string>("REVENUECAT_SECRET_API_KEY");
    this.entitlementId = config.get<string>("REVENUECAT_ENTITLEMENT_ID") ?? "premium";
  }

  /** Hesabım/ödeme doğrulaması hata ile abonelik yok durumunu ayırır. Ağ çağrısı zaman sınırlıdır. */
  async readSubscription(userId: string): Promise<SubscriptionDetails> {
    if (!this.secret) throw new ServiceUnavailableException("Abonelik doğrulaması yapılandırılmadı");
    try {
      const response = await fetch(`https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(userId)}`, {
        headers: { Authorization: `Bearer ${this.secret}` }, signal: AbortSignal.timeout(8000),
      });
      if (response.status === 404) return { ...NO_SUBSCRIPTION };
      if (!response.ok) throw new Error(`RevenueCat HTTP ${response.status}`);
      return parseSubscription(await response.json(), this.entitlementId);
    } catch (error) {
      this.logger.warn(`Abonelik servisi doğrulanamadı: ${error instanceof Error ? error.message : "beklenmeyen hata"}`);
      throw new ServiceUnavailableException("Abonelik şu an doğrulanamıyor. Tekrar dene.");
    }
  }

  /** Erişim politikasında kesinti hiçbir zaman sınırsız hak açmaz. */
  async checkEntitlement(userId: string): Promise<boolean> {
    try { return (await this.readSubscription(userId)).active; } catch { return false; }
  }
}
