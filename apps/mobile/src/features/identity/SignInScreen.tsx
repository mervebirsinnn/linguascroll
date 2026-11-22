import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View } from "react-native";
import { AppleSignInButton } from "./AppleSignInButton";

const brandMarkImage = require("../../../assets/brand-mark.png") as number;

type SignInScreenProps = {
  busy: boolean;
  /** Hangi sağlayıcıyla giriş sürüyor. Verilmezse (eski çağıranlar) busy = Google gibi davranır. */
  busyProvider?: "google" | "apple";
  notice: string | null;
  onSignIn: () => void;
  /** 2026-11-20 — yalnızca Apple girişi kullanılabilirken (iOS) verilir; yoksa Apple butonu hiç render edilmez. */
  onAppleSignIn?: () => void;
};

/**
 * 2026-10-28 — artık ilk açılış ekranı DEĞİL (ilk 10 video girişsiz, misafir oturumla; bkz.
 * auth-state.ts). Yalnızca bu cihazda daha önce Google hesabı bağlanmış ve çıkış yapılmışsa
 * gösterilir — çıkış, yeni bir misafir hesabı (yeni 10 ücretsiz video) açmamalı.
 *
 * 2026-11-20 — iOS yayını: Apple Kuralı 4.8 gereği Apple butonu Google'ın ÜSTÜNDE ve aynı genişlikte (Apple,
 * kendi seçeneğinin diğer sağlayıcılardan daha az belirgin olmamasını bekliyor). Meşgulken ikisi birden kapalı:
 * tek "signingIn" durumu var, aynı anda iki native giriş sayfası açılmamalı. Alt başlık sağlayıcıdan bağımsız.
 */
export function SignInScreen({ busy, busyProvider, notice, onSignIn, onAppleSignIn }: SignInScreenProps) {
  return (
    <View style={styles.root}>
      <Image source={brandMarkImage} style={styles.brand} accessibilityLabel="Looplish" />
      <Text style={styles.title}>Tekrar hoş geldin</Text>
      <Text style={styles.subtitle}>Kaldığın yerden devam etmek için hesabınla giriş yap.</Text>

      {onAppleSignIn !== undefined && (
        <View style={styles.appleWrap}>
          <AppleSignInButton onPress={onAppleSignIn} disabled={busy} />
        </View>
      )}
      <Pressable
        onPress={onSignIn}
        disabled={busy}
        accessibilityRole="button"
        style={[styles.cta, onAppleSignIn !== undefined && styles.ctaBelowApple, busy && styles.ctaDisabled]}
      >
        {/* Spinner yalnızca Google ile giriş sürerken: Apple seçildiyse Google butonu sadece pasif kalır (yanlış sağlayıcıda yükleniyor görünmesin). */}
        {busy && busyProvider !== "apple" ? <ActivityIndicator color="#14111d" /> : <Text style={styles.ctaText}>Google ile devam et</Text>}
      </Pressable>

      {notice !== null && <Text style={styles.notice}>{notice}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#14111d", alignItems: "center", justifyContent: "center", paddingHorizontal: 24, gap: 16 },
  brand: { width: 64, height: 64 },
  title: { color: "#f5f4f9", fontSize: 24, fontWeight: "800", textAlign: "center" },
  subtitle: { color: "#a79fbd", fontSize: 15, textAlign: "center" },
  cta: { alignSelf: "stretch", backgroundColor: "#bca7ff", borderRadius: 14, paddingVertical: 16, alignItems: "center", marginTop: 8 },
  // Apple butonu varken üst boşluk onda; Google butonu kök gap'iyle (16) hemen altına gelir.
  appleWrap: { alignSelf: "stretch", marginTop: 8 },
  ctaBelowApple: { marginTop: 0 },
  ctaDisabled: { opacity: 0.6 },
  ctaText: { color: "#14111d", fontSize: 17, fontWeight: "800" },
  notice: { color: "#ffb3b3", fontSize: 13, textAlign: "center" },
});
