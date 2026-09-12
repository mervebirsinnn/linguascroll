import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { SavedWord } from "@linguascroll/shared-types";
import { recordWordReview } from "../api/record-word-review";

type ReviewCardProps = {
  word: SavedWord;
  userId: string;
  /** SADECE submit gerçekten başarılı olunca çağrılır — parent bir sonraki karta geçer. */
  onAnswered: (correct: boolean) => void;
};

/**
 * Chunk 16, madde 1 — self-assessment formatı (çoktan seçmeli DEĞİL): kelime/
 * phrase (+ varsa kaynak cümle) → "Anlamı göster" → gloss açılır → kullanıcı
 * kendi kendine "Hatırladım"/"Hatırlamadım" der.
 *
 * Hata davranışı QuizFeedItem.tsx'teki desenin BİREBİR AYNISI (madde 12): cevap
 * (hangi butona basıldığı) KORUNUYOR, görünür bir hata mesajı var, "Tekrar
 * dene" AYNI cevapla yeniden submit ediyor — `submit` tek, paylaşılan bir
 * fonksiyon.
 *
 * Bu component `word.word.id` değiştiğinde PARENT tarafından `key` ile
 * yeniden mount edilecek şekilde tasarlandı (bkz. ReviewScreen) — bu yüzden
 * kendi iç state'ini elle sıfırlamıyor, her yeni kart doğal olarak temiz bir
 * state'le başlıyor.
 */
export function ReviewCard({ word, userId, onAnswered }: ReviewCardProps) {
  const [revealed, setRevealed] = useState(false);
  const [lastAttemptedCorrect, setLastAttemptedCorrect] = useState<boolean | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  function submit(correct: boolean): void {
    setIsSubmitting(true);
    setSubmitError(null);
    setLastAttemptedCorrect(correct);
    recordWordReview(word.word.id, userId, correct)
      .then(() => {
        onAnswered(correct);
      })
      .catch(() => {
        setSubmitError("Sonuç gönderilemedi.");
      })
      .finally(() => {
        setIsSubmitting(false);
      });
  }

  function handleAnswer(correct: boolean): void {
    if (isSubmitting) {
      return;
    }
    submit(correct);
  }

  function handleRetry(): void {
    if (lastAttemptedCorrect === null || isSubmitting) {
      return;
    }
    submit(lastAttemptedCorrect);
  }

  return (
    <View style={styles.card}>
      <Text style={styles.lemma}>{word.word.lemma}</Text>
      {word.sourceSentence && <Text style={styles.sourceSentence}>“{word.sourceSentence}”</Text>}

      {!revealed && (
        <Pressable onPress={() => setRevealed(true)} style={styles.revealButton}>
          <Text style={styles.revealButtonText}>Anlamı göster</Text>
        </Pressable>
      )}

      {revealed && (
        <>
          <Text style={styles.gloss}>{word.word.gloss}</Text>
          <View style={styles.answerRow}>
            <Pressable
              onPress={() => handleAnswer(false)}
              disabled={isSubmitting}
              style={[styles.answerButton, styles.answerButtonForgot]}
            >
              <Text style={styles.answerButtonText}>{isSubmitting && lastAttemptedCorrect === false ? "…" : "Hatırlamadım"}</Text>
            </Pressable>
            <Pressable
              onPress={() => handleAnswer(true)}
              disabled={isSubmitting}
              style={[styles.answerButton, styles.answerButtonRemembered]}
            >
              <Text style={styles.answerButtonText}>{isSubmitting && lastAttemptedCorrect === true ? "…" : "Hatırladım"}</Text>
            </Pressable>
          </View>
        </>
      )}

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
  card: {
    backgroundColor: "#111",
    borderWidth: 1,
    borderColor: "#333",
    borderRadius: 12,
    padding: 20,
    gap: 12,
  },
  lemma: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "700",
    textAlign: "center",
  },
  sourceSentence: {
    color: "#8ecdfa",
    fontSize: 14,
    fontStyle: "italic",
    textAlign: "center",
  },
  gloss: {
    color: "#ccc",
    fontSize: 18,
    textAlign: "center",
    marginTop: 4,
  },
  revealButton: {
    borderWidth: 1,
    borderColor: "#444",
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: "center",
    marginTop: 8,
  },
  revealButtonText: {
    color: "#8ecdfa",
    fontSize: 15,
    fontWeight: "600",
  },
  answerRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 8,
  },
  answerButton: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: "center",
  },
  answerButtonForgot: {
    borderColor: "#e74c3c",
  },
  answerButtonRemembered: {
    borderColor: "#2ecc71",
  },
  answerButtonText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
  },
  errorContainer: {
    marginTop: 4,
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
