import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import type { Passage } from "@linguascroll/shared-types";
import { useAndroidBottomSheetNavInset } from "../../../shared/bottom-sheet-inset";

type OpenPassage = Extract<Passage, { access: "open" }>;

type ShowTextSheetProps = {
  /** null → kapalı. Soru sayfasından "Metni göster": metin tekrar okunsun, soru sayfasından çıkmadan. */
  passage: OpenPassage | null;
  onClose: () => void;
};

/** Salt-okunur metin penceresi (kelime dokunması YOK: kelime anlamı metin sayfasında; burası soru çözerken hızlı bakış). */
export function ShowTextSheet({ passage, onClose }: ShowTextSheetProps) {
  const inset = useAndroidBottomSheetNavInset();
  return (
    <Modal visible={passage !== null} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={[styles.card, { paddingBottom: 16 + inset }]} onPress={() => {}}>
          {passage ? (
            <View style={styles.inner}>
              <Text accessibilityRole="header" style={styles.title}>{passage.title}</Text>
              <ScrollView style={styles.scroll}>
                {passage.paragraphs.map((runs, index) => (
                  <Text key={index} style={styles.paragraph}>{runs.map((run) => run.text).join("")}</Text>
                ))}
              </ScrollView>
              <Pressable accessibilityRole="button" onPress={onClose} style={styles.close}>
                <Text style={styles.closeText}>Soruya dön</Text>
              </Pressable>
            </View>
          ) : null}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.5)" },
  card: { maxHeight: "80%", backgroundColor: "#111", borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 16 },
  inner: { flexShrink: 1 },
  title: { color: "#f5f4f9", fontSize: 18, fontWeight: "800", marginBottom: 10 },
  scroll: { flexGrow: 0 },
  paragraph: { color: "#e7e5ef", fontSize: 16, lineHeight: 25, marginBottom: 12 },
  close: { minHeight: 48, justifyContent: "center", alignItems: "center", borderRadius: 12, backgroundColor: "#2a2238", marginTop: 8 },
  closeText: { color: "#c8b5ff", fontSize: 15, fontWeight: "600" },
});
