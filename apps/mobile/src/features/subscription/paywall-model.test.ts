import {
  buildPaywallPackages,
  computeAnnualSavingsPercent,
  ctaLabel,
  finePrint,
  pickDefaultPackageId,
  toTrialLabel,
  type RawPackage,
} from "./paywall-model";

function raw(identifier: string, packageType: string, price: number, intro: RawPackage["product"]["introPrice"] = null): RawPackage {
  return { identifier, packageType, product: { price, priceString: `₺${price}`, introPrice: intro } };
}

const FREE_7_DAYS = { price: 0, periodUnit: "DAY", periodNumberOfUnits: 7 };

describe("toTrialLabel", () => {
  it("fiyatı 0 olan 7 günlük tanıtım teklifi '7 gün ücretsiz' olur", () => {
    expect(toTrialLabel(FREE_7_DAYS)).toBe("7 gün ücretsiz");
  });

  it("1 haftalık ücretsiz deneme gün olarak gösterilir", () => {
    expect(toTrialLabel({ price: 0, periodUnit: "WEEK", periodNumberOfUnits: 1 })).toBe("7 gün ücretsiz");
  });

  it("ay ve yıl birimlerini destekler", () => {
    expect(toTrialLabel({ price: 0, periodUnit: "MONTH", periodNumberOfUnits: 1 })).toBe("1 ay ücretsiz");
    expect(toTrialLabel({ price: 0, periodUnit: "YEAR", periodNumberOfUnits: 1 })).toBe("1 yıl ücretsiz");
  });

  it("ücretli (indirimli) bir tanıtım teklifi ücretsiz deneme DEĞİLDİR", () => {
    expect(toTrialLabel({ price: 9.99, periodUnit: "MONTH", periodNumberOfUnits: 1 })).toBeNull();
  });

  it("teklif yoksa, bilinmeyen birimse ya da 0 birimse null döner", () => {
    expect(toTrialLabel(null)).toBeNull();
    expect(toTrialLabel({ price: 0, periodUnit: "UNKNOWN", periodNumberOfUnits: 7 })).toBeNull();
    expect(toTrialLabel({ price: 0, periodUnit: "DAY", periodNumberOfUnits: 0 })).toBeNull();
  });
});

describe("computeAnnualSavingsPercent", () => {
  it("12 aylık ödemeye göre GERÇEK yüzdeyi hesaplar (aylık 100, yıllık 600 → %50)", () => {
    expect(computeAnnualSavingsPercent(100, 600)).toBe(50);
  });

  it("yıllık daha ucuz değilse null döner — uydurma tasarruf etiketi gösterilmez", () => {
    expect(computeAnnualSavingsPercent(100, 1200)).toBeNull();
    expect(computeAnnualSavingsPercent(100, 1500)).toBeNull();
  });

  it("geçersiz (<=0) fiyatlarda null döner", () => {
    expect(computeAnnualSavingsPercent(0, 600)).toBeNull();
    expect(computeAnnualSavingsPercent(100, 0)).toBeNull();
  });
});

describe("buildPaywallPackages", () => {
  const packages = [raw("$rc_weekly", "WEEKLY", 40), raw("$rc_monthly", "MONTHLY", 100), raw("$rc_annual", "ANNUAL", 600, FREE_7_DAYS)];

  it("yıllık, aylık, haftalık sırasına dizer", () => {
    expect(buildPaywallPackages(packages).map((p) => p.kind)).toEqual(["annual", "monthly", "weekly"]);
  });

  it("yıllık pakete aylığa göre gerçek tasarruf yüzdesini ve deneme etiketini ekler; diğerlerine eklemez", () => {
    const [annual, monthly] = buildPaywallPackages(packages);
    expect(annual?.savingsPercent).toBe(50);
    expect(annual?.trialLabel).toBe("7 gün ücretsiz");
    expect(monthly?.savingsPercent).toBeNull();
    expect(monthly?.trialLabel).toBeNull();
  });

  it("aylık paket yoksa yıllık için tasarruf hesaplanmaz", () => {
    expect(buildPaywallPackages([raw("$rc_annual", "ANNUAL", 600)])[0]?.savingsPercent).toBeNull();
  });

  it("v1 kapsamı dışı paket tiplerini (LIFETIME/CUSTOM) atar", () => {
    expect(buildPaywallPackages([raw("x", "LIFETIME", 1000), raw("y", "CUSTOM", 5)])).toEqual([]);
  });
});

describe("varsayılan paket, CTA ve yasal metin", () => {
  const [annual, monthly] = buildPaywallPackages([raw("$rc_monthly", "MONTHLY", 100), raw("$rc_annual", "ANNUAL", 600, FREE_7_DAYS)]);

  it("yıllık varsa varsayılan o, yoksa ilk paket", () => {
    expect(pickDefaultPackageId([monthly!, annual!])).toBe("$rc_annual");
    expect(pickDefaultPackageId([monthly!])).toBe("$rc_monthly");
    expect(pickDefaultPackageId([])).toBeNull();
  });

  it("denemesi olan pakette CTA '7 gün ücretsiz dene', yoksa 'Abone ol'", () => {
    expect(ctaLabel(annual!)).toBe("7 gün ücretsiz dene");
    expect(ctaLabel(monthly!)).toBe("Abone ol");
  });

  it("yasal metin fiyatı, 7 gün içinde iptal edince ücret alınmadığını, ücretlendirme zamanını ve iptal yolunu açıkça yazar", () => {
    expect(annual?.trialPeriod).toBe("7 gün");
    expect(finePrint(annual!)).toBe(
      "İlk 7 gün ücretsiz. 7 gün içinde iptal edersen hiçbir ücret ödemezsin. " +
        "İptal etmezsen deneme bitince ₺600 / yıl ücretlendirilirsin ve abonelik iptal edene kadar her yıl yenilenir. " +
        "İptal: Google Play › Abonelikler ya da uygulamada Kelimelerim › Aboneliği yönet.",
    );
  });

  it("deneme teklifi yoksa (panelden kaldırıldıysa) metin '7 gün ücretsiz' sözü VERMEZ", () => {
    expect(monthly?.trialPeriod).toBeNull();
    expect(finePrint(monthly!)).toBe(
      "₺100 / ay. Abonelik iptal edene kadar her ay yenilenir; istediğin zaman iptal edebilirsin. " +
        "İptal: Google Play › Abonelikler ya da uygulamada Kelimelerim › Aboneliği yönet.",
    );
    expect(finePrint(monthly!)).not.toContain("ücretsiz");
  });
});
