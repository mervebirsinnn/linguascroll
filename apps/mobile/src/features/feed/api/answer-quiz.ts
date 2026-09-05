import { answerQuizResponseSchema, type AnswerQuizResponse } from "@linguascroll/shared-types";
import { API_BASE_URL } from "../../../shared/api-base-url";

export async function answerQuiz(quizId: string, optionId: string, userId: string): Promise<AnswerQuizResponse> {
  const response = await fetch(`${API_BASE_URL}/quizzes/${quizId}/answer`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ optionId, userId }),
  });

  if (!response.ok) {
    throw new Error(`Quiz cevabı gönderilemedi: ${response.status} ${response.statusText}`);
  }

  const json: unknown = await response.json();
  return answerQuizResponseSchema.parse(json);
}
