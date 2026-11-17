import { saveWordRequestSchema, saveWordResponseSchema, type SaveWordResponse } from "@linguascroll/shared-types";
import { API_BASE_URL } from "../../../shared/api-base-url";
import { authHeaders } from "../../identity/auth-headers";

/**
 * PUT /words/:wordId/saved — idempotent (backend ON CONFLICT DO NOTHING).
 *
 * Chunk 16 — `sourceSegmentId` opsiyonel: word-tap akışı (subtitle içindeki bir
 * kelimeye dokunup kaydetme) o anki GERÇEK aktif segment'in id'sini gönderir;
 * panel-chip akışı (video altındaki sözlük panelinden kaydetme) segment
 * granularitesine sahip DEĞİL, bu yüzden hiç göndermez (undefined → backend'e
 * null olarak gider, TAHMİNİ bir context ASLA üretilmiyor).
 *
 * 2026-11-17 — Loopi: cevap `{ created }` taşır (bu istek gerçekten YENİ kayıt mı). Eski API (Render geri
 * alma) boş gövde döner → `{}` = "bilinmiyor"; gövde bozuksa da `{}`. İkisinde de KAYIT BAŞARILI sayılır —
 * Loopi bilgisi yüzünden kaydetme asla başarısız gösterilmez, yalnız Loopi kuyruğu dolmaz.
 */
export async function saveWord(wordId: string, sourceSegmentId?: string | null): Promise<SaveWordResponse> {
  const body = saveWordRequestSchema.parse({ sourceSegmentId });

  const response = await fetch(`${API_BASE_URL}/words/${wordId}/saved`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", ...(await authHeaders()) },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`Kelime kaydedilemedi: ${response.status} ${response.statusText}`);
  }
  return parseSaveWordResponse(await response.text().catch(() => ""));
}

export function parseSaveWordResponse(text: string): SaveWordResponse {
  if (text.trim() === "") return {};
  try {
    const parsed = saveWordResponseSchema.safeParse(JSON.parse(text));
    return parsed.success ? parsed.data : {};
  } catch {
    return {};
  }
}
