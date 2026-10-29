import { fetchWithTimeout } from "../../../shared/fetch-with-timeout";
import { videoFeedbackRequestSchema, type VideoFeedbackRequest } from "@linguascroll/shared-types";
import { API_BASE_URL } from "../../../shared/api-base-url";
import { authHeaders } from "../../identity/auth-headers";
export async function sendVideoFeedback(videoId: string, input: VideoFeedbackRequest): Promise<void> {
  const response = await fetchWithTimeout(`${API_BASE_URL}/videos/${encodeURIComponent(videoId)}/feedback`, { method: "POST", headers: { ...(await authHeaders()), "Content-Type": "application/json" }, body: JSON.stringify(videoFeedbackRequestSchema.parse(input)) });
  if (!response.ok) throw new Error("Geri bildirim gönderilemedi");
}
