import { useEffect, useRef, useState } from "react";
import { Animated, Pressable, StyleSheet, Text, View } from "react-native";
import type { AnswerQuizResponse, FeedQuiz } from "@linguascroll/shared-types";
import { answerQuiz } from "../api/answer-quiz";

type QuizFeedItemProps = {
  quiz: FeedQuiz;
  height: number;
  width: number;
  userId: string;
};

/** Bir seçeneğin görsel durumu — render'dan bağımsız, saf hesap (bkz. `getOptionStatus`). */
export type OptionStatus = "idle" | "selected" | "correct" | "wrong" | "dimmed";

const OPTION_KEYS = ["A", "B", "C", "D", "E", "F"];

/**
 * Tasarım kararı (2026-11-14): quiz eskiden düz siyah (#111) + gri çerçeveli kutulardı; videonun
 * sıcak/canlı akışından sonra "reklam/anket formu" gibi hissettiriyordu (gerçek kullanıcı geri
 * bildirimi). Artık uygulamanın marka dili (lacivert zemin + limon yeşili vurgu — logo ve altyazı
 * vurgusuyla AYNI) kullanılıyor. Yeni bağımlılık EKLENMEDİ: gradient (expo-linear-gradient),
 * haptic (expo-haptics) ve konfeti bilerek bu değişikliğin dışında; ilerleme çubuğu/kombo/açıklama
 * ise API ve oturum durumu gerektirdiği için ayrı bir adım. Burada sadece görünüm + dokunma
 * geri bildirimi (RN'in kendi Animated'ı) var; cevap/yeniden deneme MANTIĞI (aşağıdaki doc)
 * değişmedi.
 */
const COLORS = {
  background: "#0b1550",
  card: "#1b2877",
  text: "#f3f5ff",
  muted: "#9aa3cc",
  lime: "#d4f56b",
  limeInk: "#1d2a00",
  coral: "#ff8a7a",
  coralInk: "#3a0a05",
  selected: "#243390",
};

/**
 * Seçeneğin durumunu (saf fonksiyon, component'ten bağımsız test edilebilir) hesaplar:
 * cevap gelmeden sadece basılan "selected"; cevap gelince doğru seçenek her zaman "correct",
 * kullanıcının yanlış seçimi "wrong", geri kalanlar "dimmed".
 */
