import { useCallback, useEffect, useRef, useState } from "react";
import { AppState } from "react-native";
import * as Sentry from "@sentry/react-native";
import type { SubscriptionOverview } from "@linguascroll/shared-types";
import { fetchSubscriptionOverview } from "../subscription/api/fetch-subscription-overview";
import { initializePurchases, openSubscriptionManagement, restoreAndCheck } from "../subscription/purchases-gateway";

type Status = "loading" | "active" | "inactive" | "unknown";
type Action = "idle" | "refreshing" | "restoring" | "managing";

/** Hata/iptal/ücretsiz haklar ayrı tutulur; mağazadan dönüşte durum tekrar doğrulanır. */
export function useAccountSubscription(userId: string, isAnonymous: boolean) {
  const [overview, setOverview] = useState<SubscriptionOverview | null>(null);
  const [status, setStatus] = useState<Status>("loading");
  const [action, setAction] = useState<Action>("idle");
  const [notice, setNotice] = useState<string | null>(null);
  const locked = useRef(false);
  const generation = useRef(0);
  const returnedFromStore = useRef(false);
  const pendingStoreRefresh = useRef(false);
  const refreshAfterStore = useRef<() => void>(() => {});

  const accept = useCallback((result: SubscriptionOverview) => {
    setOverview(result);
    setStatus(result.verification !== "verified" ? "unknown" : result.subscription?.active ? "active" : "inactive");
  }, []);

  useEffect(() => {
    const request = ++generation.current;
    locked.current = false;
    returnedFromStore.current = false; pendingStoreRefresh.current = false;
    setAction("idle"); setNotice(null); setOverview(null); setStatus("loading");
    fetchSubscriptionOverview().then((result) => {
      if (generation.current === request) accept(result);
    }).catch(() => { if (generation.current === request) setStatus("unknown"); });
    return () => { generation.current++; };
  }, [userId, isAnonymous, accept]);

  const run = useCallback(async (nextAction: Exclude<Action, "idle">) => {
    if (locked.current || (isAnonymous && nextAction !== "refreshing")) return;
    locked.current = true;
    const request = nextAction === "managing" ? generation.current : ++generation.current;
    setAction(nextAction); setNotice(null);
    try {
      if (nextAction === "managing") {
        returnedFromStore.current = true;
        await initializePurchases(userId);
        if (generation.current !== request) return;
        await openSubscriptionManagement();
      } else {
        if (nextAction === "restoring") {
          if (!(await initializePurchases(userId))) throw new Error("Satın alma bu build'de kullanılamıyor.");
          if (generation.current !== request) return;
          await restoreAndCheck(userId);
          if (generation.current !== request) return;
        }
        const result = await fetchSubscriptionOverview();
        if (generation.current !== request) return;
        accept(result);
        if (nextAction === "restoring") setNotice(result.verification !== "verified" ? "Satın alımların kontrol edildi; aboneliğin henüz doğrulanamadı. Tekrar dene." : result.subscription?.active ? "Aboneliğin doğrulandı. Premium erişimin hazır." : "Bu hesap için aktif bir abonelik bulunamadı.");
      }
    } catch (error) {
      Sentry.captureException(error);
      if (generation.current !== request) return;
      if (nextAction !== "managing") setStatus("unknown");
      setNotice(nextAction === "managing" ? "Google Play açılamadı. Play Store'daki Abonelikler bölümünden devam edebilirsin." : "Abonelik doğrulanamadı. Bağlantını kontrol edip tekrar dene.");
    } finally {
      if (generation.current === request) {
        locked.current = false; setAction("idle");
        if (pendingStoreRefresh.current) { pendingStoreRefresh.current = false; refreshAfterStore.current(); }
      }
    }
  }, [userId, isAnonymous, accept]);

  refreshAfterStore.current = () => { void run("refreshing"); };

  useEffect(() => {
    const listener = AppState.addEventListener("change", (next) => {
      if (next === "active" && returnedFromStore.current) {
        returnedFromStore.current = false;
        if (locked.current) pendingStoreRefresh.current = true;
        else void run("refreshing");
      }
    });
    return () => listener.remove();
  }, [run]);

  return { status, action, notice, overview, refresh: () => run("refreshing"), restore: () => run("restoring"), manage: () => run("managing") };
}
