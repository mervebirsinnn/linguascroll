/**
 * Okuma pratiği arayüz etiketleri (saf). Sunucu `trapType` ve soru `type` alanlarını DÜZ METİN olarak yollar (yeni tür gelirse
 * eski build parse hatasına düşmesin diye, bkz. shared-types/passage.ts); bu yüzden bilinmeyen değer çökmez, okunur hâle
 * getirilerek gösterilir.
 */
const TRAP_LABELS: Readonly<Record<string, string>> = {
  copy: "Metinden kopya",
  extreme: "Aşırı genelleme",
  reverse: "Ters anlam",
  notstated: "Metinde yok",
  detail: "Yanlış ayrıntı",
  sound: "Kulağa benzer",
  context: "Bağlam dışı",
};

const QUESTION_TYPE_LABELS: Readonly<Record<string, string>> = {
  "main-idea": "Ana fikir",
  detail: "Ayrıntı",
  inference: "Çıkarım",
  vocabulary: "Sözcük",
  purpose: "Yazarın amacı",
  tone: "Ton",
  reference: "Gönderme",
};

/** "extreme" → "Aşırı genelleme"; bilinmeyen tür "some-new-trap" → "Some new trap"; boş/null → null (etiket gösterilmez). */
export function trapTypeLabel(trapType: string | null): string | null {
  if (trapType === null || trapType.trim() === "") return null;
  return TRAP_LABELS[trapType] ?? humanize(trapType);
}

export function questionTypeLabel(type: string): string {
  return QUESTION_TYPE_LABELS[type] ?? (type.trim() === "" ? "Soru" : humanize(type));
}

function humanize(value: string): string {
  const spaced = value.replace(/[-_]+/g, " ").trim();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}
