import { useEffect, useRef, useState } from "react";
import * as Sentry from "@sentry/react-native";
import { refreshSubscription } from "./api/refresh-subscription";
import { fetchPaywallPackages, purchasePackageById, restoreAndCheck } from "./purchases-gateway";
import {
  applyActionEnd,
  applyActionStart,
  applyOfferingsError,
  applyOfferingsLoaded,
  applyVerificationFailed,
  applyVerificationStart,
  applyVerificationSucceeded,
  canRetryVerification,
  canStartAction,
  INITIAL_PAYWALL_STATE,
  NOTICE_NOTHING_TO_RESTORE,
  NOTICE_PURCHASE_FAILED,
  NOTICE_PURCHASE_PENDING,
  NOTICE_RESTORE_FAILED,
  selectPackage,
  type PaywallState,
} from "./paywall-state";

type UsePaywallResult = {
  state: PaywallState;
  select: (id: string) => void;
  purchaseSelected: () => void;
  restore: () => void;
  retryVerification: () => void;
};

/**
 * Durum geçişleri paywall-state.ts'teki SAF fonksiyonlarda (use-feed.ts ile aynı desen);
 * bu hook sadece onları SDK adaptörüne ve backend'e bağlıyor.
 *
 * 2026-10-27 — SDK'nın "purchased"/"aktif geri yükleme" sonucu tek başına yetki SAYILMAZ:
 * ardından backend `POST /subscriptions/refresh` ile aboneliği RevenueCat'ten doğrular
 * (önbelleği atlayarak). `onUnlocked` (feed yenileme) SADECE backend `active: true` dediğinde
 * çağrılır; doğrulanamazsa kullanıcıya anlaşılır bir bildirim ve "Tekrar dene" sunulur.
 */
export function usePaywall(userId: string, onUnlocked: () => void): UsePaywallResult {
  const [state, setState] = useState<PaywallState>(INITIAL_PAYWALL_STATE);
  // Aksiyon sırasında en güncel state'i (closure'daki bayat değeri değil) okumak için.
  const stateRef = useRef(state);
  stateRef.current = state;
  const onUnlockedRef = useRef(onUnlocked);
  onUnlockedRef.current = onUnlocked;

  useEffect(() => {
    let cancelled = false;
    fetchPaywallPackages()
      .then((packages) => {
        if (!cancelled) setState(applyOfferingsLoaded(packages));
      })
      .catch((error: unknown) => {
        // Anahtarsız build'lerde (EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY yok) bu beklenen bir durum.
        Sentry.addBreadcrumb({ category: "paywall", message: "offerings yüklenemedi", data: { error: String(error) } });
        if (!cancelled) setState(applyOfferingsError());
      });
    return () => {
      cancelled = true;
    };
  }, []);

  function verifyWithBackend(): void {
    setState(applyVerificationStart);
    refreshSubscription()
      .then(({ active }) => {
        if (active) {
          setState(applyVerificationSucceeded);
          onUnlockedRef.current();
        } else {
          setState(applyVerificationFailed);
        }
      })
      .catch((error: unknown) => {
        Sentry.captureException(error);
        setState(applyVerificationFailed);
      });
  }

  function select(id: string): void {
    setState((current) => selectPackage(current, id));
  }

  function purchaseSelected(): void {
    const current = stateRef.current;
    if (!canStartAction(current) || current.status !== "ready") return;
    setState(applyActionStart(current, "purchasing"));
    purchasePackageById(current.selectedId)
      .then((outcome) => {
        if (outcome === "purchased") {
          verifyWithBackend();
        } else if (outcome === "pending") {
          setState((s) => applyActionEnd(s, NOTICE_PURCHASE_PENDING));
        } else {
          setState((s) => applyActionEnd(s, null));
        }
      })
      .catch((error: unknown) => {
        Sentry.captureException(error);
        setState((s) => applyActionEnd(s, NOTICE_PURCHASE_FAILED));
      });
  }

  function restore(): void {
    const current = stateRef.current;
    if (!canStartAction(current)) return;
    setState(applyActionStart(current, "restoring"));
    restoreAndCheck()
      .then((active) => {
        if (active) {
          verifyWithBackend();
        } else {
          setState((s) => applyActionEnd(s, NOTICE_NOTHING_TO_RESTORE));
        }
      })
      .catch((error: unknown) => {
        Sentry.captureException(error);
        setState((s) => applyActionEnd(s, NOTICE_RESTORE_FAILED));
      });
  }

  function retryVerification(): void {
    if (!canRetryVerification(stateRef.current)) return;
    verifyWithBackend();
  }

  return { state, select, purchaseSelected, restore, retryVerification };
}
