/**
 * Chunk 11 — dil kabul/reddetme POLİTİKASI, transcribe.py'den (teknik STT
 * başarısı) ve transcript-candidate.ts'ten (yapısal doğrulama) BİLİNÇLİ OLARAK
 * AYRI: bu, LinguaScroll'un "şimdilik sadece İngilizce" ürün kararı, evrensel
 * bir transcript-şekli gerçeği değil.
 *
 * `CONFIDENCE_THRESHOLD` doğrulanmış bir değer DEĞİL — gerçek videoyla hiç
 * ölçülmemiş, başlangıç MVP varsayımı (bkz. sonuç raporundaki not). Gerçek
 * veriyle ayarlanabilir; burada isimlendirilmiş, tek bir sabit olarak duruyor.
 */
export const LANGUAGE_CONFIDENCE_THRESHOLD_MVP_ASSUMPTION = 0.6;

export type LanguageStatus = "ready" | "needsReview" | "rejected";

export type LanguageStatusInput = {
  detectedLanguage: string;
  languageProbability: number;
};

/**
 * Dört durum (kullanıcıyla mutabık kalınan tablo):
 *  - İngilizce + yeterli confidence   → ready
 *  - İngilizce + düşük confidence     → needsReview
 *  - Farklı dil + yüksek confidence   → rejected
 *  - Belirsiz (ne "en" ne emin değil) → needsReview
 *
 * `needsReview` durumunda draft ÜRETİLEBİLİR (bkz. run-stt-pipeline.ts) ama
 * bu chunk'ta zaten approved/publish adımı YOK — bu fonksiyon sadece durumu
 * hesaplıyor, DB/seed'e hiç dokunmuyor.
 */
export function computeLanguageStatus(input: LanguageStatusInput): LanguageStatus {
  const isEnglish = input.detectedLanguage === "en";
  const isConfident = input.languageProbability >= LANGUAGE_CONFIDENCE_THRESHOLD_MVP_ASSUMPTION;

  if (isEnglish && isConfident) {
    return "ready";
  }
  if (isEnglish && !isConfident) {
    return "needsReview";
  }
  if (!isEnglish && isConfident) {
    return "rejected";
  }
  return "needsReview";
}
