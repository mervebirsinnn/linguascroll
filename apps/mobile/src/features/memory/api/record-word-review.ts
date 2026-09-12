import { recordWordReviewRequestSchema } from "@linguascroll/shared-types";
import { API_BASE_URL } from "../../../shared/api-base-url";

/** POST /words/:wordId/review — answerQuiz ile AYNI desen (bkz. api/answer-quiz.ts): bir kaynak YARATMIYOR, bir sonucu kaydediyor. Response body yok. */
export async function recordWordReview(wordId: string, userId: string, correct: boolean): Promise<void> {
  const body = recordWordReviewRequestSchema.parse({ userId, correct });

  const response = await fetch(`${API_BASE_URL}/words/${wordId}/review`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`Tekrar sonucu gönderilemedi: ${response.status} ${response.statusText}`);
  }
}
