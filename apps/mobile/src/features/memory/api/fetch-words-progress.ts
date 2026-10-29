import { wordsProgressSchema, type WordsProgress } from "@linguascroll/shared-types";
import { API_BASE_URL } from "../../../shared/api-base-url";
import { authHeaders } from "../../identity/auth-headers";

/** GET /words/progress?userId= — MVP ilerleme metrikleri (streak/XP/coin YOK, bkz. shared-types/words-progress.ts'in semantik yorumu: DISTINCT kelime sayıları). */
export async function fetchWordsProgress(): Promise<WordsProgress> {
  const response = await fetch(`${API_BASE_URL}/words/progress`, { headers: await authHeaders() });

  if (!response.ok) {
    throw new Error(`İlerleme bilgisi getirilemedi: ${response.status} ${response.statusText}`);
  }

  const json: unknown = await response.json();
  return wordsProgressSchema.parse(json);
}
