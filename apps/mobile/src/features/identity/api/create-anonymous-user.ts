import { anonymousUserSchema, type AnonymousUser } from "@linguascroll/shared-types";
import { API_BASE_URL } from "../../../shared/api-base-url";

export async function createAnonymousUser(): Promise<AnonymousUser> {
  const response = await fetch(`${API_BASE_URL}/users/anonymous`, { method: "POST" });

  if (!response.ok) {
    throw new Error(`Anonim kullanıcı oluşturulamadı: ${response.status} ${response.statusText}`);
  }

  const json: unknown = await response.json();
  return anonymousUserSchema.parse(json);
}
