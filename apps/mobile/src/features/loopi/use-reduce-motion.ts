import { useEffect, useState } from "react";
import { AccessibilityInfo } from "react-native";

/**
 * 2026-11-17 — sistemin "Hareketi azalt" ayarı. `null` = henüz okunmadı: Loopi bu sürede animasyon BAŞLATMAZ
 * (ayar açık olan kullanıcıya ilk karede hareket göstermemek için), sonuç gelince karar verilir. Ayar uygulama
 * açıkken değişirse abonelikle güncellenir. (Aynı hook ileride QuizFeedItem'a da bağlanabilir; bu işin dışında.)
 */
export function useReduceMotion(): boolean | null {
  const [reduceMotion, setReduceMotion] = useState<boolean | null>(null);
  useEffect(() => {
    let cancelled = false;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((enabled) => {
        if (!cancelled) setReduceMotion(enabled);
      })
      .catch(() => {
        // Okunamazsa güvenli taraf: hareket yok.
        if (!cancelled) setReduceMotion(true);
      });
    const subscription = AccessibilityInfo.addEventListener("reduceMotionChanged", (enabled) => setReduceMotion(enabled));
    return () => {
      cancelled = true;
      subscription.remove();
    };
  }, []);
  return reduceMotion;
}
