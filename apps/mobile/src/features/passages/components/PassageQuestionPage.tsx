import { Pressable, StyleSheet, Text, View } from "react-native";
import type { PassageQuestion } from "@linguascroll/shared-types";
import { questionTypeLabel, trapTypeLabel } from "../passage-labels";
import { ANSWER_UNCERTAIN_MESSAGE } from "../passages-controller";
import { canSelectOption, formatAnswerSummary, summarizeAnswers } from "../passages-state";
import { PageFrame, pageStyles } from "./PageFrame";

const LETTERS = ["A", "B", "C", "D", "E", "F"];

type PassageQuestionPageProps = {
  question: PassageQuestion;
  /** Metnin tüm soruları: canlı özet ("2 doğru · 1 yanlış · 1 cevaplanmadı") için. */
  questions: readonly PassageQuestion[];
  index: number;
  total: number;
  height: number;
  width: number;
  /** Kullanıcının bu soruda şu an seçtiği (henüz göndermediği) şık; elenmişse null sayılır. */
  selectedOptionId: string | null;
  eliminated: ReadonlySet<string>;
  /** Gönderilmekte olan şık (varsa "Kontrol et" pasif, "Gönderiliyor…"). */
  pendingOptionId: string | undefined;
  /** Son gönderim hatası (mesaj controller'dan). */
  error: string | undefined;
  onSelect: (optionId: string) => void;
  onToggleElimination: (optionId: string) => void;
  onCheck: () => void;
  onRecheck: () => void;
  onShowText: () => void;
  onNext: () => void;
};

/**
 * Sayfa 2..N: tek bir soru. Cevap ÖNCESİ yalnız şıklar görünür (doğruluk/açıklama sunucudan hiç gelmez); "Kontrol et" ile ilk
 * cevap gönderilir. Cevap SONRASI (ve geri dönünce, sunucu saklanan sonucu verir) doğru şık, kullanıcının cevabı ve HER şıkkın
 * tuzak türü + açıklaması görünür. ✕ elemesi yalnız yerel/geri alınabilir bir yardımdır, cevap göndermez.
 */
export function PassageQuestionPage({
  question,
  questions,
  index,
  total,
  height,
  width,
  selectedOptionId,
  eliminated,
  pendingOptionId,
  error,
  onSelect,
  onToggleElimination,
  onCheck,
  onRecheck,
  onShowText,
  onNext,
}: PassageQuestionPageProps) {
  const result = question.result;
  const pending = pendingOptionId !== undefined;
  const summary = formatAnswerSummary(summarizeAnswers(questions));
  const uncertain = error === ANSWER_UNCERTAIN_MESSAGE;

  return (
    <PageFrame
      height={height}
      width={width}
      chip={`Soru ${index + 1}/${total} · ${questionTypeLabel(question.type)}`}
      onNext={onNext}
      nextLabel={index + 1 === total ? "Sonuç ›" : "Sonraki soru ›"}
      footerExtra={
        <Pressable accessibilityRole="button" onPress={onShowText} style={styles.showText}>
          <Text style={styles.showTextLabel}>Metni göster</Text>
        </Pressable>
      }
    >
      <Text accessibilityLiveRegion="polite" style={styles.summary}>{summary}</Text>
      <Text accessibilityRole="header" style={styles.prompt}>{question.prompt}</Text>

      {question.options.map((option, optionIndex) => {
        const optionResult = result?.options.find((candidate) => candidate.optionId === option.id) ?? null;
        const isEliminated = eliminated.has(option.id);
        const isSelected = result ? result.selectedOptionId === option.id : selectedOptionId === option.id;
        const isCorrect = optionResult?.isCorrect === true;
        const isWrongPick = result !== null && isSelected && !isCorrect;
        const selectable = canSelectOption(eliminated, question, option.id) && !pending;
        const trap = optionResult && !optionResult.isCorrect ? trapTypeLabel(optionResult.trapType) : null;

        return (
          <View key={option.id} style={styles.optionBlock}>
            <View style={styles.optionRow}>
              <Pressable
                accessibilityRole="radio"
                accessibilityLabel={`${LETTERS[optionIndex] ?? optionIndex + 1}. ${option.text}${isEliminated ? ", elendi" : ""}`}
                accessibilityState={{ selected: isSelected, disabled: !selectable }}
                disabled={!selectable}
                onPress={() => onSelect(option.id)}
                style={[styles.option, isSelected && !result && styles.optionSelected, isCorrect && styles.optionCorrect, isWrongPick && styles.optionWrong, isEliminated && styles.optionEliminated]}
              >
                <Text style={styles.letter}>{LETTERS[optionIndex] ?? optionIndex + 1}</Text>
                <Text style={[styles.optionText, isEliminated && styles.optionTextEliminated]}>{option.text}</Text>
              </Pressable>
              {!result ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={isEliminated ? `${LETTERS[optionIndex]} şıkkı için elemeyi geri al` : `${LETTERS[optionIndex]} şıkkını ele`}
                  accessibilityState={{ disabled: pending }}
                  disabled={pending}
                  onPress={() => onToggleElimination(option.id)}
                  style={styles.eliminate}
                >
                  <Text style={styles.eliminateText}>{isEliminated ? "↺" : "✕"}</Text>
                </Pressable>
              ) : null}
            </View>
            {optionResult ? (
              <View style={styles.reveal}>
                {isCorrect ? <Text style={styles.verdictCorrect}>✓ Doğru cevap</Text> : null}
                {isWrongPick ? <Text style={styles.verdictWrong}>✗ Senin cevabın</Text> : null}
                {trap ? <Text style={styles.trap}>Tuzak: {trap}</Text> : null}
                <Text style={pageStyles.muted}>{optionResult.explanation}</Text>
              </View>
            ) : null}
          </View>
        );
      })}

      {!result ? (
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: selectedOptionId === null || pending, busy: pending }}
          disabled={selectedOptionId === null || pending}
          onPress={onCheck}
          style={[pageStyles.primaryButton, (selectedOptionId === null || pending) && pageStyles.primaryButtonDisabled]}
        >
          <Text style={pageStyles.primaryButtonText}>{pending ? "Gönderiliyor…" : "Kontrol et"}</Text>
        </Pressable>
      ) : null}

      {error ? (
        <View style={pageStyles.errorBox}>
          <Text accessibilityRole="alert" style={pageStyles.errorText}>{error}</Text>
          <Pressable
            accessibilityRole="button"
            disabled={pending}
            onPress={uncertain ? onRecheck : onCheck}
            style={pageStyles.secondaryButton}
          >
            <Text style={pageStyles.secondaryButtonText}>{uncertain ? "Tekrar kontrol et" : "Tekrar dene"}</Text>
          </Pressable>
        </View>
      ) : null}
    </PageFrame>
  );
}

