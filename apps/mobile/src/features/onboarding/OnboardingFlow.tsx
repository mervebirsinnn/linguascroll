import { useState } from "react";
import type { CefrLevel, FeedPreferences, Topic } from "@linguascroll/shared-types";
import { canContinueInterests } from "./onboarding-state";
import { InterestsScreen } from "./InterestsScreen";
import { LevelScreen } from "./LevelScreen";

type OnboardingFlowProps = {
  onComplete: (preferences: FeedPreferences) => void;
  initialPreferences?: FeedPreferences;
};

/**
 * Kullanıcı kararı: Welcome ekranı YOK, Level → Interests → Feed (2 adım).
 * Navigation kütüphanesi (react-navigation/expo-router) EKLENMEDİ — repo'da
 * zaten kurulu değil, 2 ekranlık bir akış için App.tsx'in mevcut "duruma göre
 * conditional render" deseni (bkz. identity/onboarding gating) yeterli. Bu
 * component o desenin AYNISI, sadece iki onboarding ekranı arasında.
 */
export function OnboardingFlow({ onComplete, initialPreferences }: OnboardingFlowProps) {
  const [step, setStep] = useState<"level" | "interests">((initialPreferences?.level || initialPreferences?.topics.length) ? "interests" : "level");
  const [level, setLevel] = useState<CefrLevel | null>(initialPreferences?.level ?? null);

  function handleLevelSelect(selectedLevel: CefrLevel): void {
    setLevel(selectedLevel);
    setStep("interests");
  }

  function handleInterestsContinue(topics: Topic[]): void {
    if (canContinueInterests(topics)) onComplete({ level, topics });
  }

  if (step === "level") {
    return <LevelScreen onSelect={handleLevelSelect} onSkip={() => setStep("interests")} />;
  }
  return <InterestsScreen onContinue={handleInterestsContinue} initialTopics={initialPreferences?.topics} />;
}
