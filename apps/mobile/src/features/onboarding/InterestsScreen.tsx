import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { Topic } from "@linguascroll/shared-types";

type InterestsScreenProps = {
  onContinue: (topics: Topic[]) => void;
  onSkip: () => void;
};

/** topicSchema'nın 5 değeri BİREBİR — yeni bir taxonomy YOK. */
const TOPIC_OPTIONS: { topic: Topic; label: string }[] = [
  { topic: "dating", label: "İlişkiler" },
  { topic: "travel", label: "Seyahat" },
  { topic: "career", label: "Kariyer" },
  { topic: "lifestyle", label: "Yaşam Tarzı" },
  { topic: "humor", label: "Mizah" },
];

/**
 * Çok-seçim — 0 seçim de geçerli bir "Devam Et" (skip'ten farkı: kullanıcı
 * bilinçli olarak akıştan geçti, sadece hiçbir topic işaretlemedi — ikisi de
 * `preferences.topics: []` üretir, ranking açısından fark yaratmaz ama
 * `onboarding_completed` vs `onboarding_skipped` analytics ayrımı için
 * ANLAMLI, bkz. ANALYTICS-EVENTS.md).
 */
export function InterestsScreen({ onContinue, onSkip }: InterestsScreenProps) {
  const [selected, setSelected] = useState<Set<Topic>>(new Set());

  function toggle(topic: Topic): void {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(topic)) {
        next.delete(topic);
      } else {
        next.add(topic);
      }
      return next;
    });
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Nelerle ilgileniyorsun?</Text>
      <Text style={styles.subtitle}>İstediğin kadar seçebilirsin — istersen hiç seçmeyebilirsin.</Text>
      <View style={styles.options}>
        {TOPIC_OPTIONS.map(({ topic, label }) => {
          const isSelected = selected.has(topic);
          return (
            <Pressable key={topic} onPress={() => toggle(topic)} style={[styles.option, isSelected && styles.optionSelected]}>
              <Text style={styles.optionLabel}>{label}</Text>
            </Pressable>
          );
        })}
      </View>
      <Pressable onPress={() => onContinue(Array.from(selected))} style={styles.continueButton}>
        <Text style={styles.continueText}>Devam Et</Text>
      </Pressable>
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
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  option: {
    borderWidth: 1,
    borderColor: "#333",
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 18,
  },
  optionSelected: {
    borderColor: "#8ecdfa",
    backgroundColor: "rgba(142,205,250,0.15)",
  },
  optionLabel: {
    color: "#fff",
    fontSize: 15,
  },
  continueButton: {
    marginTop: 40,
    backgroundColor: "#8ecdfa",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  continueText: {
    color: "#000",
    fontSize: 16,
    fontWeight: "700",
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
