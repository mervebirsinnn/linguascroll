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

export function QuizFeedItem({ quiz, height, width, userId }: QuizFeedItemProps) {
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [result, setResult] = useState<AnswerQuizResponse | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const hasAnswered = result !== null;

  const handleSelect = (optionId: string) => {
    if (hasAnswered || isSubmitting) {
      return;
    }
    setSelectedOptionId(optionId);
    setIsSubmitting(true);
    answerQuiz(quiz.id, optionId, userId)
      .then((response) => {
        setResult(response);
      })
      .catch(() => {
        // Chunk 5 kapsamında ayrı bir hata UI'ı yok — bilinçli minimal davranış:
        // seçim sıfırlanır, kullanıcı tekrar deneyebilir.
        setSelectedOptionId(null);
      })
      .finally(() => {
        setIsSubmitting(false);
      });
  };

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
});
