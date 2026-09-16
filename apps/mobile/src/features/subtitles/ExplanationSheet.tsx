import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import type { TranscriptSegment, VideoVocabularyItem } from "@linguascroll/shared-types";
import { useExplanationLanguage } from "../preferences/use-explanation-language";
import { resolveSegmentExplanation } from "./resolve-segment-explanation";

type ExplanationSheetProps = {
  /**
   * Tıklandığı ANDAKİ segment'in snapshot'ı — null ise sheet kapalı. Bu değer
   * VideoFeedItem'da SABİTLENİR: sheet açıkken video'nun canlı aktif segment'i
   * değişse bile (teorik olarak — video zaten pause'da) buradaki içerik ASLA
   * değişmez (bkz. VideoFeedItem'daki `openSegment` state yorumu).
   */
  segment: TranscriptSegment | null;
  /**
   * Chunk 16 revizyon — `resolveSegmentExplanation`'ın vocabulary-fallback adımı
   * için (bkz. o dosya): segment'in kendi açıklaması, orijinal cümlenin bir
   * tekrarıysa, video'nun (segment'in DEĞİL) bilinen vocabulary'sinde bu
   * segment'te geçen bir kelime aranıyor — SubtitleOverlay'e geçirilenle AYNI liste.
   */
  vocabulary: readonly VideoVocabularyItem[];
  onClose: () => void;
};

/**
 * Basit bir bottom-sheet-benzeri Modal — yeni bir bottom-sheet dependency YOK,
 * RN'in kendi Modal'ı MVP için yeterli. video → subtitle → tap → explanation →
 * EN/TR mode akışının son adımı.
 */
export function ExplanationSheet({ segment, vocabulary, onClose }: ExplanationSheetProps) {
  const [language, setLanguage] = useExplanationLanguage();
  // Chunk 16 revizyon — cihaz smoke test'inde bulunan bug: `segment.englishExplanation`
  // bazen orijinal cümlenin (neredeyse) birebir tekrarıydı. `segment` null olabildiği
  // için resolver'ı SADECE segment doluyken çağırıyoruz (bkz. aşağıdaki JSX'teki
  // `segment &&` guard'ıyla AYNI null-check, burada tekrar etmemek için `resolved`
  // `segment` null iken hesaplanmıyor).
  const resolved = segment ? resolveSegmentExplanation(segment, vocabulary, language) : null;

  return (
    <Modal visible={segment !== null} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        {/* İç Pressable: backdrop'a tıklayınca kapanma davranışını, kartın
            KENDİSİNE tıklamanın tetiklememesi için — event bubbling'i burada durduruyoruz. */}
        <Pressable style={styles.card} onPress={() => {}}>
          <View style={styles.languageToggle}>
            <Pressable
              onPress={() => setLanguage("en")}
              style={[styles.languageButton, language === "en" && styles.languageButtonActive]}
            >
              <Text style={styles.languageButtonText}>English</Text>
            </Pressable>
            <Pressable
              onPress={() => setLanguage("tr")}
              style={[styles.languageButton, language === "tr" && styles.languageButtonActive]}
            >
              <Text style={styles.languageButtonText}>Türkçe</Text>
            </Pressable>
          </View>

          {segment && (
            <ScrollView style={styles.body}>
              <Text style={styles.sentence}>{segment.text}</Text>
              {resolved?.kind === "sentence" && <Text style={styles.explanation}>{resolved.text}</Text>}
              {resolved?.kind === "labeled" && (
                <View>
                  <Text style={styles.explanationLabel}>{resolved.label}</Text>
                  <Text style={styles.explanation}>{resolved.text}</Text>
                </View>
              )}
              {/* resolved?.kind === "none" — requirement madde 2: orijinal cümle ASLA
                  tekrar gösterilmez, bu yüzden burada BİLEREK hiçbir şey render edilmiyor
                  (segment.learningPoints listesi aşağıda zaten ayrıca gösteriliyor). */}

              {segment.learningPoints.map((point) => (
                <View key={point.id} style={styles.learningPoint}>
                  <Text style={styles.learningPointExpression}>
                    {point.expression} <Text style={styles.learningPointType}>({point.type})</Text>
                  </Text>
                  <Text style={styles.learningPointExplanation}>
                    {language === "en" ? point.englishExplanation : point.turkishExplanation}
                  </Text>
                  {(language === "en" ? point.exampleEn : point.exampleTr) && (
                    <Text style={styles.learningPointExample}>
                      “{language === "en" ? point.exampleEn : point.exampleTr}”
                    </Text>
                  )}
                </View>
              ))}
            </ScrollView>
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
    maxHeight: "60%",
    backgroundColor: "#111",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 16,
  },
  languageToggle: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
  },
  languageButton: {
    borderWidth: 1,
    borderColor: "#444",
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  languageButtonActive: {
    borderColor: "#8ecdfa",
    backgroundColor: "rgba(142,205,250,0.15)",
  },
  languageButtonText: {
    color: "#fff",
    fontSize: 14,
  },
  body: {
    flexGrow: 0,
  },
  sentence: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "700",
    marginBottom: 8,
  },
  explanation: {
    color: "#ddd",
    fontSize: 15,
    marginBottom: 16,
  },
  explanationLabel: {
    color: "#8ecdfa",
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 2,
  },
  learningPoint: {
    borderTopWidth: 1,
    borderTopColor: "#333",
    paddingTop: 10,
    marginTop: 10,
  },
  learningPointExpression: {
    color: "#8ecdfa",
    fontSize: 15,
    fontWeight: "600",
  },
  learningPointType: {
    color: "#888",
    fontWeight: "400",
    fontSize: 12,
  },
  learningPointExplanation: {
    color: "#ccc",
    fontSize: 14,
    marginTop: 4,
  },
  learningPointExample: {
    color: "#999",
    fontSize: 13,
    fontStyle: "italic",
    marginTop: 4,
  },
});
