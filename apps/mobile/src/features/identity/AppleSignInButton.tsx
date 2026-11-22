import * as AppleAuthentication from "expo-apple-authentication";
import { ActivityIndicator, StyleSheet, View } from "react-native";

type AppleSignInButtonProps = { onPress: () => void; disabled: boolean; busy?: boolean };

/**
 * 2026-11-20 — Sign in with Apple butonu. Apple'ın İnsan Arayüzü Kuralları, kendi çizdiğimiz bir buton yerine
 * sistemin native butonunu (metin/logo Apple tarafından yerelleştirilir) bekliyor; bu yüzden özel Pressable DEĞİL.
 * Native buton `disabled` desteklemiyor: meşgulken dokunuşlar dış View'da kesilir ve buton soluklaşır.
 * Yalnızca `onLinkAppleAccount`/`onAppleSignIn` tanımlıyken (iOS) render edilmeli — Android'de native görünüm yok.
 */
/*
 * 2026-11-22 — `busy`: Apple akışı sürüyor. Native butonun içeriği (logo + metin) değiştirilemez; Apple'ın görünüm
 * kuralını bozmamak için metnin üstüne değil, butonun sağ kenarına küçük bir gösterge bindirilir.
 */
export function AppleSignInButton({ onPress, disabled, busy = false }: AppleSignInButtonProps) {
  return (
    <View pointerEvents={disabled ? "none" : "auto"} style={[styles.wrap, disabled && styles.disabled]} accessibilityState={{ disabled }}>
      <AppleAuthentication.AppleAuthenticationButton
        buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
        buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.WHITE}
        cornerRadius={14}
        style={styles.button}
        onPress={onPress}
      />
      {busy && <ActivityIndicator testID="apple-sign-in-busy" color="#14111d" style={styles.busy} />}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignSelf: "stretch" },
  disabled: { opacity: 0.6 },
  button: { height: 52, width: "100%" },
  busy: { position: "absolute", right: 16, top: 0, bottom: 0 },
});