export function getOptionStatus(params: {
  optionId: string;
  selectedOptionId: string | null;
  result: AnswerQuizResponse | null;
}): OptionStatus {
  const { optionId, selectedOptionId, result } = params;
  if (result === null) {
    return optionId === selectedOptionId ? "selected" : "idle";
  }
  if (optionId === result.correctOptionId) {
    return "correct";
  }
  if (optionId === selectedOptionId) {
    return "wrong";
  }
  return "dimmed";
}

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
    answerQuiz(quiz.id, optionId)
      .then((response) => {
        setResult(response);
      })
      .catch(() => {
        setSubmitError("Bağlantı koptu, tekrar deneyelim mi?");
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
      <Text style={styles.tag}>HIZLI SORU</Text>
      <Text style={styles.question}>{quiz.question}</Text>
      {quiz.options.map((option, index) => (
        <QuizOption
          key={option.id}
          letter={OPTION_KEYS[index] ?? String(index + 1)}
          text={option.text}
          status={getOptionStatus({ optionId: option.id, selectedOptionId, result })}
          disabled={hasAnswered || isSubmitting}
          onPress={() => handleSelect(option.id)}
        />
      ))}
      {hasAnswered && (
        <Text style={styles.feedback} accessibilityLiveRegion="polite">
          {result.correct ? "Süper! 🎉" : "Az kalmıştı. Doğru cevap yeşil."}
        </Text>
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

type QuizOptionProps = {
  letter: string;
  text: string;
  status: OptionStatus;
  disabled: boolean;
  onPress: () => void;
};

/**
 * Tek bir seçenek: basınca hafifçe küçülür (dokunma geri bildirimi), doğruysa kısa bir sıçrama,
 * yanlışsa kısa bir sarsıntı yapar. Hepsi `useNativeDriver` ile (JS thread'i bloklamaz — feed
 * zaten tam ekran kaydırmalı, ağır JS animasyonu istemiyoruz). Renk TEK başına anlam taşımıyor:
 * doğru/yanlış ayrıca ✓/✕ işaretiyle de gösteriliyor (renk körlüğü).
 */
function QuizOption({ letter, text, status, disabled, onPress }: QuizOptionProps) {
  const scale = useRef(new Animated.Value(1)).current;
  const shake = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (status === "correct") {
      Animated.sequence([
        Animated.timing(scale, { toValue: 1.06, duration: 140, useNativeDriver: true }),
        Animated.spring(scale, { toValue: 1, useNativeDriver: true }),
      ]).start();
    } else if (status === "wrong") {
      Animated.sequence([
        Animated.timing(shake, { toValue: -7, duration: 60, useNativeDriver: true }),
        Animated.timing(shake, { toValue: 6, duration: 70, useNativeDriver: true }),
        Animated.timing(shake, { toValue: -3, duration: 60, useNativeDriver: true }),
        Animated.timing(shake, { toValue: 0, duration: 60, useNativeDriver: true }),
      ]).start();
    }
  }, [status, scale, shake]);

  function animatePress(toValue: number): void {
    Animated.timing(scale, { toValue, duration: 90, useNativeDriver: true }).start();
  }

  const isCorrect = status === "correct";
  const isWrong = status === "wrong";

  return (
    <Animated.View
      style={[
        styles.optionWrapper,
        status === "dimmed" && styles.optionDimmed,
        { transform: [{ scale }, { translateX: shake }] },
      ]}
    >
      <Pressable
        onPress={onPress}
        onPressIn={() => !disabled && animatePress(0.97)}
        onPressOut={() => !disabled && animatePress(1)}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel={`${letter}: ${text}${isCorrect ? ", doğru" : isWrong ? ", yanlış" : ""}`}
        accessibilityState={{ disabled }}
        style={[
          styles.option,
          status === "selected" && styles.optionSelected,
          isCorrect && styles.optionCorrect,
          isWrong && styles.optionWrong,
        ]}
      >
        <View style={[styles.key, isCorrect && styles.keyOnLime, isWrong && styles.keyOnCoral]}>
          <Text style={[styles.keyText, isCorrect && styles.textOnLime, isWrong && styles.textOnCoral]}>{letter}</Text>
        </View>
        <Text style={[styles.optionText, isCorrect && styles.textOnLime, isWrong && styles.textOnCoral]}>{text}</Text>
        {(isCorrect || isWrong) && (
          <Text style={[styles.mark, isCorrect ? styles.textOnLime : styles.textOnCoral]}>{isCorrect ? "✓" : "✕"}</Text>
        )}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.background,
    justifyContent: "center",
    gap: 12,
    paddingHorizontal: 20,
  },
  tag: {
    color: COLORS.lime,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.4,
  },
  question: {
    color: COLORS.text,
    fontSize: 24,
    lineHeight: 30,
    fontWeight: "800",
    marginBottom: 8,
  },
  optionWrapper: {
    width: "100%",
  },
  optionDimmed: {
    opacity: 0.45,
  },
  option: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: COLORS.card,
    borderRadius: 18,
    paddingVertical: 13,
    paddingHorizontal: 14,
    minHeight: 56,
  },
  optionSelected: {
    backgroundColor: COLORS.selected,
  },
  optionCorrect: {
    backgroundColor: COLORS.lime,
  },
  optionWrong: {
    backgroundColor: COLORS.coral,
  },
  key: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  keyOnLime: {
    backgroundColor: "rgba(29,42,0,0.15)",
  },
  keyOnCoral: {
    backgroundColor: "rgba(58,10,5,0.15)",
  },
  keyText: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: "800",
  },
  optionText: {
    flex: 1,
    color: COLORS.text,
    fontSize: 17,
    fontWeight: "800",
  },
  textOnLime: {
    color: COLORS.limeInk,
  },
  textOnCoral: {
    color: COLORS.coralInk,
  },
  mark: {
    fontSize: 18,
    fontWeight: "900",
  },
  feedback: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: "800",
    textAlign: "center",
    marginTop: 4,
  },
  errorContainer: {
    marginTop: 8,
    alignItems: "center",
    gap: 8,
  },
  errorText: {
    color: COLORS.coral,
    fontSize: 14,
    textAlign: "center",
  },
  retryButton: {
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 99,
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  retryText: {
    color: COLORS.lime,
    fontSize: 14,
    fontWeight: "800",
  },
});
