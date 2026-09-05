import { API_BASE_URL } from "../../../shared/api-base-url";

/** DELETE /words/:wordId/saved — idempotent (backend: var olmayan ilişkiyi silmek no-op), response body yok. */
export async function unsaveWord(wordId: string, userId: string): Promise<void> {
  const params = new URLSearchParams({ userId });
  const response = await fetch(`${API_BASE_URL}/words/${wordId}/saved?${params.toString()}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    throw new Error(`Kelime kaydı kaldırılamadı: ${response.status} ${response.statusText}`);
  }
}
