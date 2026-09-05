import { saveWordRequestSchema } from "@linguascroll/shared-types";
import { API_BASE_URL } from "../../../shared/api-base-url";

/** PUT /words/:wordId/saved — idempotent (backend ON CONFLICT DO NOTHING), response body yok. */
export async function saveWord(wordId: string, userId: string): Promise<void> {
  const body = saveWordRequestSchema.parse({ userId });

  const response = await fetch(`${API_BASE_URL}/words/${wordId}/saved`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`Kelime kaydedilemedi: ${response.status} ${response.statusText}`);
  }
}
