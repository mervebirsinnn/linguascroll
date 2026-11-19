import { StyleSheet, Text, View } from "react-native";
import type { PassageQuestion } from "@linguascroll/shared-types";
import { formatAnswerSummary, summarizeAnswers } from "../passages-state";
import { pageStyles } from "./PageFrame";

type PassageSummaryCardProps = {
  questions: readonly PassageQuestion[];
};

/**
 * Skor özeti KARTI: bir metnin TOPLAM 5 sayfası var (metin + 4 soru); özet ayrı bir sayfa DEĞİL, son (4.) sorunun sayfasında,
 * cevaplanmamış soruları da ayrı gösterir. Skor "öğrenme pratiği" geri bildirimidir (seviye ölçümü DEĞİL).
 */
export function PassageSummaryCard({ questions }: PassageSummaryCardProps) {
  const summary = summarizeAnswers(questions);
  return (
    <View accessibilityLabel="Skor özeti" style={styles.card}>
      <Text style={styles.heading}>Sonuç</Text>
      <Text accessibilityLiveRegion="polite" style={styles.score}>{summary.correct}/{questions.length}</Text>
      <Text style={pageStyles.muted}>{formatAnswerSummary(summary)}</Text>
      <View style={styles.list}>
        {questions.map((question, index) => {
          const status = question.result === null ? "Cevaplanmadı" : question.result.correct ? "Doğru" : "Yanlış";
          return (
            <View key={question.id} style={styles.row}>
              <Text style={styles.rowTitle}>Soru {index + 1}</Text>
              <Text style={[styles.rowStatus, question.result?.correct === true && styles.good, question.result?.correct === false && styles.bad]}>{status}</Text>
            </View>
          );
        })}
      </View>
      <Text style={pageStyles.muted}>Bu sonuç bir öğrenme pratiği geri bildirimidir; seviye ölçümü değildir.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { marginTop: 22, padding: 16, borderRadius: 16, backgroundColor: "#15141d", borderWidth: 1, borderColor: "#2f2c42" },
  heading: { color: "#ddf9a8", fontSize: 12, fontWeight: "800", letterSpacing: 0.6, textTransform: "uppercase" },
  score: { color: "#ddf9a8", fontSize: 48, fontWeight: "900", marginVertical: 6 },
  list: { marginTop: 14, marginBottom: 12, gap: 8 },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10, backgroundColor: "#0f0e15" },
  rowTitle: { color: "#f5f4f9", fontSize: 15, fontWeight: "600" },
  rowStatus: { color: "#aba8b9", fontSize: 14, fontWeight: "700" },
  good: { color: "#2ecc71" },
  bad: { color: "#ff6b6b" },
});
