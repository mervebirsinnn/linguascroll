import { userExistsResponseSchema } from "@linguascroll/shared-types";
import { API_BASE_URL } from "../../../shared/api-base-url";

/**
 * AsyncStorage'da saklı bir userId'nin backend'de HÂLÂ var olup olmadığını
 * sorar (bkz. use-anonymous-user-id.ts). Ağ hatası/beklenmeyen bir durumda
 * `false` döner (fail-safe: "emin değilsek yeni bir kullanıcı yaratmak", eski
 * ama artık geçersiz bir id'yi sessizce kullanmaya çalışıp her istekte 400
 * almaktan daha güvenli) — ayrı bir retry/backoff mekanizması YOK, bu sadece
 * app açılışında bir kere çalışan bir bootstrap kontrolü.
 */
export async function checkUserExists(userId: string): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE_URL}/users/${userId}/exists`);
    if (!response.ok) {
      return false;
    }
    const json: unknown = await response.json();
    return userExistsResponseSchema.parse(json).exists;
  } catch {
    return false;
  }
}
