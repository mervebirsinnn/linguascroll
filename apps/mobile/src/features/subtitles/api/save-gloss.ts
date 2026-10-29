import { fetchWithTimeout } from "../../../shared/fetch-with-timeout";
import { saveGlossResponseSchema, saveGlossRequestSchema } from "@linguascroll/shared-types";
import { API_BASE_URL } from "../../../shared/api-base-url";
import { authHeaders } from "../../identity/auth-headers";
export async function saveGloss(segmentId: string, word: string) {
  const response = await fetchWithTimeout(`${API_BASE_URL}/words/saved-glosses`, {
    method: "POST", headers: { ...(await authHeaders()), "Content-Type": "application/json" },
    body: JSON.stringify(saveGlossRequestSchema.parse({ segmentId, word })), 
  });
  if (!response.ok) throw new Error("Kelime kaydedilemedi");
  return saveGlossResponseSchema.parse(await response.json());
}
