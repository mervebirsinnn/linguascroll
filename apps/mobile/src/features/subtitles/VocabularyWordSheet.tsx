import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import type { VideoVocabularyItem } from "@linguascroll/shared-types";

type VocabularyWordSheetProps = {
  /**
   * Tıklandığı ANDAKİ kelimenin snapshot'ı — null ise sheet kapalı.
   * `ExplanationSheet`'teki `segment` prop'uyla AYNI desen (bkz. o dosyanın
   * yorumu) — VideoFeedItem'da sabitlenir, sheet açıkken değişmez.
   */
  word: VideoVocabularyItem | null;
  onClose: () => void;
  isSaved: boolean;
  isPending: boolean;
  onToggleSave: () => void;
};

/**
 * Chunk 14 — word-tap akışının son adımı: subtitle → (bilinen) kelime → bu
 * sheet → meaning + save. `ExplanationSheet`'in AYNI Modal deseni (yeni bir
 * bottom-sheet dependency YOK) — ama çok daha küçük içerik (tek kelime/phrase +
 * gloss), bu yüzden EN/TR dil toggle'ı YOK (gloss zaten tek, sabit dilde —
 * bkz. shared-types/word.ts'in "MVP boyunca TEK, SABİT bir açıklama dili"
 * kararı — ExplanationSheet'in EN/TR toggle'ı ayrı bir kavram, buraya
 * taşınmıyor).
 */
export function VocabularyWordSheet({ word, onClose, isSaved, isPending, onToggleSave }: VocabularyWordSheetProps) {
  return (
    <Modal visible={word !== null} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.card} onPress={() => {}}>
          {word && (
            <View>
              <Text style={styles.lemma}>{word.word.lemma}</Text>
              <Text style={styles.gloss}>{word.word.gloss}</Text>
              <Pressable
                onPress={onToggleSave}
                disabled={isPending}
                style={[styles.saveButton, isSaved && styles.saveButtonSaved]}
              >
                <Text style={styles.saveButtonText}>{isPending ? "…" : isSaved ? "Kaydedildi ✓" : "Kaydet"}</Text>
              </Pressable>
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
  lemma: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 6,
  },
  gloss: {
    color: "#ddd",
    fontSize: 16,
    marginBottom: 16,
  },
  saveButton: {
    borderWidth: 1,
    borderColor: "#444",
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: "center",
  },
  saveButtonSaved: {
    borderColor: "#2ecc71",
  },
  saveButtonText: {
    color: "#8ecdfa",
    fontSize: 15,
    fontWeight: "600",
  },
});
