import { pickDefaultPackageId, type PaywallPackage } from "./paywall-model";

/**
 * 2026-10-27 — "verifying": satın alma/geri yükleme SDK'da başarılı bitti, backend aboneliği
 * RevenueCat'ten doğruluyor (POST /subscriptions/refresh). Mobildeki başarı tek başına yetki
 * sayılmaz; erişim yalnızca backend `active: true` dediğinde açılır.
 */
export type PaywallAction = "idle" | "purchasing" | "restoring" | "verifying";

export type PaywallState =
  | { status: "loading" }
  | { status: "unavailable"; message: string }
  | {
      status: "ready";
      packages: PaywallPackage[];
      selectedId: string;
      action: PaywallAction;
      notice: string | null;
      /** Satın alma alındı ama backend henüz doğrulayamadı — "Tekrar dene" gösterilir. */
      verificationPending: boolean;
    };

export const INITIAL_PAYWALL_STATE: PaywallState = { status: "loading" };

const UNAVAILABLE_MESSAGE = "Abonelik seçenekleri şu an yüklenemedi. Biraz sonra tekrar dene.";

export function applyOfferingsLoaded(packages: PaywallPackage[]): PaywallState {
  const selectedId = pickDefaultPackageId(packages);
  if (selectedId === null) {
    return { status: "unavailable", message: UNAVAILABLE_MESSAGE };
  }
  return { status: "ready", packages, selectedId, action: "idle", notice: null, verificationPending: false };
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

/** Satın alma/geri yükleme ya da "Tekrar dene" sonrası (aksiyon sürerken de) doğrulamaya geçilir. */
export function applyVerificationStart(state: PaywallState): PaywallState {
  if (state.status !== "ready") {
    return state;
  }
  return { ...state, action: "verifying", notice: null };
}

export function applyVerificationSucceeded(state: PaywallState): PaywallState {
  if (state.status !== "ready") {
    return state;
  }
  return { ...state, action: "idle", notice: null, verificationPending: false };
}

/** Backend aktif abonelik görmedi ya da istek başarısız oldu: erişim AÇILMAZ, yeniden deneme sunulur. */
export function applyVerificationFailed(state: PaywallState): PaywallState {
  if (state.status !== "ready") {
    return state;
  }
  return { ...state, action: "idle", notice: NOTICE_VERIFICATION_PENDING, verificationPending: true };
}

export function canRetryVerification(state: PaywallState): boolean {
  return state.status === "ready" && state.action === "idle" && state.verificationPending;
}

export const NOTICE_VERIFICATION_PENDING = "Satın alman alındı ama aboneliğin henüz doğrulanamadı. Birkaç saniye sonra tekrar dene.";
export const NOTICE_PURCHASE_FAILED = "Satın alma tamamlanamadı. Tekrar dene.";
export const NOTICE_PURCHASE_PENDING = "Ödemen onay bekliyor. Onaylanınca erişimin otomatik açılır.";
export const NOTICE_NOTHING_TO_RESTORE = "Bu hesapta geri yüklenecek aktif bir abonelik bulunamadı.";
export const NOTICE_RESTORE_FAILED = "Geri yükleme tamamlanamadı. Tekrar dene.";
