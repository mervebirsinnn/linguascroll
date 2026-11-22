import { Pressable, StyleSheet, Text, View } from "react-native";
import { PageFrame, pageStyles } from "./PageFrame";

type PassageEndPageProps = {
  height: number;
  width: number;
  /** Devam sayfası isteği başarısız olduysa kullanıcı-dostu mesaj (ham hata metni DEĞİL). */
  loadMoreError: string | null;
  /** Sunucu "devamı var" diyor (nextCursor !== null). false → seviye bitti. */
  hasMore: boolean;
  onRetry: () => void;
};

/** Listenin sonundaki yapay sayfa: devam yükleniyor / hata + tekrar dene / seviye bitti (otomatik yeniden başlama YOK). */
export function PassageEndPage({ height, width, loadMoreError, hasMore, onRetry }: PassageEndPageProps) {
  return (
    <PageFrame height={height} width={width}>
      {loadMoreError ? (
        <View style={pageStyles.errorBox}>
          <Text accessibilityRole="alert" style={pageStyles.errorText}>{loadMoreError}</Text>
          <Pressable accessibilityRole="button" onPress={onRetry} style={pageStyles.secondaryButton}>
            <Text style={pageStyles.secondaryButtonText}>Tekrar dene</Text>
          </Pressable>
        </View>
      ) : hasMore ? (
        <Text style={styles.text}>Devamı yükleniyor…</Text>
      ) : (
        <Text style={styles.text}>Bu seviyedeki metinler bitti. Üstteki seviye düğmelerinden başka bir seviye seçebilirsin.</Text>
      )}
    </PageFrame>
  );
}

const styles = StyleSheet.create({
  text: { color: "#aba8b9", fontSize: 15, lineHeight: 22, textAlign: "center", marginTop: 40 },
});
