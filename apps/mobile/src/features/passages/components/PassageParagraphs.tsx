import { StyleSheet, Text } from "react-native";
import type { Passage } from "@linguascroll/shared-types";
import { toWordSheetEntry, type PassageWordSheetEntry } from "../passage-word-entry";
import { pageStyles } from "./PageFrame";

type OpenPassage = Extract<Passage, { access: "open" }>;

/** Metin sayfası ve sorudan açılan metin aynı run'ları kullanır: span/cümle bağı iki görünümde de korunur. */
export function PassageParagraphs({ passage, onPressWord }: { passage: OpenPassage; onPressWord: (entry: PassageWordSheetEntry) => void }) {
  return <>{passage.paragraphs.map((runs, paragraphIndex) => (
    <Text key={paragraphIndex} style={pageStyles.paragraph}>
      {runs.map((run, runIndex) => {
        const entry = toWordSheetEntry(passage.id, run);
        if (!entry) return <Text key={runIndex}>{run.text}</Text>;
        return <Text key={runIndex} accessibilityRole="button" accessibilityLabel={`${run.text}, anlamını göster`} onPress={() => onPressWord(entry)} style={entry.saved ? styles.wordSaved : styles.word}>{run.text}</Text>;
      })}
    </Text>
  ))}</>;
}

const styles = StyleSheet.create({
  word: { color: "#c8b5ff", textDecorationLine: "underline", textDecorationStyle: "dotted" },
  wordSaved: { color: "#ddf9a8", fontWeight: "700", textDecorationLine: "underline" },
});
