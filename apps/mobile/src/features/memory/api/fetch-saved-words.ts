import { savedWordSchema, type SavedWord } from "@linguascroll/shared-types";
import { z } from "zod";
import { API_BASE_URL } from "../../../shared/api-base-url";

const savedWordsResponseSchema = z.array(savedWordSchema);

/** GET /words/saved?userId= — Memory ekranı: kullanıcının TÜM kayıtlı kelime/phrase'leri. */
export async function fetchSavedWords(userId: string): Promise<SavedWord[]> {
  const params = new URLSearchParams({ userId });
  const response = await fetch(`${API_BASE_URL}/words/saved?${params.toString()}`);

  if (!response.ok) {
    throw new Error(`Kayıtlı kelimeler getirilemedi: ${response.status} ${response.statusText}`);
  }

  const json: unknown = await response.json();
  return savedWordsResponseSchema.parse(json);
}
