import { API_BASE_URL } from "../../../shared/api-base-url";
import { authHeaders } from "../../identity/auth-headers";

/** DELETE /words/:wordId/saved — idempotent (backend: var olmayan ilişkiyi silmek no-op), response body yok. */
export async function unsaveWord(wordId: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/words/${wordId}/saved`, {
    method: "DELETE",
    headers: await authHeaders(),
  });

  if (!response.ok) {
    throw new Error(`Kelime kaydı kaldırılamadı: ${response.status} ${response.statusText}`);
  }
}
