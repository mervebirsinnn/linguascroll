import { Alert, Linking } from "react-native";
function webUrl(value: string | undefined): string | null {
  if (!value) return null;
  try { const url = new URL(value); return url.protocol === "https:" ? url.toString() : null; } catch { return null; }
}
export const APP_LINKS = {
  privacy: webUrl(process.env.EXPO_PUBLIC_PRIVACY_URL),
  terms: webUrl(process.env.EXPO_PUBLIC_TERMS_URL),
  support: process.env.EXPO_PUBLIC_SUPPORT_EMAIL && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(process.env.EXPO_PUBLIC_SUPPORT_EMAIL) ? `mailto:${process.env.EXPO_PUBLIC_SUPPORT_EMAIL}` : null,
};
export async function openAppLink(url: string): Promise<void> {
  try { await Linking.openURL(url); }
  catch { Alert.alert("Bağlantı açılamadı", "İnternet bağlantını ve bu bağlantıyı açabilecek bir uygulama olduğunu kontrol et."); }
}
