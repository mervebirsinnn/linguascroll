import AsyncStorage from "@react-native-async-storage/async-storage";
import { resolveOnboardingState, type OnboardingState } from "./onboarding-state";

/**
 * `identity/storage.ts`/`preferences/storage.ts` ile AYNI desen: tek bir
 * gerçek ihtiyaç, genel bir storage katmanı DEĞİL. Gerçek çözümleme mantığı
 * (`resolveOnboardingState`) `onboarding-state.ts`'te, AsyncStorage'dan
 * BAĞIMSIZ — bu dosya sadece ham string'i oradan/oraya taşıyan ince bir katman.
 */
const ONBOARDING_STATE_KEY = "linguascroll.onboardingState";

export async function getStoredOnboardingState(): Promise<OnboardingState> {
  const raw = await AsyncStorage.getItem(ONBOARDING_STATE_KEY);
  return resolveOnboardingState(raw);
}

export async function storeOnboardingState(state: OnboardingState): Promise<void> {
  await AsyncStorage.setItem(ONBOARDING_STATE_KEY, JSON.stringify(state));
}
