/**
 * `savedAt` (ISO 8601 string, bkz. shared-types/saved-word.ts) → "DD.MM.YYYY".
 * `Date.prototype.toLocaleDateString('tr-TR')` KULLANILMIYOR: Hermes'in ICU
 * desteği build'e göre değişebiliyor (bazı RN/Hermes kurulumlarında locale'li
 * `toLocaleDateString` "Invalid Date" veya İngilizce'ye sessizce düşebiliyor)
 * — bu yüzden sadece `Date`'in HER zaman garanti ettiği ham sayısal
 * getter'larla elle formatlıyoruz.
 *
 * BİLİNÇLİ OLARAK UTC getter'ları (getUTCDate/getUTCMonth/getUTCFullYear)
 * kullanılıyor, LOKAL saat DEĞİL: backend zaten `toISOString()` ile hep UTC
 * gönderiyor (bkz. words.service.ts'in toSavedWord'ü), ve bu fonksiyon çalışma
 * ortamının saat dilimine göre farklı sonuç ÜRETMEMELİ — testlerin (ve gerçek
 * kullanıcı cihazlarının farklı saat dilimlerinin) deterministic kalması için
 * bu şart. Sonuç, gün sınırına çok yakın kayıtlarda kullanıcının yerel gününden
 * en fazla 1 gün sapabilir — MVP için kabul edilebilir bir ödünleşim.
 */
export function formatSavedAt(iso: string): string {
  const date = new Date(iso);
  const day = String(date.getUTCDate()).padStart(2, "0");
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const year = date.getUTCFullYear();
  return `${day}.${month}.${year}`;
}
