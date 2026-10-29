import { recordWordReviewRequestSchema } from "@linguascroll/shared-types";
import { API_BASE_URL } from "../../../shared/api-base-url";
import { authHeaders } from "../../identity/auth-headers";

/** POST /words/:wordId/review — answerQuiz ile AYNI desen (bkz. api/answer-quiz.ts): bir kaynak YARATMIYOR, bir sonucu kaydediyor. Response body yok. */
export async function recordWordReview(wordId: string, correct: boolean): Promise<void> {
  const body = recordWordReviewRequestSchema.parse({ correct });

  const response = await fetch(`${API_BASE_URL}/words/${wordId}/review`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(await authHeaders()) },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`Tekrar sonucu gönderilemedi: ${response.status} ${response.statusText}`);
  }
}
