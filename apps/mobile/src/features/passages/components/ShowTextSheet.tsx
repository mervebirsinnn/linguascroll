import type { ReactNode } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import type { Passage } from "@linguascroll/shared-types";
import { useAndroidBottomSheetNavInset } from "../../../shared/bottom-sheet-inset";
import type { PassageWordSheetEntry } from "../passage-word-entry";
import { PassageParagraphs } from "./PassageParagraphs";

type OpenPassage = Extract<Passage, { access: "open" }>;

type ShowTextSheetProps = {
  /** null → kapalı. Soru sayfasından "Metni göster": metin tekrar okunsun, soru sayfasından çıkmadan. */
  passage: OpenPassage | null;
  onClose: () => void;
  onPressWord: (entry: PassageWordSheetEntry) => void;
  /** Aynı native Modal içindeki ortak kelime kartı; metin ağacı bağlı kalır, okuma konumu kaybolmaz. */
  wordSheet?: ReactNode;
  onCloseWord: () => void;
};

/** Metin ve kelime kartı tek native Modal'ı paylaşır: iOS'ta eşzamanlı kardeş Modal açılmaz. */
export function ShowTextSheet({ passage, onClose, onPressWord, wordSheet, onCloseWord }: ShowTextSheetProps) {
  const inset = useAndroidBottomSheetNavInset();
  return (
    <Modal visible={passage !== null} transparent animationType="slide" onRequestClose={wordSheet ? onCloseWord : onClose}>
      <View style={styles.host}>
      <Pressable style={[styles.backdrop, wordSheet ? styles.hidden : null]} onPress={onClose} accessibilityElementsHidden={!!wordSheet} importantForAccessibility={wordSheet ? "no-hide-descendants" : "auto"}>
        <Pressable style={[styles.card, { paddingBottom: 16 + inset }]} onPress={() => {}}>
          {passage ? (
            <View style={styles.inner}>
              <Text accessibilityRole="header" style={styles.title}>{passage.title}</Text>
              <ScrollView style={styles.scroll}>
                <PassageParagraphs passage={passage} onPressWord={onPressWord} />
              </ScrollView>
              <Pressable accessibilityRole="button" onPress={onClose} style={styles.close}>
                <Text style={styles.closeText}>Soruya dön</Text>
              </Pressable>
            </View>
          ) : null}
        </Pressable>
      </Pressable>
      {wordSheet}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  host: { flex: 1 },
  hidden: { display: "none" },
  backdrop: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.5)" },
  card: { maxHeight: "80%", backgroundColor: "#111", borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 16 },
  inner: { flexShrink: 1 },
  title: { color: "#f5f4f9", fontSize: 18, fontWeight: "800", marginBottom: 10 },
  scroll: { flexGrow: 0 },
  close: { minHeight: 48, justifyContent: "center", alignItems: "center", borderRadius: 12, backgroundColor: "#2a2238", marginTop: 8 },
  closeText: { color: "#c8b5ff", fontSize: 15, fontWeight: "600" },
});
