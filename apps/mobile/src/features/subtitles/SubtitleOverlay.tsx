import { Pressable, StyleSheet, Text } from "react-native";
import type { TranscriptSegment } from "@linguascroll/shared-types";

type SubtitleOverlayProps = {
  /** null ise (henüz segment başlamadı / segment'ler arası boşluk / transcript'siz video) hiçbir şey render edilmez. */
  segment: TranscriptSegment | null;
  onPress: (segment: TranscriptSegment) => void;
};

/**
 * Sade bir tıklanabilir altyazı satırı — video ekranının alt kısmında. Kendi
 * timing mantığını BİLMİYOR (bkz. useActiveSubtitle) — sadece "şu an hangi
 * segment aktif" bilgisini render ediyor.
 */
export function SubtitleOverlay({ segment, onPress }: SubtitleOverlayProps) {
  if (!segment) {
    return null;
  }

  return (
    <Pressable style={styles.container} onPress={() => onPress(segment)}>
      <Text style={styles.text}>{segment.text}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: 96,
    backgroundColor: "rgba(0,0,0,0.6)",
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  text: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
  },
});
