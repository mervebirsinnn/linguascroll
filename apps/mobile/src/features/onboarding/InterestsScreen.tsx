import { canContinueInterests, MIN_INTERESTS } from "./onboarding-state";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { topicSchema, TOPIC_LABELS, type Topic } from "@linguascroll/shared-types";

type InterestsScreenProps = {
  onContinue: (topics: Topic[]) => void;
  initialTopics?: readonly Topic[];
};

const TOPIC_OPTIONS = topicSchema.options.map((topic) => ({topic, label: TOPIC_LABELS[topic]}));

/** İlgi alanları çoklu seçilir; dört ayrı seçim olmadan devam edilemez. */
export function InterestsScreen({ onContinue, initialTopics = [] }: InterestsScreenProps) {
  const [selected, setSelected] = useState<Set<Topic>>(() => new Set(initialTopics));

  const canContinue = canContinueInterests([...selected]);

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
    <ScrollView style={styles.screen} contentContainerStyle={styles.container}>
      <Text style={styles.title}>Nelerle ilgileniyorsun?</Text>
      <Text style={styles.subtitle}>Akışını çeşitlendirmek için en az 4 ilgi alanı seç.</Text>
      <View style={styles.options}>
        {TOPIC_OPTIONS.map(({ topic, label }) => {
          const isSelected = selected.has(topic);
          return (
            <Pressable key={topic} accessibilityRole="checkbox" accessibilityState={{ checked: isSelected }} onPress={() => toggle(topic)} style={[styles.option, isSelected && (canContinue ? styles.optionValid : styles.optionInvalid)]}>
              <Text style={styles.optionLabel}>{label}</Text>
            </Pressable>
          );
        })}
      </View>
      <Text accessibilityLiveRegion="polite" style={styles.subtitle}>{selected.size} seçildi · En az {MIN_INTERESTS}</Text>
      <Pressable accessibilityRole="button" accessibilityState={{ disabled: !canContinue }} disabled={!canContinue} onPress={() => { if (canContinue) onContinue(Array.from(selected)); }} style={[styles.continueButton, !canContinue && { opacity: 0.4 }]}>
        <Text style={styles.continueText}>Akışa devam et</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#000" },
  container: {
    flexGrow: 1,
    backgroundColor: "#000",
    paddingHorizontal: 24,
    paddingTop: 64,
    paddingBottom: 48,
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
  optionValid: { borderColor: "#7bd88f", backgroundColor: "rgba(123,216,143,0.15)" },
  optionInvalid: { borderColor: "#ff7b87", backgroundColor: "rgba(255,123,135,0.12)" },
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
});
