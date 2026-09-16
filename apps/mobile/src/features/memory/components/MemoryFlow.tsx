import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { ProgressScreen } from "./ProgressScreen";
import { ReviewScreen } from "./ReviewScreen";
import { SavedWordsScreen } from "./SavedWordsScreen";

type MemoryFlowProps = {
  userId: string;
  onBack: () => void;
};

type MemoryTab = "saved" | "review" | "progress";

/**
 * Chunk 16, madde 11 — OnboardingFlow.tsx'teki AYNI karar: navigation kütüphanesi
 * (react-navigation/expo-router) EKLENMEDİ, App.tsx'in mevcut "duruma göre
 * conditional render" deseni burada da tekrarlanıyor — bu sefer üç "alan"
 * (Saved/Review/Progress) arasında, bir tab BAR gibi görünen ama aslında düz
 * bir useState anahtarlama. Bir tab/navigation FRAMEWORK'üne büyütülmüyor.
 *
 * Feed HALA birincil ürün — bu ekran SADECE App.tsx'teki açık bir kullanıcı
 * eylemiyle (Feed'deki "Kelimelerim" butonu) açılıyor, feed'e asla zorla bir
 * kesinti olarak enjekte edilmiyor.
 */
export function MemoryFlow({ userId, onBack }: MemoryFlowProps) {
  const [tab, setTab] = useState<MemoryTab>("saved");

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={onBack} style={styles.backButton}>
          <Text style={styles.backButtonText}>← Feed</Text>
        </Pressable>
        <Text style={styles.title}>Kelimelerim</Text>
      </View>
      <View style={styles.tabBar}>
        <TabButton label="Kayıtlı" active={tab === "saved"} onPress={() => setTab("saved")} />
        <TabButton label="Tekrar" active={tab === "review"} onPress={() => setTab("review")} />
        <TabButton label="İlerleme" active={tab === "progress"} onPress={() => setTab("progress")} />
      </View>
      <View style={styles.content}>
        {tab === "saved" && <SavedWordsScreen userId={userId} />}
        {tab === "review" && <ReviewScreen userId={userId} />}
        {tab === "progress" && <ProgressScreen userId={userId} />}
      </View>
    </View>
  );
}

function TabButton({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.tabButton, active && styles.tabButtonActive]}>
      <Text style={[styles.tabButtonText, active && styles.tabButtonTextActive]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 56,
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  backButton: {
    paddingVertical: 6,
    paddingRight: 12,
  },
  backButtonText: {
    color: "#8ecdfa",
    fontSize: 15,
    fontWeight: "600",
  },
  title: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
  },
  tabBar: {
    flexDirection: "row",
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 8,
  },
  tabButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#333",
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: "center",
  },
  tabButtonActive: {
    borderColor: "#8ecdfa",
  },
  tabButtonText: {
    color: "#999",
    fontSize: 13,
    fontWeight: "600",
  },
  tabButtonTextActive: {
    color: "#8ecdfa",
  },
  content: {
    flex: 1,
  },
});
