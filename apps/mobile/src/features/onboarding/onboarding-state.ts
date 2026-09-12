import { feedPreferencesSchema, type FeedPreferences } from "@linguascroll/shared-types";
import { z } from "zod";

/**
 * Chunk 15 — `find-active-segment.ts`/`find-vocabulary-matches.ts`'in AYNI
 * gerekçesiyle kendi dosyasında: AsyncStorage import'u YOK, bu yüzden bu
 * dosya mobile'ın sade ts-jest kurulumuyla (bkz. jest.config.js — RN/Expo
 * preset'i yok) sorunsuz test edilebiliyor. `storage.ts` (AsyncStorage'a
 * dokunan ince katman) bu dosyanın saf `resolveOnboardingState`'ini BİREBİR
 * kullanıyor — paralel bir yeniden-implementasyon DEĞİL.
 */

export const onboardingStateSchema = z.object({
  completed: z.boolean(),
  preferences: feedPreferencesSchema,
});
export type OnboardingState = z.infer<typeof onboardingStateSchema>;

export const DEFAULT_ONBOARDING_STATE: OnboardingState = {
  completed: false,
  preferences: { level: null, topics: [] },
};

/**
 * Ham storage değerini (null/boş/JSON-olmayan/şekli geçersiz) güvenli bir
 * `OnboardingState`'e çevirir — KULLANICI KARARI: "tek atomic AsyncStorage
 * modeli", bu yüzden kısmi bir kurtarma YOK — herhangi bir aşamada
 * (JSON.parse VEYA Zod) başarısızlık TÜM state'i `DEFAULT_ONBOARDING_STATE`'e
 * düşürür. Asla throw etmez.
 */
export function resolveOnboardingState(raw: string | null): OnboardingState {
  if (!raw) {
    return DEFAULT_ONBOARDING_STATE;
  }
  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(raw);
  } catch {
    return DEFAULT_ONBOARDING_STATE;
  }
  const result = onboardingStateSchema.safeParse(parsedJson);
  return result.success ? result.data : DEFAULT_ONBOARDING_STATE;
}

/** `completed:true` + verilen tercih — hem "tamamladı" HEM "atladı" (preferences boş) akışının TEK ortak yazma noktası. */
export function buildCompletedState(preferences: FeedPreferences): OnboardingState {
  return { completed: true, preferences };
}
