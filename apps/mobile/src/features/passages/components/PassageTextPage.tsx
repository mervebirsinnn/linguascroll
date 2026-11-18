import { StyleSheet, Text } from "react-native";
import type { Passage } from "@linguascroll/shared-types";
import { toWordSheetEntry, type PassageWordSheetEntry } from "../passage-word-entry";
import { PageFrame, pageStyles } from "./PageFrame";

type OpenPassage = Extract<Passage, { access: "open" }>;

type PassageTextPageProps = {
  passage: OpenPassage;
  height: number;
  width: number;
  /** Dokunulan kelime GEÇİŞİ (span kimliği + o geçişin cümlesi dahil): ortak kelime penceresi bunu gösterir. */
  onPressWord: (entry: PassageWordSheetEntry) => void;
  onNext: () => void;
};

/**
 * Sayfa 1/N: metnin kendisi. Sunucunun hazırladığı "run"lar çizilir (istemci offset hesabı YAPMAZ); kelime/ifade run'ları
 * dokunulabilir. Kayıtlı kelime farklı biçimlenir (renk + alt çizgi: yalnız renkle belirtilmez).
 */
export function PassageTextPage({ passage, height, width, onPressWord, onNext }: PassageTextPageProps) {
  return (
    <PageFrame height={height} width={width} chip={`${passage.level} · ${passage.topic}`} onNext={onNext} nextLabel="Sorulara geç ›">
      <Text accessibilityRole="header" style={pageStyles.title}>{passage.title}</Text>
      {passage.paragraphs.map((runs, paragraphIndex) => (
        <Text key={paragraphIndex} style={pageStyles.paragraph}>
          {runs.map((run, runIndex) => {
            const entry = toWordSheetEntry(passage.id, run);
            if (!entry) return <Text key={runIndex}>{run.text}</Text>;
            return (
              <Text
                key={runIndex}
                accessibilityRole="button"
                accessibilityLabel={`${run.text}, anlamını göster`}
                onPress={() => onPressWord(entry)}
                style={entry.saved ? styles.wordSaved : styles.word}
              >
                {run.text}
              </Text>
            );
          })}
        </Text>
      ))}
      <Text style={pageStyles.muted}>Altı çizili kelimelere dokun: anlamını ve cümleyi gör, kelimelerine kaydet.</Text>
    </PageFrame>
  );
}

const styles = StyleSheet.create({
  word: { color: "#c8b5ff", textDecorationLine: "underline", textDecorationStyle: "dotted" },
  wordSaved: { color: "#ddf9a8", fontWeight: "700", textDecorationLine: "underline" },
});
