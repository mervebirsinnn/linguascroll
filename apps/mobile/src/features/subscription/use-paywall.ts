import { useCallback, useEffect, useRef, useState } from "react";
import { AppState } from "react-native";
import * as Sentry from "@sentry/react-native";
import { refreshSubscription } from "./api/refresh-subscription";
import { initializePurchases, fetchPaywallPackages, purchasePackageById, restoreAndCheck, subscribeToPurchaseUpdates } from "./purchases-gateway";
import { applyActionEnd, applyActionStart, applyOfferingsError, applyOfferingsLoaded, applyPaymentPending, applyVerificationFailed, applyVerificationStart, applyVerificationSucceeded, canRetryVerification, canStartAction, INITIAL_PAYWALL_STATE, NOTICE_NOTHING_TO_RESTORE, NOTICE_PURCHASE_FAILED, NOTICE_RESTORE_FAILED, selectPackage, type PaywallState } from "./paywall-state";

/** Çift dokunuş senkron kilitle, eski hesabın geciken yanıtı nesil kontrolüyle engellenir. */
export function usePaywall(userId: string, onUnlocked: () => void, canPurchase = true) {
  const [state, setState] = useState<PaywallState>(INITIAL_PAYWALL_STATE);
  const [reloadKey, setReloadKey] = useState(0);
  const stateRef = useRef(state);
  stateRef.current = state;
  const callback = useRef(onUnlocked);
  callback.current = onUnlocked;
  const allowed = useRef(canPurchase);
  allowed.current = canPurchase;
  const locked = useRef(false);
  const generation = useRef(0);
  const unlocked = useRef(false);

  const update = useCallback((next: PaywallState | ((current: PaywallState) => PaywallState)) => {
    const value = typeof next === "function" ? next(stateRef.current) : next;
    stateRef.current = value;
    setState(value);
  }, []);

  const verify = useCallback(async (request: number, restoring = false) => {
    update(applyVerificationStart);
    try {
      const { active } = await refreshSubscription();
      if (generation.current !== request) return;
      if (active) {
        update(applyVerificationSucceeded);
        if (!unlocked.current) { unlocked.current = true; callback.current(); }
      } else if (restoring) {
        update((s) => applyActionEnd(s, NOTICE_NOTHING_TO_RESTORE));
      } else update(applyVerificationFailed);
    } catch (error) {
      if (generation.current === request) { Sentry.captureException(error); update(applyVerificationFailed); }
    }
  }, [update]);

  useEffect(() => {
    const request = ++generation.current;
    locked.current = false;
    unlocked.current = false;
    update(INITIAL_PAYWALL_STATE);
    let unsubscribe = () => {};
    initializePurchases(userId).then(() => {
      if (generation.current !== request) return null;
      unsubscribe = subscribeToPurchaseUpdates(() => {
        if (!allowed.current || locked.current || generation.current !== request || !canRetryVerification(stateRef.current)) return;
        locked.current = true;
        void verify(request).finally(() => { if (generation.current === request) locked.current = false; });
      });
      return fetchPaywallPackages(userId);
    }).then((packages) => {
      if (packages && generation.current === request) update(applyOfferingsLoaded(packages));
    }).catch((error: unknown) => {
      Sentry.captureException(error);
      if (generation.current === request) update(applyOfferingsError());
    });
    return () => { generation.current++; unsubscribe(); };
  }, [userId, reloadKey, update, verify]);

  const retryVerification = useCallback(() => {
    if (!allowed.current || locked.current || !canRetryVerification(stateRef.current)) return;
    const request = generation.current;
    locked.current = true;
    void verify(request).finally(() => { if (generation.current === request) locked.current = false; });
  }, [verify]);

  useEffect(() => {
    const listener = AppState.addEventListener("change", (next) => { if (next === "active") retryVerification(); });
    // Ödeme mağazada bekleyip sonradan onaylanabilir. Sonsuz polling yerine SDK + önplan + manuel kontrol.
    return () => listener.remove();
  }, [retryVerification]);

  async function perform(action: "purchasing" | "restoring") {
    if (!allowed.current || locked.current || !canStartAction(stateRef.current) || stateRef.current.status !== "ready") return;
    const selectedId = stateRef.current.selectedId;
    const request = generation.current;
    locked.current = true;
    update((s) => applyActionStart(s, action));
    try {
      if (action === "restoring") {
        await restoreAndCheck(userId);
        if (generation.current === request) await verify(request, true);
      } else {
        const outcome = await purchasePackageById(selectedId, userId);
        if (generation.current !== request) return;
        if (outcome === "purchased") await verify(request);
        else if (outcome === "pending") update(applyPaymentPending);
        else update((s) => applyActionEnd(s, null));
      }
    } catch (error) {
      Sentry.captureException(error);
      if (generation.current === request) update((s) => applyActionEnd(s, action === "purchasing" ? NOTICE_PURCHASE_FAILED : NOTICE_RESTORE_FAILED));
    } finally {
      if (generation.current === request) locked.current = false;
    }
  }

  return { state, select: (id: string) => update((s) => selectPackage(s, id)), purchaseSelected: () => { void perform("purchasing"); }, restore: () => { void perform("restoring"); }, retryVerification, reloadOfferings: () => setReloadKey((n) => n + 1) };
}
