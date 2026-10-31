import { playbackAccessResponseSchema, type PlaybackAccessResponse } from "@linguascroll/shared-types";
import { API_BASE_URL } from "../../../shared/api-base-url";
import { authHeaders } from "../../identity/auth-headers";

/**
 * 2026-10-27 — feed'in `playbackUrl: null` taşıdığı (henüz açılmamış) bir video için oynatma
 * erişimi ister. Ücretsiz hak BACKEND'de, bu istekte atomik olarak tüketilir; aynı video için
 * tekrar istek hak tüketmez. Yanıt `granted` (kısa ömürlü imzalı URL) ya da `paywall`.
 */
export async function requestPlaybackAccess(videoId: string): Promise<PlaybackAccessResponse> {
  // Gövdesiz: kimlik doğrulanmış Firebase token'ından (Authorization header).
  const response = await fetch(`${API_BASE_URL}/videos/${videoId}/playback-access`, {
    method: "POST",
    headers: await authHeaders(),
  });

  if (!response.ok) {
    throw new Error(`Oynatma erişimi alınamadı: ${response.status} ${response.statusText}`);
  }

  const json: unknown = await response.json();
  return playbackAccessResponseSchema.parse(json);
}
