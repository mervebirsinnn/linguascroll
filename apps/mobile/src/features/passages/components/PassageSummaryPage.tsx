import { StyleSheet, Text, View } from "react-native";
import type { PassageQuestion } from "@linguascroll/shared-types";
import { formatAnswerSummary, isPassageComplete, summarizeAnswers } from "../passages-state";
import { PageFrame, pageStyles } from "./PageFrame";

type PassageSummaryPageProps = {
  title: string;
  questions: readonly PassageQuestion[];
  height: number;
  width: number;
  onNext: () => void;
  /** Son metinse ve seviyede devamı yoksa "Sonraki metin" yerine anlamlı bir etiket. */
  nextLabel?: string;
};

/**
 * Metnin son sayfası: skor özeti. Skor "öğrenme pratiği" geri bildirimidir (seviye ölçümü DEĞİL); cevaplanmamış sorular
 * ayrı gösterilir, kullanıcıya hiçbiri sayılmadan yanlış yazılmaz.
 */
export function PassageSummaryPage({ title, questions, height, width, onNext, nextLabel = "Sonraki metin ›" }: PassageSummaryPageProps) {
  const summary = summarizeAnswers(questions);
  const complete = isPassageComplete(questions);
  return (
    <PageFrame height={height} width={width} chip="Sonuç" onNext={onNext} nextLabel={nextLabel}>
      <Text accessibilityRole="header" style={pageStyles.title}>{title}</Text>
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
      {!complete ? <Text style={pageStyles.muted}>Cevaplamadığın soruları yukarı kaydırarak geri dönüp tamamlayabilirsin.</Text> : null}
      <Text style={[pageStyles.muted, styles.note]}>Bu sonuç bir öğrenme pratiği geri bildirimidir; seviye ölçümü değildir.</Text>
    </PageFrame>
  );
}

const styles = StyleSheet.create({
  score: { color: "#ddf9a8", fontSize: 56, fontWeight: "900", marginVertical: 8 },
  list: { marginTop: 18, marginBottom: 14, gap: 8 },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 10, paddingHorizontal: 14, borderRadius: 12, backgroundColor: "#15141d" },
  rowTitle: { color: "#f5f4f9", fontSize: 15, fontWeight: "600" },
  rowStatus: { color: "#aba8b9", fontSize: 14, fontWeight: "700" },
  good: { color: "#2ecc71" },
  bad: { color: "#ff6b6b" },
  note: { marginTop: 12 },
});
