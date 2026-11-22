import * as AppleAuthentication from "expo-apple-authentication";
import { StyleSheet, View } from "react-native";

type AppleSignInButtonProps = { onPress: () => void; disabled: boolean };

/**
 * 2026-11-20 — Sign in with Apple butonu. Apple'ın İnsan Arayüzü Kuralları, kendi çizdiğimiz bir buton yerine
 * sistemin native butonunu (metin/logo Apple tarafından yerelleştirilir) bekliyor; bu yüzden özel Pressable DEĞİL.
 * Native buton `disabled` desteklemiyor: meşgulken dokunuşlar dış View'da kesilir ve buton soluklaşır.
 * Yalnızca `onLinkAppleAccount`/`onAppleSignIn` tanımlıyken (iOS) render edilmeli — Android'de native görünüm yok.
 */
export function AppleSignInButton({ onPress, disabled }: AppleSignInButtonProps) {
  return (
    <View pointerEvents={disabled ? "none" : "auto"} style={[styles.wrap, disabled && styles.disabled]} accessibilityState={{ disabled }}>
      <AppleAuthentication.AppleAuthenticationButton
        buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
        buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.WHITE}
        cornerRadius={14}
        style={styles.button}
        onPress={onPress}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignSelf: "stretch" },
  disabled: { opacity: 0.6 },
  button: { height: 52, width: "100%" },
});
