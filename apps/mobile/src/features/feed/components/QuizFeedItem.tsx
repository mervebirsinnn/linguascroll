import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { AnswerQuizResponse, FeedQuiz } from "@linguascroll/shared-types";
import { answerQuiz } from "../api/answer-quiz";

type QuizFeedItemProps = {
  quiz: FeedQuiz;
  height: number;
  width: number;
  userId: string;
};

/**
 * Chunk 15, madde 9 — Chunk 5'in "hata durumunda seçim sessizce sıfırlanır"
 * kararı DEĞİŞTİ: artık (a) seçim KORUNUYOR (kullanıcı hangi seçeneğe
 * bastığını unutmuyor), (b) görünür bir hata mesajı var, (c) "Tekrar dene"
 * ile AYNI seçimle yeniden submit edilebiliyor — `submit` tek, paylaşılan bir
 * fonksiyon (`handleSelect`'in İLK submit'i, `handleRetry`'ın YENİDEN submit'i
 * AYNI kod yolunu kullanıyor, iki ayrı implementasyon YOK).
 */
export function QuizFeedItem({ quiz, height, width, userId }: QuizFeedItemProps) {
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [result, setResult] = useState<AnswerQuizResponse | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const hasAnswered = result !== null;

  function submit(optionId: string): void {
    setIsSubmitting(true);
    setSubmitError(null);
    answerQuiz(quiz.id, optionId, userId)
      .then((response) => {
        setResult(response);
      })
      .catch(() => {
        setSubmitError("Cevap gönderilemedi.");
      })
      .finally(() => {
        setIsSubmitting(false);
      });
  }

  function handleSelect(optionId: string): void {
    if (hasAnswered || isSubmitting) {
      return;
    }
    setSelectedOptionId(optionId);
    submit(optionId);
  }

  function handleRetry(): void {
    if (!selectedOptionId || isSubmitting) {
      return;
    }
    submit(selectedOptionId);
  }

  return (
    <View style={[styles.container, { height, width }]}>
      <Text style={styles.question}>{quiz.question}</Text>
      {quiz.options.map((option) => {
        const isSelected = option.id === selectedOptionId;
        const isCorrectOption = hasAnswered && option.id === result.correctOptionId;
        const isWrongSelection = hasAnswered && isSelected && !result.correct;

        return (
          <Pressable
            key={option.id}
            onPress={() => handleSelect(option.id)}
            disabled={hasAnswered || isSubmitting}
            style={[
              styles.option,
              isSelected && styles.optionSelected,
              isCorrectOption && styles.optionCorrect,
              isWrongSelection && styles.optionWrong,
            ]}
          >
            <Text style={styles.optionText}>{option.text}</Text>
          </Pressable>
        );
      })}
      {submitError && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{submitError}</Text>
          <Pressable onPress={handleRetry} style={styles.retryButton}>
            <Text style={styles.retryText}>Tekrar dene</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#111",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingHorizontal: 24,
  },
  question: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "600",
    marginBottom: 16,
    textAlign: "center",
  },
  option: {
    borderWidth: 1,
    borderColor: "#444",
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    width: "100%",
  },
  optionSelected: {
    borderColor: "#888",
  },
  optionCorrect: {
    borderColor: "#2ecc71",
    backgroundColor: "#123d24",
  },
  optionWrong: {
    borderColor: "#e74c3c",
    backgroundColor: "#3d1212",
  },
  optionText: {
    color: "#fff",
    fontSize: 16,
  },
  errorContainer: {
    marginTop: 8,
    alignItems: "center",
    gap: 8,
  },
  errorText: {
    color: "#e74c3c",
    fontSize: 14,
    textAlign: "center",
  },
  retryButton: {
    borderWidth: 1,
    borderColor: "#444",
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 20,
  },
  retryText: {
    color: "#8ecdfa",
    fontSize: 14,
    fontWeight: "600",
  },
});
