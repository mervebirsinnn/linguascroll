import { useState } from "react";
import type { CefrLevel, FeedPreferences, Topic } from "@linguascroll/shared-types";
import { InterestsScreen } from "./InterestsScreen";
import { LevelScreen } from "./LevelScreen";

type OnboardingFlowProps = {
  onComplete: (preferences: FeedPreferences) => void;
  onSkip: () => void;
};

/**
 * Kullanıcı kararı: Welcome ekranı YOK, Level → Interests → Feed (2 adım).
 * Navigation kütüphanesi (react-navigation/expo-router) EKLENMEDİ — repo'da
 * zaten kurulu değil, 2 ekranlık bir akış için App.tsx'in mevcut "duruma göre
 * conditional render" deseni (bkz. identity/onboarding gating) yeterli. Bu
 * component o desenin AYNISI, sadece iki onboarding ekranı arasında.
 */
export function OnboardingFlow({ onComplete, onSkip }: OnboardingFlowProps) {
  const [step, setStep] = useState<"level" | "interests">("level");
  const [level, setLevel] = useState<CefrLevel | null>(null);

  function handleLevelSelect(selectedLevel: CefrLevel): void {
    setLevel(selectedLevel);
    setStep("interests");
  }

  function handleInterestsContinue(topics: Topic[]): void {
    onComplete({ level, topics });
  }

  if (step === "level") {
    return <LevelScreen onSelect={handleLevelSelect} onSkip={onSkip} />;
  }
  return <InterestsScreen onContinue={handleInterestsContinue} onSkip={onSkip} />;
}
