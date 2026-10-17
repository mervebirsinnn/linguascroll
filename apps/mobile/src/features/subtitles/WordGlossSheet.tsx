import { Modal, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { useAndroidBottomSheetNavInset } from "../../shared/bottom-sheet-inset";

export type OpenWordGloss = { word: string; gloss: string };

type WordGlossSheetProps = {
  /** Tıklandığı ANDAKİ kelime + anlamı (snapshot) — null ise sheet kapalı. */
  entry: OpenWordGloss | null;
  onClose: () => void;
};

/**
 * Kürate OLMAYAN (offline üretilmiş anlamı olan) altyazı kelimesinin anlam
 * sheet'i. `VocabularyWordSheet`'in AYNI Modal deseni, ama bilinçli olarak AYRI
 * bir component: burada "Kaydet" YOK (üretilen kelimeler `words` tablosunda değil,
 * kayıt/review akışına bağlı değil) — tek bir component'e opsiyonel prop'larla
 * iki farklı davranış sıkıştırmak yerine iki küçük, tek amaçlı sheet.
 */
export function WordGlossSheet({ entry, onClose }: WordGlossSheetProps) {
  const androidBottomSheetNavInset = useAndroidBottomSheetNavInset();
  return (
    <Modal visible={entry !== null} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable
          style={[styles.card, Platform.OS === "android" && { paddingBottom: 16 + androidBottomSheetNavInset }]}
          onPress={() => {}}
        >
          {entry && (
            <View>
              <Text style={styles.word}>{entry.word}</Text>
              <Text style={styles.gloss}>{entry.gloss}</Text>
            </View>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  card: {
    backgroundColor: "#111",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 16,
  },
  word: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 6,
  },
  gloss: {
    color: "#ddd",
    fontSize: 16,
  },
});
