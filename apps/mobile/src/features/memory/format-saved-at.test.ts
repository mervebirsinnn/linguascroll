import { formatSavedAt } from "./format-saved-at";

describe("formatSavedAt", () => {
  it("ISO 8601 string'i DD.MM.YYYY olarak formatlar", () => {
    expect(formatSavedAt("2026-01-05T14:30:00.000Z")).toBe("05.01.2026");
  });

  it("tek haneli gün/ay sıfırla doldurulur", () => {
    expect(formatSavedAt("2026-09-01T00:00:00.000Z")).toBe("01.09.2026");
  });

  it("yıl sonu/başı sınırını UTC takvim gününe göre doğru işler", () => {
    expect(formatSavedAt("2025-12-31T23:00:00.000Z")).toBe("31.12.2025");
    expect(formatSavedAt("2026-01-01T00:00:00.000Z")).toBe("01.01.2026");
  });
});
