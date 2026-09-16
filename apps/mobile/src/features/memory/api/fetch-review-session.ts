import { savedWordSchema, type SavedWord } from "@linguascroll/shared-types";
import { z } from "zod";
import { API_BASE_URL } from "../../../shared/api-base-url";

const reviewSessionResponseSchema = z.array(savedWordSchema);

/**
 * GET /words/review?userId= — deterministic review session (backend'de
 * hesaplanır: en fazla REVIEW_SESSION_SIZE=5, SADECE gerçekten due olanlar,
 * asla non-due item'larla doldurulmaz). Dönen sıralama zaten öncelik sırasına
 * göre — client burada YENİDEN sıralama yapmıyor.
 */
export async function fetchReviewSession(userId: string): Promise<SavedWord[]> {
  const params = new URLSearchParams({ userId });
  const response = await fetch(`${API_BASE_URL}/words/review?${params.toString()}`);

  if (!response.ok) {
    throw new Error(`Tekrar oturumu getirilemedi: ${response.status} ${response.statusText}`);
  }

  const json: unknown = await response.json();
  return reviewSessionResponseSchema.parse(json);
}
