import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * identity/storage.ts ile AYNI desen: genel bir preferences katmanı değil, tek
 * bir gerçek ihtiyaç (explanation dil tercihi). Backend'e hiç taşınmıyor —
 * anonymous user zaten kalıcı bir profil kavramı taşımıyor, MVP'de bu kadarı
 * yeterli (bkz. çalışma sözleşmesi: "MVP'de local AsyncStorage yeterliyse
 * backend preference sistemi kurma").
 */
const EXPLANATION_LANGUAGE_KEY = "linguascroll.explanationLanguage";

export type ExplanationLanguage = "en" | "tr";

const DEFAULT_EXPLANATION_LANGUAGE: ExplanationLanguage = "en";

export async function getStoredExplanationLanguage(): Promise<ExplanationLanguage> {
  const stored = await AsyncStorage.getItem(EXPLANATION_LANGUAGE_KEY);
  return stored === "tr" ? "tr" : DEFAULT_EXPLANATION_LANGUAGE;
}

export async function storeExplanationLanguage(language: ExplanationLanguage): Promise<void> {
  await AsyncStorage.setItem(EXPLANATION_LANGUAGE_KEY, language);
}
