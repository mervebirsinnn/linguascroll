import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useReviewSession } from "../hooks/use-review-session";
import { ReviewCard } from "./ReviewCard";

type ReviewScreenProps = {
  userId: string;
};

/**
 * Chunk 16, madde 5/11 — review session backend'de BİR KEZ hesaplanan,
 * dondurulmuş bir liste (en fazla 5, sadece gerçekten due olanlar). Bu ekran
 * o listeyi SIRAYLA tüketir — her cevaptan sonra backend'i YENİDEN sorgulayıp
 * listeyi değiştirmiyor (feed'in frozen-plan session'ıyla kavramsal olarak
 * aynı disiplin). Review, feed'e asla ZORLA arayan bir kesinti DEĞİL — kullanıcı
 * MemoryFlow üzerinden kendi isteğiyle buraya geliyor.
 */
export function ReviewScreen({ userId }: ReviewScreenProps) {
  const { state, reload } = useReviewSession(userId);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [completedCount, setCompletedCount] = useState(0);

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
        <Text style={styles.message}>Tekrar oturumu yüklenemedi. Tekrar dene.</Text>
        <Pressable onPress={reload} style={styles.retryButton}>
          <Text style={styles.retryText}>Tekrar dene</Text>
        </Pressable>
      </View>
    );
  }

  // Madde 12 — "hiç kayıtlı kelime yok" (SavedWordsScreen'in boş mesajı) İLE
  // "kayıtlı kelime var ama hiçbiri şu an due değil" AYRI, farklı mesajlar.
  if (state.words.length === 0) {
    return (
      <View style={styles.centered}>
        <Text style={styles.message}>Şimdilik tekrar bekleyen bir kelime yok.</Text>
      </View>
    );
  }

  if (currentIndex >= state.words.length) {
    return (
      <View style={styles.centered}>
        <Text style={styles.message}>Bu oturumdaki tüm kelimeleri tekrar ettin 🎉</Text>
        <Text style={styles.subMessage}>{completedCount} kelime tekrar edildi.</Text>
      </View>
    );
  }

  const currentWord = state.words[currentIndex]!;

  function handleAnswered(): void {
    setCompletedCount((count) => count + 1);
    setCurrentIndex((index) => index + 1);
  }

  return (
    <View style={styles.container}>
      <Text style={styles.progressLabel}>
        {currentIndex + 1} / {state.words.length}
      </Text>
      {/* `key` — kart index değiştiğinde React'in yeni bir instance mount etmesini
          garanti eder, ReviewCard'ın iç state'i (revealed/submitError vb.) elle
          sıfırlanmaya gerek kalmadan temiz başlar (bkz. ReviewCard'ın yorumu). */}
      <ReviewCard key={currentWord.word.id} word={currentWord} userId={userId} onAnswered={handleAnswered} />
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
  progressLabel: {
    color: "#666",
    fontSize: 13,
    textAlign: "center",
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
});