const styles = StyleSheet.create({
  summary: { color: "#aba8b9", fontSize: 13, marginBottom: 10 },
  prompt: { color: "#f5f4f9", fontSize: 20, fontWeight: "700", lineHeight: 28, marginBottom: 16 },
  optionBlock: { marginBottom: 10 },
  optionRow: { flexDirection: "row", alignItems: "stretch", gap: 8 },
  option: { flex: 1, flexDirection: "row", alignItems: "center", gap: 12, minHeight: 52, borderRadius: 12, borderWidth: 1.5, borderColor: "#2f2c42", backgroundColor: "#15141d", paddingHorizontal: 12, paddingVertical: 10 },
  optionSelected: { borderColor: "#c8b5ff", backgroundColor: "#1e1a2e" },
  optionCorrect: { borderColor: "#2ecc71", backgroundColor: "#10241a" },
  optionWrong: { borderColor: "#ff6b6b", backgroundColor: "#2b1518" },
  optionEliminated: { opacity: 0.55 },
  letter: { color: "#ddf9a8", fontSize: 15, fontWeight: "800", width: 18, textAlign: "center" },
  optionText: { flex: 1, color: "#f5f4f9", fontSize: 16, lineHeight: 22 },
  // Elenmiş: üstü çizili + ikon (yalnız renkle belirtilmez).
  optionTextEliminated: { textDecorationLine: "line-through", color: "#8d8a9e" },
  eliminate: { width: 48, minHeight: 52, borderRadius: 12, borderWidth: 1, borderColor: "#3a3750", alignItems: "center", justifyContent: "center" },
  eliminateText: { color: "#aba8b9", fontSize: 18, fontWeight: "700" },
  reveal: { marginTop: 6, marginLeft: 4, gap: 4 },
  verdictCorrect: { color: "#2ecc71", fontWeight: "800", fontSize: 14 },
  verdictWrong: { color: "#ff6b6b", fontWeight: "800", fontSize: 14 },
  trap: { color: "#ffd479", fontSize: 13, fontWeight: "700" },
  showText: { minHeight: 44, justifyContent: "center", paddingHorizontal: 8 },
  showTextLabel: { color: "#ddf9a8", fontSize: 14, fontWeight: "700" },
});
