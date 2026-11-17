/**
 * 2026-11-17 — Loopi büyüme eşikleri (ürün kararı). Gövde YALNIZ bu eşiklerde bir boncuk
 * uzar; aradaki ilerlemeyi kartın çubuğu ("12 / 15") gösterir. 5/10/25/50 reddedildi: aktif kullanıcı birkaç
 * günde 50'ye varıp hedefsiz kalırdı. İlk kelime (1) bilinçli olarak bir eşik — yoksa ilk kayıt karşılıksız
 * kalırdı. 100'den sonra gövde sabit, sayı artmaya devam eder (100 sonrası süsler sonraki sürümde).
 */
export const LOOPI_THRESHOLDS = [1, 3, 8, 15, 30, 60, 100] as const;

/** Geçilen eşik sayısı = gövdedeki boncuk sayısı (0..7). Negatif/NaN gibi bozuk girdi 0 sayılır. */
export function getLoopiStage(savedCount: number): number {
  return LOOPI_THRESHOLDS.filter((threshold) => savedCount >= threshold).length;
}

/** Bir sonraki büyüme eşiği; son eşik (100) geçildiyse null ("100 kelimelik hedef tamamlandı"). */
export function getNextLoopiThreshold(savedCount: number): number | null {
  return LOOPI_THRESHOLDS.find((threshold) => threshold > savedCount) ?? null;
}
