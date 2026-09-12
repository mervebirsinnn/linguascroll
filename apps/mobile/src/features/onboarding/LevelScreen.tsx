import { Pressable, StyleSheet, Text, View } from "react-native";
import type { CefrLevel } from "@linguascroll/shared-types";

type LevelScreenProps = {
  /** Seçim ANINDA bir sonraki adıma geçilir — ayrı bir "Devam Et" butonu YOK (tek-seçim, form gibi hissettirmemesi için). */
  onSelect: (level: CefrLevel) => void;
  onSkip: () => void;
};

/** cefrLevelSchema'nın 6 değeri BİREBİR — yeni bir taxonomy YOK, sadece insan-okunabilir bir alt-etiket (sunum, veri değil). */
const LEVEL_OPTIONS: { level: CefrLevel; label: string }[] = [
  { level: "A1", label: "Başlangıç" },
  { level: "A2", label: "Temel" },
  { level: "B1", label: "Orta" },
  { level: "B2", label: "Orta-Üstü" },
  { level: "C1", label: "İleri" },
  { level: "C2", label: "Uzman" },
];

export function LevelScreen({ onSelect, onSkip }: LevelScreenProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>İngilizce seviyen nedir?</Text>
      <Text style={styles.subtitle}>Sana uygun videoları önceliklendirmemize yardımcı olur.</Text>
      <View style={styles.options}>
        {LEVEL_OPTIONS.map(({ level, label }) => (
          <Pressable key={level} style={styles.option} onPress={() => onSelect(level)}>
            <Text style={styles.optionLevel}>{level}</Text>
            <Text style={styles.optionLabel}>{label}</Text>
          </Pressable>
        ))}
      </View>
      <Pressable onPress={onSkip} style={styles.skipButton}>
        <Text style={styles.skipText}>Atla</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
    paddingHorizontal: 24,
    paddingTop: 96,
  },
  title: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 8,
  },
  subtitle: {
    color: "#999",
    fontSize: 14,
    marginBottom: 32,
  },
  options: {
    gap: 12,
  },
  option: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderColor: "#333",
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  optionLevel: {
    color: "#8ecdfa",
    fontSize: 16,
    fontWeight: "700",
    width: 32,
  },
  optionLabel: {
    color: "#fff",
    fontSize: 16,
  },
  skipButton: {
    marginTop: "auto",
    marginBottom: 48,
    alignSelf: "center",
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  skipText: {
    color: "#888",
    fontSize: 15,
  },
});
