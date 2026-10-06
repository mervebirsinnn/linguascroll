import type { PaywallPackage } from "./paywall-model";
import {
  applyActionEnd,
  applyActionStart,
  applyOfferingsError,
  applyOfferingsLoaded,
  canStartAction,
  INITIAL_PAYWALL_STATE,
  selectPackage,
  type PaywallState,
} from "./paywall-state";

const annual: PaywallPackage = { id: "annual", kind: "annual", title: "Yıllık", priceString: "₺600", periodLabel: "yıl", trialLabel: "7 gün ücretsiz", savingsPercent: 50 };
const monthly: PaywallPackage = { id: "monthly", kind: "monthly", title: "Aylık", priceString: "₺100", periodLabel: "ay", trialLabel: null, savingsPercent: null };

function ready(overrides: Partial<Extract<PaywallState, { status: "ready" }>> = {}): PaywallState {
  return { status: "ready", packages: [annual, monthly], selectedId: "annual", action: "idle", notice: null, ...overrides };
}

describe("paywall state geçişleri", () => {
  it("başlangıç durumu loading", () => {
    expect(INITIAL_PAYWALL_STATE).toEqual({ status: "loading" });
  });

  it("paketler gelince ready olur ve yıllık varsayılan seçilir", () => {
    expect(applyOfferingsLoaded([monthly, annual])).toMatchObject({ status: "ready", selectedId: "annual", action: "idle", notice: null });
  });

  it("paket listesi boşsa ya da yükleme hatasında unavailable olur", () => {
    expect(applyOfferingsLoaded([]).status).toBe("unavailable");
    expect(applyOfferingsError().status).toBe("unavailable");
  });

  it("paket seçimi çalışır; bilinmeyen id'yi ve aksiyon sürerken seçimi yok sayar", () => {
    expect(selectPackage(ready(), "monthly")).toMatchObject({ selectedId: "monthly" });
    expect(selectPackage(ready(), "yok")).toEqual(ready());
    expect(selectPackage(ready({ action: "purchasing" }), "monthly")).toEqual(ready({ action: "purchasing" }));
  });

  it("aksiyon başlatma: sadece ready+idle iken izinli, çift tıklama (ikinci başlatma) reddedilir", () => {
    expect(canStartAction(ready())).toBe(true);
    expect(canStartAction(ready({ action: "purchasing" }))).toBe(false);
    expect(canStartAction({ status: "loading" })).toBe(false);

    const purchasing = applyActionStart(ready({ notice: "eski" }), "purchasing");
    expect(purchasing).toMatchObject({ action: "purchasing", notice: null });
    expect(applyActionStart(purchasing, "restoring")).toEqual(purchasing);
  });

  it("aksiyon bitince idle'a döner ve bildirimi yazar", () => {
    const done = applyActionEnd(ready({ action: "purchasing" }), "Satın alma tamamlanamadı. Tekrar dene.");
    expect(done).toMatchObject({ action: "idle", notice: "Satın alma tamamlanamadı. Tekrar dene." });
  });

  it("ready dışındaki durumlarda aksiyon geçişleri durumu değiştirmez", () => {
    expect(applyActionStart({ status: "loading" }, "purchasing")).toEqual({ status: "loading" });
    expect(applyActionEnd({ status: "loading" }, "x")).toEqual({ status: "loading" });
  });
});
