import { videoWordGlossesSchema, type VideoWordGlosses } from "@linguascroll/shared-types";
import { API_BASE_URL } from "../../../shared/api-base-url";

export async function fetchWordGlosses(videoId: string): Promise<VideoWordGlosses> {
  const response = await fetch(`${API_BASE_URL}/words/glosses?videoId=${encodeURIComponent(videoId)}`);
  if (!response.ok) {
    throw new Error(`Kelime anlamları alınamadı: ${response.status} ${response.statusText}`);
  }
  const json: unknown = await response.json();
  return videoWordGlossesSchema.parse(json);
}
