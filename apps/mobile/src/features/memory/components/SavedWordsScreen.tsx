import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { formatSavedAt } from "../format-saved-at";
import { useSavedWords } from "../hooks/use-saved-words";

type SavedWordsScreenProps = {
  userId: string;
};

/**
 * Chunk 16, madde 6 — MINIMUM bilgi: lemma/phrase, gloss, savedAt, VE (gerçekten
 * varsa) kaynak cümle. Context yoksa (hiç segment verilmemiş VEYA segment
 * sonradan silinip `sourceSentence` null'a düşmüş) HİÇBİR ŞEY gösterilmiyor —
 * tahmini/uydurma bir context ASLA render edilmiyor.
 */
export function SavedWordsScreen({ userId }: SavedWordsScreenProps) {
  const { state, reload } = useSavedWords(userId);

  if (state.status === "loading") {
    return (
      <View style={styles.centered}>
        <Text style={styles.message}>Yükleniyor…</Text>
      </View>
    );
  }

  if (state.status === "error") {
    // Madde 12 — ham teknik hata mesajı ASLA gösterilmiyor, retry her zaman var.
    return (
      <View style={styles.centered}>
        <Text style={styles.message}>Kayıtlı kelimeler yüklenemedi. Tekrar dene.</Text>
        <Pressable onPress={reload} style={styles.retryButton}>
          <Text style={styles.retryText}>Tekrar dene</Text>
        </Pressable>
      </View>
    );
  }

  if (state.words.length === 0) {
    return (
      <View style={styles.centered}>
        <Text style={styles.message}>Henüz kaydedilmiş bir kelime yok.</Text>
        <Text style={styles.subMessage}>Videolardaki vurgulu kelimelere dokunarak kaydedebilirsin.</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
      {state.words.map((saved) => (
        <View key={saved.word.id} style={styles.card}>
          <Text style={styles.lemma}>{saved.word.lemma}</Text>
          <Text style={styles.gloss}>{saved.word.gloss}</Text>
          {saved.sourceSentence && <Text style={styles.sourceSentence}>“{saved.sourceSentence}”</Text>}
          <Text style={styles.savedAt}>{formatSavedAt(saved.savedAt)}</Text>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
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
  subMessage: {
    color: "#999",
    fontSize: 13,
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
  list: {
    flex: 1,
    backgroundColor: "#000",
  },
  listContent: {
    padding: 16,
    gap: 10,
  },
  card: {
    backgroundColor: "#111",
    borderWidth: 1,
    borderColor: "#333",
    borderRadius: 8,
    padding: 12,
  },
  lemma: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "700",
  },
  gloss: {
    color: "#ccc",
    fontSize: 14,
    marginTop: 2,
  },
  sourceSentence: {
    color: "#8ecdfa",
    fontSize: 13,
    fontStyle: "italic",
    marginTop: 8,
  },
  savedAt: {
    color: "#666",
    fontSize: 12,
    marginTop: 8,
  },
});
