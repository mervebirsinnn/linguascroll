import { fetchWithTimeout } from "../../../shared/fetch-with-timeout";
import { subscriptionOverviewSchema, type SubscriptionOverview } from "@linguascroll/shared-types";
import { API_BASE_URL } from "../../../shared/api-base-url";
import { authHeaders } from "../../identity/auth-headers";

export async function fetchSubscriptionOverview(): Promise<SubscriptionOverview> {
  const response = await fetchWithTimeout(`${API_BASE_URL}/subscriptions/status`, { headers: await authHeaders() });
  if (!response.ok) throw new Error(`Abonelik bilgisi alınamadı: ${response.status}`);
  return subscriptionOverviewSchema.parse(await response.json());
}
