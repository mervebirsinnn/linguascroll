import { Pressable, StyleSheet, Text, View } from "react-native";

type FeedListFooterProps = {
  height: number;
  width: number;
  nextCursor: string | null;
  isLoadingMore: boolean;
  loadMoreError: string | null;
  /**
   * Feed.tsx zaten doğru fonksiyonu (loadMore ya da refresh) `nextCursor`'a göre
   * resolve edip buraya TEK bir callback olarak geçiriyor — bu bileşen "hangisi
   * çağrılmalı" kararını hiç bilmiyor, sadece "bir eylem tetikle" diyor. Hata
   * durumunda bu bir devam isteğinin (loadMore) retry'ı, session-end durumunda
   * yeni bir session'ın (refresh) başlatılması anlamına gelir.
   */
  onAction: () => void;
};

/**
 * FlatList'in sonuna eklenen tek "sanal sayfa" — pagingEnabled feed'in son
 * item'ından sonra kullanıcının kaydırarak ulaştığı yer. Üç durumu temsil eder:
 *
 *  - loadMoreError: bir continuation/refresh request'i başarısız oldu, önceki
 *    item'lar hâlâ ekranda — kullanıcı burada explicit retry yapabilir (Chunk 8
 *    kararı: otomatik backoff/retry YOK).
 *  - isLoadingMore: bir continuation/refresh request'i devam ediyor.
 *  - nextCursor === null: bu feed session'ı bitti. Otomatik yeni bir session
 *    BAŞLATILMIYOR (Chunk 8 kararı) — kullanıcı burada explicit "Feed'i yenile"
 *    eylemiyle yeni bir session başlatabilir. Buton BİLEREK "Daha fazla içerik
 *    yükle" DEMİYOR: cross-session exclusion yok, yeni session aynı/benzer
 *    içeriğin bir kısmını tekrar üretebilir — buton metni gerçek davranışı
 *    ("yeniden başlat", "devam et" değil) yansıtıyor.
 */
export function FeedListFooter({ height, width, nextCursor, isLoadingMore, loadMoreError, onAction }: FeedListFooterProps) {
  if (loadMoreError) {
    return (
      <View style={[styles.container, { height, width }]}>
        <Text style={styles.message}>Yüklenemedi: {loadMoreError}</Text>
        <Pressable onPress={onAction} style={styles.actionButton}>
          <Text style={styles.actionText}>Tekrar dene</Text>
        </Pressable>
      </View>
    );
  }

  if (isLoadingMore) {
    return (
      <View style={[styles.container, { height, width }]}>
        <Text style={styles.message}>Yükleniyor…</Text>
      </View>
    );
  }

  if (nextCursor === null) {
    return (
      <View style={[styles.container, { height, width }]}>
        <Text style={styles.message}>Bu oturum sona erdi</Text>
        <Pressable onPress={onAction} style={styles.actionButton}>
          <Text style={styles.actionText}>Feed'i yenile</Text>
        </Pressable>
      </View>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#000",
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
  },
  message: {
    color: "#fff",
    fontSize: 16,
    textAlign: "center",
    paddingHorizontal: 24,
  },
  actionButton: {
    borderWidth: 1,
    borderColor: "#444",
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  actionText: {
    color: "#fff",
    fontSize: 16,
  },
});
