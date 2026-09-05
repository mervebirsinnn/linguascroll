import { recordVideoWatchEventRequestSchema } from "@linguascroll/shared-types";
import { API_BASE_URL } from "../../../shared/api-base-url";

/**
 * Fire-and-forget: response body yok (backend 201, boş gövde döner). Gönderilen
 * body'yi de yerelde doğruluyoruz — VideoFeedItem'daki ölçüm bir tip hatasıyla
 * bozulursa, sunucuya değil zod'a çarpsın.
 */
export async function recordVideoWatchEvent(videoId: string, userId: string, watchedMs: number): Promise<void> {
  const body = recordVideoWatchEventRequestSchema.parse({ userId, watchedMs });

  const response = await fetch(`${API_BASE_URL}/videos/${videoId}/watch-events`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`Watch event gönderilemedi: ${response.status} ${response.statusText}`);
  }
}
