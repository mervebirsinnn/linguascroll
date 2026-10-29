/**
 * RevenueCat SDK'sının `PurchasesPackage`'ından, paywall'ın İHTİYAÇ DUYDUĞU alanlara
 * indirgenmiş yapısal tip. UI ve saf fonksiyonlar SDK tiplerini hiç import etmiyor —
 * böylece paywall mantığı native modül yüklenmeden (Jest node ortamında) test edilebiliyor
 * (aynı "saf fonksiyon + ince adaptör" ayrımı: use-feed.ts / feed state geçişleri).
 */
export type RawIntroPrice = {
  price: number;
  periodUnit: string;
  periodNumberOfUnits: number;
};

export type RawPackage = {
  identifier: string;
  packageType: string;
  product: {
    price: number;
    priceString: string;
    introPrice: RawIntroPrice | null;
  };
};

export type PaywallPackageKind = "annual" | "monthly" | "weekly";

export type PaywallPackage = {
  id: string;
  kind: PaywallPackageKind;
  title: string;
  priceString: string;
  /** "ay" | "yıl" | "hafta" — "₺99,99 / ay" gibi cümlelerde kullanılır. */
  periodLabel: string;
  /** Örn. "7 gün ücretsiz"; ücretsiz deneme yoksa null. */
  trialLabel: string | null;
  /** Deneme süresi tek başına, örn. "7 gün" — iptal cümlesinde kullanılır; deneme yoksa null. */
  trialPeriod: string | null;
  /**
   * Yıllık planın aylık plana göre GERÇEK tasarruf yüzdesi. Sadece aylık + yıllık fiyatlar
   * birlikte varsa ve yıllık gerçekten daha ucuzsa dolu — uydurma/yuvarlanmış bir "%50
   * avantajlı" etiketi göstermiyoruz (Play politikası + tüketici mevzuatı).
   */
  savingsPercent: number | null;
};

const KIND_BY_TYPE: Record<string, PaywallPackageKind> = {
  ANNUAL: "annual",
  MONTHLY: "monthly",
  WEEKLY: "weekly",
};

const KIND_ORDER: PaywallPackageKind[] = ["annual", "monthly", "weekly"];

const TITLE_BY_KIND: Record<PaywallPackageKind, string> = {
  annual: "Yıllık",
  monthly: "Aylık",
  weekly: "Haftalık",
};

const PERIOD_LABEL_BY_KIND: Record<PaywallPackageKind, string> = {
  annual: "yıl",
  monthly: "ay",
  weekly: "hafta",
};

/** Sadece FİYATI 0 olan bir tanıtım teklifi "ücretsiz deneme"dir (indirimli ilk dönem değil). */
export function toTrialPeriod(intro: RawIntroPrice | null): string | null {
  if (intro === null || intro.price !== 0 || intro.periodNumberOfUnits <= 0) {
    return null;
  }
  const n = intro.periodNumberOfUnits;
  switch (intro.periodUnit) {
    case "DAY":
      return `${n} gün`;
    case "WEEK":
      return `${n * 7} gün`;
    case "MONTH":
      return `${n} ay`;
    case "YEAR":
      return `${n} yıl`;
    default:
      return null;
  }
}

export function toTrialLabel(intro: RawIntroPrice | null): string | null {
  const period = toTrialPeriod(intro);
  return period === null ? null : `${period} ücretsiz`;
}

/** Yıllık, 12 aylık ödemeden ne kadar ucuz? Yıllık daha ucuz DEĞİLSE null. */
export function computeAnnualSavingsPercent(monthlyPrice: number, annualPrice: number): number | null {
  if (monthlyPrice <= 0 || annualPrice <= 0) {
    return null;
  }
  const percent = Math.round((1 - annualPrice / (monthlyPrice * 12)) * 100);
  return percent > 0 ? percent : null;
}

export function buildPaywallPackages(raw: readonly RawPackage[]): PaywallPackage[] {
  const monthly = raw.find((p) => KIND_BY_TYPE[p.packageType] === "monthly");

  const packages: PaywallPackage[] = [];
  for (const p of raw) {
    const kind = KIND_BY_TYPE[p.packageType];
    if (kind === undefined) {
      continue; // lifetime/custom v1 kapsamı dışında
    }
    packages.push({
      id: p.identifier,
      kind,
      title: TITLE_BY_KIND[kind],
      priceString: p.product.priceString,
      periodLabel: PERIOD_LABEL_BY_KIND[kind],
      trialLabel: toTrialLabel(p.product.introPrice),
      trialPeriod: toTrialPeriod(p.product.introPrice),
      savingsPercent: kind === "annual" && monthly ? computeAnnualSavingsPercent(monthly.product.price, p.product.price) : null,
    });
  }
  return packages.sort((a, b) => KIND_ORDER.indexOf(a.kind) - KIND_ORDER.indexOf(b.kind));
}

/** Varsayılan seçili paket: en çok satmak istediğimiz (yıllık) varsa o, yoksa ilki. */
export function pickDefaultPackageId(packages: readonly PaywallPackage[]): string | null {
  return (packages.find((p) => p.kind === "annual") ?? packages[0])?.id ?? null;
}

export function ctaLabel(pkg: PaywallPackage): string {
  return pkg.trialLabel ? `${pkg.trialLabel} dene` : "Abone ol";
}

/**
 * Play politikası: fiyat, ücretlendirme zamanı ve iptal yolu AÇIKÇA yazılmalı.
 * 2026-10-28 — ürün kararı: 7 günlük ücretsiz deneme (Play'deki base plan teklifi). Deneme
 * süresi metne SABİT yazılmıyor, Play'den gelen teklifin süresinden üretiliyor — panelde süre
 * değişirse ya da teklif kaldırılırsa metin yanlış bir söz vermez.
 */
export function finePrint(pkg: PaywallPackage): string {
  const price = `${pkg.priceString} / ${pkg.periodLabel}`;
  const where = "İptal: Google Play › Abonelikler ya da uygulamada Kelimelerim › Hesabım › Aboneliği yönet.";
  if (pkg.trialPeriod === null) {
    return `${price}. Abonelik iptal edene kadar her ${pkg.periodLabel} yenilenir; istediğin zaman iptal edebilirsin. ${where}`;
  }
  return (
    `İlk ${pkg.trialPeriod} ücretsiz. ${pkg.trialPeriod} içinde iptal edersen hiçbir ücret ödemezsin. ` +
    `İptal etmezsen deneme bitince ${price} ücretlendirilirsin ve abonelik iptal edene kadar her ${pkg.periodLabel} yenilenir. ${where}`
  );
}
