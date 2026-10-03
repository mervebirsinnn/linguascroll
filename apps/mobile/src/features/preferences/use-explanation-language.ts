import { useEffect, useRef, useState } from "react";
import { getStoredExplanationLanguage, storeExplanationLanguage, type ExplanationLanguage } from "./storage";

/**
 * Tek gerçek tüketici: ExplanationSheet'in EN/TR toggle'ı. Mount'ta AsyncStorage'dan
 * okunur (identity/use-anonymous-user-id.ts ile aynı "storage → state" deseni),
 * her değişiklik hem state'e hem storage'a yazılır — ayrı bir sync/reconciliation
 * mantığı yok, tek yönlü ve basit.
 *
 * Root cause fix — `hasUserOverriddenRef`: `ExplanationSheet` (dolayısıyla bu
 * hook) VideoFeedItem'da HER ZAMAN mount'lu kalıyor, sadece Modal'ın
 * görünürlüğü açılıp kapanıyor — yani mount-time AsyncStorage okuması, o video
 * item'ının TÜM ömrü boyunca sadece BİR KEZ olur. Kullanıcı bu okuma henüz
 * resolve OLMADAN (örn. video'ya yeni gelip hemen dil seçerse) `setLanguage`
 * çağırırsa, okuma daha SONRA resolve olduğunda eski/varsayılan `stored`
 * değeriyle bu seçimi SESSİZCE eziyordu (klasik "mount-time async read son
 * kullanıcı eylemini ezer" race'i). Guard: kullanıcı EN AZ BİR KEZ manuel
 * seçim yaptıysa, bekleyen hydration sonucu artık state'e hiç yazılmıyor —
 * yeni bir state-management abstraction/dependency YOK, düz bir ref.
 *
 * Diğer mobile hook'larla (bkz. use-feed.ts, use-saved-word-ids.ts) AYNI
 * desen: asıl karar saf, React'ten bağımsız bir fonksiyonda
 * (`shouldApplyHydratedLanguage`) — hook onu BİREBİR kullanıyor, bu sayede
 * race-guard mantığı RN render etmeden test edilebiliyor.
 */
export function shouldApplyHydratedLanguage(isCancelled: boolean, hasUserOverridden: boolean): boolean {
  return !isCancelled && !hasUserOverridden;
}

export function useExplanationLanguage(): [ExplanationLanguage, (language: ExplanationLanguage) => void] {
  const [language, setLanguageState] = useState<ExplanationLanguage>("en");
  const hasUserOverriddenRef = useRef(false);

  useEffect(() => {
    let isCancelled = false;
    getStoredExplanationLanguage().then((stored) => {
      if (shouldApplyHydratedLanguage(isCancelled, hasUserOverriddenRef.current)) {
        setLanguageState(stored);
      }
    });
    return () => {
      isCancelled = true;
    };
  }, []);

  function setLanguage(next: ExplanationLanguage): void {
    hasUserOverriddenRef.current = true;
    setLanguageState(next);
    storeExplanationLanguage(next).catch(() => {
      // Chunk 5'teki quiz-answer hata davranışıyla aynı minimalist tutum: local
      // state zaten güncellendi, persist başarısız olsa bile UI akışı bozulmaz.
    });
  }

  return [language, setLanguage];
}
