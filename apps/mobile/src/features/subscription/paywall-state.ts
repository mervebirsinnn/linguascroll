import { pickDefaultPackageId, type PaywallPackage } from "./paywall-model";

export type PaywallAction = "idle" | "purchasing" | "restoring";

export type PaywallState =
  | { status: "loading" }
  | { status: "unavailable"; message: string }
  | { status: "ready"; packages: PaywallPackage[]; selectedId: string; action: PaywallAction; notice: string | null };

export const INITIAL_PAYWALL_STATE: PaywallState = { status: "loading" };

const UNAVAILABLE_MESSAGE = "Abonelik seçenekleri şu an yüklenemedi. Biraz sonra tekrar dene.";

export function applyOfferingsLoaded(packages: PaywallPackage[]): PaywallState {
  const selectedId = pickDefaultPackageId(packages);
  if (selectedId === null) {
    return { status: "unavailable", message: UNAVAILABLE_MESSAGE };
  }
  return { status: "ready", packages, selectedId, action: "idle", notice: null };
}

export function applyOfferingsError(): PaywallState {
  return { status: "unavailable", message: UNAVAILABLE_MESSAGE };
}

export function selectPackage(state: PaywallState, id: string): PaywallState {
  if (state.status !== "ready" || state.action !== "idle" || !state.packages.some((p) => p.id === id)) {
    return state;
  }
  return { ...state, selectedId: id, notice: null };
}

/** Bir satın alma/geri yükleme çalışırken ikincisi başlatılamaz (çift tıklama koruması). */
export function canStartAction(state: PaywallState): boolean {
  return state.status === "ready" && state.action === "idle";
}

export function applyActionStart(state: PaywallState, action: Exclude<PaywallAction, "idle">): PaywallState {
  if (!canStartAction(state) || state.status !== "ready") {
    return state;
  }
  return { ...state, action, notice: null };
}

export function applyActionEnd(state: PaywallState, notice: string | null): PaywallState {
  if (state.status !== "ready") {
    return state;
  }
  return { ...state, action: "idle", notice };
}

export const NOTICE_PURCHASE_FAILED = "Satın alma tamamlanamadı. Tekrar dene.";
export const NOTICE_PURCHASE_PENDING = "Ödemen onay bekliyor. Onaylanınca erişimin otomatik açılır.";
export const NOTICE_NOTHING_TO_RESTORE = "Bu hesapta geri yüklenecek aktif bir abonelik bulunamadı.";
export const NOTICE_RESTORE_FAILED = "Geri yükleme tamamlanamadı. Tekrar dene.";
