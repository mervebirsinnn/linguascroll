import { currentUserSchema, type CurrentUser } from "@linguascroll/shared-types";
import { API_BASE_URL } from "../../../shared/api-base-url";
import { authHeaders } from "../auth-headers";

/**
 * 2026-10-27 — giriş yapmış kullanıcının SABİT backend id'si (ilk çağrıda backend kullanıcıyı
 * yaratır). Bu id RevenueCat App User ID'si olarak kullanılır; backend entitlement'ı aynı id ile
 * sorguladığı için abonelik her zaman doğru hesaba bağlanır.
 */
export async function fetchCurrentUser(): Promise<CurrentUser> {
  const response = await fetch(`${API_BASE_URL}/me`, { headers: await authHeaders() });

  if (!response.ok) {
    throw new Error(`Kullanıcı bilgisi alınamadı: ${response.status} ${response.statusText}`);
  }

  const json: unknown = await response.json();
  return currentUserSchema.parse(json);
}
