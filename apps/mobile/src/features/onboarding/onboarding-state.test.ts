import { buildCompletedState, DEFAULT_ONBOARDING_STATE, resolveOnboardingState } from "./onboarding-state";

describe("resolveOnboardingState", () => {
  it("storage boşsa (null) güvenli varsayılana döner", () => {
    expect(resolveOnboardingState(null)).toEqual(DEFAULT_ONBOARDING_STATE);
  });

  it("geçerli, tamamlanmış bir state'i olduğu gibi döner", () => {
    const raw = JSON.stringify({ completed: true, preferences: { level: "B1", topics: ["travel", "dating"] } });
    expect(resolveOnboardingState(raw)).toEqual({ completed: true, preferences: { level: "B1", topics: ["travel", "dating"] } });
  });

  it("JSON olarak parse edilemeyen (bozuk) bir string → güvenli varsayılana düşer, throw ETMEZ", () => {
    expect(() => resolveOnboardingState("{not-valid-json")).not.toThrow();
    expect(resolveOnboardingState("{not-valid-json")).toEqual(DEFAULT_ONBOARDING_STATE);
  });

  it("JSON olarak GEÇERLİ ama şekli (schema) yanlış bir değer → güvenli varsayılana düşer", () => {
    const raw = JSON.stringify({ completed: "yes", preferences: null }); // completed boolean değil
    expect(resolveOnboardingState(raw)).toEqual(DEFAULT_ONBOARDING_STATE);
  });

  it("geçersiz bir CEFR level içeren bir state → TÜM state güvenli varsayılana düşer (kısmi kurtarma YOK — tek atomic model)", () => {
    const raw = JSON.stringify({ completed: true, preferences: { level: "Z9", topics: ["travel"] } });
    expect(resolveOnboardingState(raw)).toEqual(DEFAULT_ONBOARDING_STATE);
  });

  it("geçersiz bir topic içeren bir state → TÜM state güvenli varsayılana düşer", () => {
    const raw = JSON.stringify({ completed: true, preferences: { level: null, topics: ["not-a-real-topic"] } });
    expect(resolveOnboardingState(raw)).toEqual(DEFAULT_ONBOARDING_STATE);
  });

  it("eski/alakasız bir JSON şekli (örn. eski bir formattan kalma) → güvenli varsayılana düşer", () => {
    const raw = JSON.stringify({ onboardingCompleted: true }); // eski/farklı bir alan adı
    expect(resolveOnboardingState(raw)).toEqual(DEFAULT_ONBOARDING_STATE);
  });
});

describe("buildCompletedState", () => {
  it("completed:true ve verilen tercihle bir state üretir", () => {
    expect(buildCompletedState({ level: "A2", topics: ["humor"] })).toEqual({
      completed: true,
      preferences: { level: "A2", topics: ["humor"] },
    });
  });

  it("skip akışı (boş tercih) da completed:true üretir — 'atlamak' da 'tamamlamak' sayılır", () => {
    expect(buildCompletedState({ level: null, topics: [] })).toEqual({
      completed: true,
      preferences: { level: null, topics: [] },
    });
  });
});
