import { getLoopiStage, getNextLoopiThreshold } from "./loopi-stage";

describe("getLoopiStage — eşik sınırları (1, 3, 8, 15, 30, 60, 100)", () => {
  it.each([
    [0, 0],
    [1, 1],
    [2, 1],
    [3, 2],
    [7, 2],
    [8, 3],
    [14, 3],
    [15, 4],
    [29, 4],
    [30, 5],
    [59, 5],
    [60, 6],
    [99, 6],
    [100, 7],
    [128, 7],
    [10_000, 7],
  ])("%i kelime → %i boncuk", (count, stage) => {
    expect(getLoopiStage(count)).toBe(stage);
  });

  it("bozuk girdi (negatif) 0 boncuk", () => {
    expect(getLoopiStage(-5)).toBe(0);
  });
});

describe("getNextLoopiThreshold", () => {
  it.each([
    [0, 1],
    [1, 3],
    [2, 3],
    [8, 15],
    [99, 100],
  ])("%i kelime → sonraki büyüme %i", (count, next) => {
    expect(getNextLoopiThreshold(count)).toBe(next);
  });

  it.each([100, 128])("%i kelimede hedef tamam → null", (count) => {
    expect(getNextLoopiThreshold(count)).toBeNull();
  });
});
