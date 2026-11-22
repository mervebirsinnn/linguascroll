import { fireEvent, render, screen } from "@testing-library/react-native";
import { SignInScreen } from "./SignInScreen";

// Soğuk RN render'ı Windows'ta tam süit altında 5 sn'yi aşabiliyor (AccountScreen.test ile aynı 30 sn sınırı).
// 2026-11-20 — native Apple butonu (expo-apple-authentication) test ortamında render edilemiyor; yerine
// aynı props'ları (onPress, disabled) taşıyan basit bir buton. Test edilen şey SignInScreen'in kablolaması.
jest.mock("./AppleSignInButton", () => {
  const { Pressable, Text } = jest.requireActual<typeof import("react-native")>("react-native");
  return {
    AppleSignInButton: ({ onPress, disabled }: { onPress: () => void; disabled: boolean }) => (
      <Pressable onPress={onPress} disabled={disabled} accessibilityRole="button" accessibilityState={{ disabled }}>
        <Text>Apple ile devam et</Text>
      </Pressable>
    ),
  };
});

it("Apple callback'i yoksa (Android) yalnızca Google butonu gösterilir", async () => {
  const onSignIn = jest.fn();
  await render(<SignInScreen busy={false} notice={null} onSignIn={onSignIn} />);
  expect(screen.queryByText("Apple ile devam et")).toBeNull();
  await fireEvent.press(screen.getByText("Google ile devam et"));
  expect(onSignIn).toHaveBeenCalledTimes(1);
  expect(screen.getByText("Kaldığın yerden devam etmek için hesabınla giriş yap.")).toBeTruthy();
}, 30000);

it("Apple callback'i varsa (iOS) Apple butonu da gösterilir ve kendi callback'ini çağırır", async () => {
  const onSignIn = jest.fn();
  const onAppleSignIn = jest.fn();
  await render(<SignInScreen busy={false} notice={null} onSignIn={onSignIn} onAppleSignIn={onAppleSignIn} />);
  await fireEvent.press(screen.getByText("Apple ile devam et"));
  expect(onAppleSignIn).toHaveBeenCalledTimes(1);
  expect(onSignIn).not.toHaveBeenCalled();
}, 30000);

it("meşgulken iki buton da kapalı (aynı anda iki native giriş sayfası açılmaz)", async () => {
  const onSignIn = jest.fn();
  const onAppleSignIn = jest.fn();
  await render(<SignInScreen busy notice={null} onSignIn={onSignIn} onAppleSignIn={onAppleSignIn} />);
  const buttons = screen.getAllByRole("button");
  expect(buttons).toHaveLength(2);
  for (const button of buttons) {
    await fireEvent.press(button);
  }
  expect(onAppleSignIn).not.toHaveBeenCalled();
  expect(onSignIn).not.toHaveBeenCalled();
}, 30000);
