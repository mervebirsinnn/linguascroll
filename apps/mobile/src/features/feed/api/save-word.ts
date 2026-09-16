import { saveWordRequestSchema } from "@linguascroll/shared-types";
import { API_BASE_URL } from "../../../shared/api-base-url";

/**
 * PUT /words/:wordId/saved — idempotent (backend ON CONFLICT DO NOTHING), response body yok.
 *
 * Chunk 16 — `sourceSegmentId` opsiyonel: word-tap akışı (subtitle içindeki bir
 * kelimeye dokunup kaydetme) o anki GERÇEK aktif segment'in id'sini gönderir;
 * panel-chip akışı (video altındaki sözlük panelinden kaydetme) segment
 * granularitesine sahip DEĞİL, bu yüzden hiç göndermez (undefined → backend'e
 * null olarak gider, TAHMİNİ bir context ASLA üretilmiyor).
 */
export async function saveWord(wordId: string, userId: string, sourceSegmentId?: string | null): Promise<void> {
  const body = saveWordRequestSchema.parse({ userId, sourceSegmentId });

  const response = await fetch(`${API_BASE_URL}/words/${wordId}/saved`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`Kelime kaydedilemedi: ${response.status} ${response.statusText}`);
  }
}
