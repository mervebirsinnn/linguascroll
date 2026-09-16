import { Pressable, StyleSheet, Text, View } from "react-native";
import { useWordsProgress } from "../hooks/use-words-progress";

type ProgressScreenProps = {
  userId: string;
};

/**
 * Chunk 16, madde 7 — MVP ilerleme: sadece gerçek DB'den türeyen sayılar.
 * Streak/XP/level-up/coin YOK (kullanıcı kararı, bilinçli olarak eklenmedi).
 * Tüm sayılar DISTINCT kelime/phrase sayısı — shared-types/words-progress.ts'in
 * semantik yorumuyla AYNI, burada da aynı ayrımı Türkçe etiketlerde koruyoruz.
 */
export function ProgressScreen({ userId }: ProgressScreenProps) {
  const { state, reload } = useWordsProgress(userId);

  if (state.status === "loading") {
    return (
      <View style={styles.centered}>
        <Text style={styles.message}>Yükleniyor…</Text>
      </View>
    );
  }

  if (state.status === "error") {
    return (
      <View style={styles.centered}>
        <Text style={styles.message}>İlerleme bilgisi yüklenemedi. Tekrar dene.</Text>
        <Pressable onPress={reload} style={styles.retryButton}>
          <Text style={styles.retryText}>Tekrar dene</Text>
        </Pressable>
      </View>
    );
  }

  const { progress } = state;

  return (
    <View style={styles.container}>
      <ProgressRow label="Toplam kaydedilen ifade" value={progress.savedCount} subValue={progress.savedThisWeek} />
      <ProgressRow label="Tekrar edilen ifade" value={progress.reviewedCount} subValue={progress.reviewedThisWeek} />
      <ProgressRow
        label="Doğru hatırlanan ifade"
        value={progress.rememberedCorrectlyCount}
        subValue={progress.rememberedCorrectlyThisWeek}
      />
    </View>
  );
}

function ProgressRow({ label, value, subValue }: { label: string; value: number; subValue: number }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
      <Text style={styles.rowSubValue}>Bu hafta: {subValue}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
    padding: 16,
    gap: 12,
  },
  centered: {
    flex: 1,
    backgroundColor: "#000",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 32,
  },
  message: {
    color: "#fff",
    fontSize: 15,
    textAlign: "center",
  },
  retryButton: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: "#444",
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 20,
  },
  retryText: {
    color: "#8ecdfa",
    fontSize: 14,
    fontWeight: "600",
  },
  row: {
    backgroundColor: "#111",
    borderWidth: 1,
    borderColor: "#333",
    borderRadius: 8,
    padding: 16,
  },
  rowLabel: {
    color: "#ccc",
    fontSize: 14,
  },
  rowValue: {
    color: "#fff",
    fontSize: 28,
    fontWeight: "700",
    marginTop: 4,
  },
  rowSubValue: {
    color: "#666",
    fontSize: 12,
    marginTop: 4,
  },
});
