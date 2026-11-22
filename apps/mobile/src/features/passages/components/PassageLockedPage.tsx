import { Pressable, StyleSheet, Text } from "react-native";
import { PageFrame, pageStyles } from "./PageFrame";

type PassageLockedPageProps = {
  title: string;
  level: string;
  topic: string;
  height: number;
  width: number;
  onUnlock: () => void;
  onNext?: () => void;
};

/**
 * Kilitli metin: sunucu yalnız başlık/seviye/konu verir (paragraf, soru, kelime id'si YOK). Abonelik doğrulandığında liste
 * sunucudan yeniden çekilir ve kart açık metne dönüşür (bkz. usePassages erişim akışı).
 */
export function PassageLockedPage({ title, level, topic, height, width, onUnlock, onNext }: PassageLockedPageProps) {
  return (
    <PageFrame height={height} width={width} chip={`${level} · ${topic}`} onNext={onNext} nextLabel="Sonraki metin ›">
      <Text accessibilityRole="header" style={pageStyles.title}>{title}</Text>
      <Text style={styles.lock}>🔒 Bu metin abonelikle açılır</Text>
      <Text style={pageStyles.muted}>Premium ile tüm metinlere, sorulara ve kelime anlamlarına eriş. Ücretsiz örnek metinler aboneliksiz açıktır.</Text>
      <Pressable accessibilityRole="button" onPress={onUnlock} style={pageStyles.primaryButton}>
        <Text style={pageStyles.primaryButtonText}>Premium'u gör</Text>
      </Pressable>
    </PageFrame>
  );
}

const styles = StyleSheet.create({
  lock: { color: "#ffd479", fontSize: 18, fontWeight: "800", marginBottom: 10 },
});
