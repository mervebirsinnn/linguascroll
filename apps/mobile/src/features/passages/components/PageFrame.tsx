import type { ReactNode } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

/**
 * Okuma pratiği pager'ının TEK sayfa çerçevesi: sabit boyut (pagingEnabled FlatList'in getItemLayout'u ile uyumlu), kaydırılabilir
 * gövde ve ALTTA SABİT bir "Sonraki" çubuğu.
 *
 * Neden altta sabit "Sonraki" düğmesi: gövde bir ScrollView; uzun metin/açıklama taşarsa dikey kaydırma dış (sayfa) FlatList ile
 * AYNI eksende çakışır — iç ScrollView dokunuşu yutar ve sayfa kaydırması çalışmaz (bkz. PaywallFeedItem'ın aynı sebeple
 * ScrollView kullanmaması). Taşmayan sayfada dokunuş dış listeye geçer (kaydırınca sonraki sayfa); taşan sayfada kullanıcı içeriği
 * okuyup bu düğmeyle ilerler. Düğme sayfa türünden bağımsız her zaman erişilebilir olduğu için hiçbir sayfa "kilitli kalmaz".
 * Gerçek cihazda iç/dış kaydırma etkileşimi doğrulanmadı (raporda).
 */
type PageFrameProps = {
  height: number;
  width: number;
  /** Sayfanın üstündeki küçük etiket ("B2 · Sinirbilim", "Soru 2/4 · Ana fikir"). */
  chip?: string;
  children: ReactNode;
  /** Verilirse alt çubukta "Sonraki" düğmesi çizilir. */
  onNext?: () => void;
  nextLabel?: string;
  /** Alt çubukta, "Sonraki"nin solunda ek eylem (ör. "Metni göster"). */
  footerExtra?: ReactNode;
};

export function PageFrame({ height, width, chip, children, onNext, nextLabel = "Sonraki ›", footerExtra }: PageFrameProps) {
  return (
    <View style={[styles.frame, { height, width }]}>
      <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent} keyboardShouldPersistTaps="handled">
        {chip ? <Text style={styles.chip}>{chip}</Text> : null}
        {children}
      </ScrollView>
      {onNext || footerExtra ? (
        <View style={styles.footer}>
          {footerExtra}
          {onNext ? (
            <Pressable accessibilityRole="button" onPress={onNext} style={styles.next}>
              <Text style={styles.nextText}>{nextLabel}</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

export const pageStyles = StyleSheet.create({
  title: { color: "#f5f4f9", fontSize: 24, fontWeight: "800", marginBottom: 12 },
  paragraph: { color: "#e7e5ef", fontSize: 17, lineHeight: 27, marginBottom: 14 },
  muted: { color: "#aba8b9", fontSize: 14, lineHeight: 20 },
  primaryButton: { minHeight: 48, borderRadius: 12, backgroundColor: "#ddf9a8", alignItems: "center", justifyContent: "center", paddingHorizontal: 16, marginTop: 16 },
  primaryButtonDisabled: { opacity: 0.45 },
  primaryButtonText: { color: "#11140a", fontSize: 16, fontWeight: "800" },
  secondaryButton: { minHeight: 44, borderRadius: 12, borderWidth: 1, borderColor: "#3a3750", alignItems: "center", justifyContent: "center", paddingHorizontal: 16, marginTop: 10 },
  secondaryButtonText: { color: "#c8b5ff", fontSize: 15, fontWeight: "700" },
  errorBox: { marginTop: 14, padding: 12, borderRadius: 12, backgroundColor: "#2b1518", gap: 8 },
  errorText: { color: "#ffb4b4", fontSize: 14, lineHeight: 20 },
});

const styles = StyleSheet.create({
  frame: { backgroundColor: "#000" },
  body: { flex: 1 },
  bodyContent: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 12 },
  chip: { color: "#ddf9a8", fontSize: 12, fontWeight: "800", letterSpacing: 0.6, textTransform: "uppercase", marginBottom: 10 },
  footer: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12, paddingHorizontal: 20, paddingVertical: 10, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: "#2a2838", backgroundColor: "#0b0b10" },
  next: { minHeight: 44, minWidth: 110, borderRadius: 12, backgroundColor: "#2a2238", alignItems: "center", justifyContent: "center", paddingHorizontal: 16, marginLeft: "auto" },
  nextText: { color: "#c8b5ff", fontSize: 15, fontWeight: "700" },
});
