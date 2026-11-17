import { Modal, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import type { VideoVocabularyItem } from "@linguascroll/shared-types";
import { useAndroidBottomSheetNavInset } from "../../shared/bottom-sheet-inset";

type VocabularyWordSheetProps = {
  /**
   * Tıklandığı ANDAKİ kelimenin snapshot'ı — null ise sheet kapalı.
   * `ExplanationSheet`'teki `segment` prop'uyla AYNI desen (bkz. o dosyanın
   * yorumu) — VideoFeedItem'da sabitlenir, sheet açıkken değişmez.
   */
  word: VideoVocabularyItem | null;
  /** 2026-11-17 — kelimenin dokunulduğu altyazı cümlesi (WordGlossSheet'teki gibi bağlam olarak gösterilir). */
  sentence?: string;
  onClose: () => void;
  isSaved: boolean;
  isPending: boolean;
  onToggleSave: () => void;
};

/**
 * Chunk 14 — word-tap akışının son adımı: subtitle → (bilinen) kelime → bu
 * sheet → meaning + save. `ExplanationSheet`'in AYNI Modal deseni (yeni bir
 * bottom-sheet dependency YOK), EN/TR dil toggle'ı YOK (gloss tek, sabit dilde).
 *
 * 2026-11-17 — görünüm altyazı kelimesi penceresiyle (WordGlossSheet) BİRLEŞTİRİLDİ (ürün kararı: kullanıcı
 * iki farklı kelime penceresi görmesin). Aynı kart, aynı yazı/renkler, cümle bağlamı, "Kelimelerime kaydet"
 * ve "Videoya dön". Davranış aynı kaldı: kaydetme/çıkarma Feed'deki tek saved-state'ten (useSavedWordIds)
 * geçer, Loopi kaydı da oradan. Eski pencere kayıtlı kelimeyi aynı düğmeyle çıkarabiliyordu; bu yetenek
 * kaybolmasın diye kayıtlıyken ayrı, düşük vurgulu bir "Kelimelerimden çıkar" bağlantısı var — ana düğme
 * WordGlossSheet'teki gibi kayıtlıyken pasif (yanlışlıkla çıkarma olmasın).
 */
export function VocabularyWordSheet({ word, sentence, onClose, isSaved, isPending, onToggleSave }: VocabularyWordSheetProps) {
  const androidBottomSheetNavInset = useAndroidBottomSheetNavInset();
  return (
    <Modal visible={word !== null} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable
          style={[
            styles.card,
            // iOS'un mevcut layout'u (sadece styles.card.padding) cihaz testinde
            // doğru çalıştığı için BİLEREK dokunulmuyor — bu ek stil SADECE
            // Android'de uygulanıyor (bkz. bottom-sheet-inset.ts).
            Platform.OS === "android" && { paddingBottom: 16 + androidBottomSheetNavInset },
          ]}
          onPress={() => {}}
        >
          {word && (
            <View>
              <Text style={styles.word}>{word.word.lemma}</Text>
              <Text style={styles.gloss}>{word.word.gloss}</Text>
              {sentence && <Text style={[styles.gloss, styles.sentence]}>{sentence}</Text>}
              <Pressable
                accessibilityRole="button"
                disabled={isPending || isSaved}
                onPress={onToggleSave}
                style={styles.save}
              >
                <Text style={styles.saveText}>{isPending ? "Kaydediliyor…" : isSaved ? "Kelimelerine eklendi ✓" : "Kelimelerime kaydet"}</Text>
              </Pressable>
              <Pressable onPress={onClose} accessibilityRole="button" style={styles.save}>
                <Text style={styles.saveText}>Videoya dön</Text>
              </Pressable>
              {isSaved && !isPending && (
                <Pressable onPress={onToggleSave} accessibilityRole="button" style={styles.remove}>
                  <Text style={styles.removeText}>Kelimelerimden çıkar</Text>
                </Pressable>
              )}
            </View>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// WordGlossSheet.tsx ile aynı değerler (iki pencere görsel olarak aynı kalsın).
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
  sentence: { marginTop: 12, fontStyle: "italic" },
  save: { minHeight: 48, justifyContent: "center", alignItems: "center", borderRadius: 12, backgroundColor: "#2a2238", marginTop: 12 },
  saveText: { color: "#c8b5ff", fontSize: 15, fontWeight: "600" },
  remove: { minHeight: 44, justifyContent: "center", alignItems: "center", marginTop: 4 },
  removeText: { color: "#9a93ab", fontSize: 13, fontWeight: "600" },
});
