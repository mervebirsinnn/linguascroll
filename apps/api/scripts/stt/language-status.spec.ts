import { computeLanguageStatus, LANGUAGE_CONFIDENCE_THRESHOLD_MVP_ASSUMPTION } from "./language-status";

describe("computeLanguageStatus — dil/confidence politikası (4 durum)", () => {
  it("İngilizce + yeterli confidence → ready", () => {
    expect(computeLanguageStatus({ detectedLanguage: "en", languageProbability: 0.95 })).toBe("ready");
  });

  it("İngilizce + eşiğe TAM eşit confidence → ready (>= dahil)", () => {
    expect(
      computeLanguageStatus({ detectedLanguage: "en", languageProbability: LANGUAGE_CONFIDENCE_THRESHOLD_MVP_ASSUMPTION }),
    ).toBe("ready");
  });

  it("İngilizce + düşük confidence → needsReview", () => {
    expect(computeLanguageStatus({ detectedLanguage: "en", languageProbability: 0.3 })).toBe("needsReview");
  });

  it("Farklı dil + yüksek confidence → rejected", () => {
    expect(computeLanguageStatus({ detectedLanguage: "fr", languageProbability: 0.95 })).toBe("rejected");
  });

  it("Farklı dil + düşük confidence (belirsiz) → needsReview", () => {
    expect(computeLanguageStatus({ detectedLanguage: "fr", languageProbability: 0.2 })).toBe("needsReview");
  });

  it("Farklı dil + eşiğin hemen altı confidence → needsReview (rejected DEĞİL)", () => {
    expect(
      computeLanguageStatus({
        detectedLanguage: "de",
        languageProbability: LANGUAGE_CONFIDENCE_THRESHOLD_MVP_ASSUMPTION - 0.01,
      }),
    ).toBe("needsReview");
  });
});
