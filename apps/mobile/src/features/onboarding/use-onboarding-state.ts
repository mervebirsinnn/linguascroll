import { useEffect, useState } from "react";
import type { FeedPreferences } from "@linguascroll/shared-types";
import { buildCompletedState, type OnboardingState } from "./onboarding-state";
import { getStoredOnboardingState, storeOnboardingState } from "./storage";

/**
 * `identity/use-anonymous-user-id.ts` ile AYNI "storage → state" bootstrap
 * deseni — loading/success iki durumlu union (hata durumu YOK: storage okuma
 * zaten asla throw etmiyor, bkz. `resolveOnboardingState`).
 */
export type OnboardingHookState =
  | { status: "loading" }
  | {
      status: "success";
      state: OnboardingState;
      completeOnboarding: (preferences: FeedPreferences) => void;
      skipOnboarding: () => void;
    };

export function useOnboardingState(): OnboardingHookState {
  const [state, setState] = useState<OnboardingState | null>(null);

  useEffect(() => {
    let isCancelled = false;
    getStoredOnboardingState().then((stored) => {
      if (!isCancelled) {
        setState(stored);
      }
    });
    return () => {
      isCancelled = true;
    };
  }, []);

  function persist(next: OnboardingState): void {
    setState(next);
    storeOnboardingState(next).catch(() => {
      // Chunk 5/preferences'taki aynı minimalist tutum: local state zaten
      // güncellendi (kullanıcı Feed'e geçti), persist başarısız olsa bile
      // UI akışı bozulmaz — bir sonraki app açılışında onboarding tekrar
      // sorulabilir, bu App Store MVP için kabul edilebilir bir risk.
      });
  }

  function completeOnboarding(preferences: FeedPreferences): void {
    persist(buildCompletedState(preferences));
  }

  function skipOnboarding(): void {
    persist(buildCompletedState({ level: null, topics: [] }));
  }

  if (state === null) {
    return { status: "loading" };
  }
  return { status: "success", state, completeOnboarding, skipOnboarding };
}
