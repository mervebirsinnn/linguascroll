import { Linking, Modal, Pressable, ScrollView, StyleSheet, Text } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { VideoAttribution } from "@linguascroll/shared-types";

export function VideoAttributionSheet({ attribution, open, onClose }: {
  attribution: VideoAttribution; open: boolean; onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  return <Modal visible={open} transparent animationType="slide" onRequestClose={onClose}>
    <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Kaynak bilgisini kapat">
      <Pressable style={[styles.card, { paddingBottom: 24 + insets.bottom }]} onPress={() => {}}>
        <ScrollView>
          <Text style={styles.heading}>{attribution.title}</Text>
          <Text style={styles.body}>{attribution.credit}</Text>
          <Text style={styles.body}>{attribution.changes}</Text>
          <Pressable accessibilityRole="link" onPress={() => { void Linking.openURL(attribution.sourceUrl).catch(() => {}); }}>
            <Text style={styles.link}>Orijinal kaynak</Text>
          </Pressable>
          <Pressable accessibilityRole="link" onPress={() => { void Linking.openURL(attribution.licenseUrl).catch(() => {}); }}>
            <Text style={styles.link}>{attribution.license} · Lisans koşulları</Text>
          </Pressable>
          <Pressable onPress={onClose} accessibilityRole="button"><Text style={styles.link}>Kapat</Text></Pressable>
        </ScrollView>
      </Pressable>
    </Pressable>
  </Modal>;
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.65)" },
  card: { backgroundColor: "#211b2c", padding: 24, borderTopLeftRadius: 18, borderTopRightRadius: 18, maxHeight: "75%" },
  heading: { color: "#e4d6fa", fontSize: 24, fontWeight: "600", marginBottom: 12 },
  body: { color: "#d0c4dd", fontSize: 14, lineHeight: 22, marginBottom: 12 },
  link: { color: "#bca7ff", fontSize: 15, paddingVertical: 12 },
});
