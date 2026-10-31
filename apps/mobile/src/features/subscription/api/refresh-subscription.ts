import { fetchWithTimeout } from "../../../shared/fetch-with-timeout";
import { subscriptionStatusSchema, type SubscriptionStatus } from "@linguascroll/shared-types";
import { API_BASE_URL } from "../../../shared/api-base-url";
import { authHeaders } from "../../identity/auth-headers";

/**
 * 2026-10-27 — satın alma/geri yükleme başarılı bittikten sonra backend'e aboneliği
 * RevenueCat'ten YENİDEN doğrulatır (backend önbelleği atlar). Mobildeki "purchased"
 * sonucu tek başına yetki değil: erişim, bu doğrulanmış `active: true` yanıtıyla açılır.
 */
export async function refreshSubscription(): Promise<SubscriptionStatus> {
  // Gövdesiz: kimlik doğrulanmış Firebase token'ından — başka bir hesabın aboneliği sorgulanamaz.
  const response = await fetchWithTimeout(`${API_BASE_URL}/subscriptions/refresh`, {
    method: "POST",

    headers: await authHeaders(),
  });

  if (!response.ok) {
    if (__DEV__) console.warn("[subscriptions] Backend doğrulaması başarısız", { status: response.status });
    throw new Error(`Abonelik doğrulanamadı: ${response.status} ${response.statusText}`);
  }

  const json: unknown = await response.json();
  return subscriptionStatusSchema.parse(json);
}
