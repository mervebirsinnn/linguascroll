import { useEffect, useState } from "react";
import { getStoredExplanationLanguage, storeExplanationLanguage, type ExplanationLanguage } from "./storage";

/**
 * Tek gerçek tüketici: ExplanationSheet'in EN/TR toggle'ı. Mount'ta AsyncStorage'dan
 * okunur (identity/use-anonymous-user-id.ts ile aynı "storage → state" deseni),
 * her değişiklik hem state'e hem storage'a yazılır — ayrı bir sync/reconciliation
 * mantığı yok, tek yönlü ve basit.
 */
export function useExplanationLanguage(): [ExplanationLanguage, (language: ExplanationLanguage) => void] {
  const [language, setLanguageState] = useState<ExplanationLanguage>("en");

  useEffect(() => {
    let isCancelled = false;
    getStoredExplanationLanguage().then((stored) => {
      if (!isCancelled) {
        setLanguageState(stored);
      }
    });
    return () => {
      isCancelled = true;
    };
  }, []);

  function setLanguage(next: ExplanationLanguage): void {
    setLanguageState(next);
    storeExplanationLanguage(next).catch(() => {
      // Chunk 5'teki quiz-answer hata davranışıyla aynı minimalist tutum: local
      // state zaten güncellendi, persist başarısız olsa bile UI akışı bozulmaz.
    });
  }

  return [language, setLanguage];
}
