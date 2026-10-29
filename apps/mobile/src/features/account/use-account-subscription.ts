import { useEffect, useRef, useState } from "react";
import * as Sentry from "@sentry/react-native";
import { refreshSubscription } from "../subscription/api/refresh-subscription";
import { initializePurchases, openSubscriptionManagement, restoreAndCheck } from "../subscription/purchases-gateway";

type Status = "loading" | "active" | "inactive" | "unknown";
type Action = "idle" | "refreshing" | "restoring" | "managing";

/** Abonelik rozeti SDK önbelleğinden değil backend'den gelir; hata, ücretsiz plan sayılmaz. */
export function useAccountSubscription(userId: string, isAnonymous: boolean) {
  const [status, setStatus] = useState<Status>("loading");
  const [action, setAction] = useState<Action>("idle");
  const [notice, setNotice] = useState<string | null>(null);
  const locked = useRef(false);
  const generation = useRef(0);

  useEffect(() => {
    const request = ++generation.current;
    locked.current = false;
    setAction("idle");
    setNotice(null);
    setStatus(isAnonymous ? "inactive" : "loading");
    if (!isAnonymous) {
      refreshSubscription().then(({ active }) => {
        if (generation.current === request) setStatus(active ? "active" : "inactive");
      }).catch(() => {
        if (generation.current === request) setStatus("unknown");
      });
    }
    // Hesap değişince veya panel kapanınca eski isteğin sonucu yeni hesaba taşınmaz.
    return () => { generation.current++; };
  }, [userId, isAnonymous]);

  async function run(nextAction: Exclude<Action, "idle">) {
    if (isAnonymous || locked.current) return;
    locked.current = true;
    const request = nextAction === "managing" ? generation.current : ++generation.current;
    setAction(nextAction);
    setNotice(null);
    try {
      if (nextAction === "managing") {
        await openSubscriptionManagement();
      } else {
        if (nextAction === "restoring") {
          if (!(await initializePurchases(userId))) throw new Error("Satın alma bu build'de kullanılamıyor.");
          if (generation.current !== request) return;
          await restoreAndCheck();
          if (generation.current !== request) return;
        }
        const { active } = await refreshSubscription();
        if (generation.current !== request) return;
        setStatus(active ? "active" : "inactive");
        setNotice(active ? "Aboneliğin doğrulandı. Premium erişimin hazır." : "Bu hesap için aktif bir abonelik bulunamadı.");
      }
    } catch (error) {
      Sentry.captureException(error);
      if (generation.current !== request) return;
      if (nextAction !== "managing") setStatus("unknown");
      setNotice(nextAction === "managing"
        ? "Google Play açılamadı. Play Store'daki Abonelikler bölümünden devam edebilirsin."
        : "Abonelik doğrulanamadı. Bağlantını kontrol edip tekrar dene.");
    } finally {
      if (generation.current === request) {
        locked.current = false;
        setAction("idle");
      }
    }
  }

  return { status, action, notice, refresh: () => run("refreshing"), restore: () => run("restoring"), manage: () => run("managing") };
}
