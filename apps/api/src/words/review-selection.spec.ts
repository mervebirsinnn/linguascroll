import { REVIEW_SESSION_SIZE, selectReviewSession, type ReviewCandidate } from "./review-selection";
import type { WordReviewState } from "./review-scheduling";

const NOW = new Date("2026-06-15T12:00:00.000Z");
function daysAgo(days: number): Date {
  return new Date(NOW.getTime() - days * 24 * 60 * 60 * 1000);
}

function candidate(wordId: string, state: WordReviewState, savedAt: Date = daysAgo(30)): ReviewCandidate {
  return { wordId, savedAt, state };
}

describe("selectReviewSession — öncelik sırası", () => {
  it("neverReviewed, dueIncorrect'ten ÖNCE gelir", () => {
    const never = candidate("never", { status: "neverReviewed" });
    const incorrect = candidate("incorrect", { status: "dueIncorrect", lastReviewedAt: daysAgo(1) });

    const result = selectReviewSession([incorrect, never]); // BİLİNÇLİ olarak ters sırada veriyoruz

    expect(result.map((c) => c.wordId)).toEqual(["never", "incorrect"]);
  });

  it("dueIncorrect, dueCorrect'ten ÖNCE gelir", () => {
    const incorrect = candidate("incorrect", { status: "dueIncorrect", lastReviewedAt: daysAgo(1) });
    const correct = candidate("correct", { status: "dueCorrect", lastReviewedAt: daysAgo(10), consecutiveCorrect: 1 });

    const result = selectReviewSession([correct, incorrect]);

    expect(result.map((c) => c.wordId)).toEqual(["incorrect", "correct"]);
  });

  it("notDue candidate'ler SONUCA HİÇ GİRMEZ — session'ı doldurmak için kullanılmaz", () => {
    const never = candidate("never", { status: "neverReviewed" });
    const notDue = candidate("not-due", { status: "notDue", lastReviewedAt: daysAgo(1), consecutiveCorrect: 1, nextDueAt: daysAgo(-5) });

    const result = selectReviewSession([never, notDue]);

    expect(result.map((c) => c.wordId)).toEqual(["never"]);
  });
});

describe("selectReviewSession — tie-break (aynı tier içinde)", () => {
  it("neverReviewed içinde EN ESKİ savedAt önce gelir", () => {
    const older = candidate("older", { status: "neverReviewed" }, daysAgo(30));
    const newer = candidate("newer", { status: "neverReviewed" }, daysAgo(2));

    const result = selectReviewSession([newer, older]);

    expect(result.map((c) => c.wordId)).toEqual(["older", "newer"]);
  });

  it("dueCorrect içinde EN ESKİ lastReviewedAt önce gelir", () => {
    const older = candidate("older", { status: "dueCorrect", lastReviewedAt: daysAgo(10), consecutiveCorrect: 1 });
    const newer = candidate("newer", { status: "dueCorrect", lastReviewedAt: daysAgo(2), consecutiveCorrect: 1 });

    const result = selectReviewSession([newer, older]);

    expect(result.map((c) => c.wordId)).toEqual(["older", "newer"]);
  });

  it("timestamp'ler de eşitse stabil tie-break: wordId'ye göre", () => {
    const sameTimestamp = daysAgo(5);
    const b = candidate("word-b", { status: "neverReviewed" }, sameTimestamp);
    const a = candidate("word-a", { status: "neverReviewed" }, sameTimestamp);

    const result = selectReviewSession([b, a]);

    expect(result.map((c) => c.wordId)).toEqual(["word-a", "word-b"]);
  });
});

describe("selectReviewSession — session boyutu", () => {
  it("due item sayısı sessionSize'dan AZSA, session KISA kalır — dolgu item eklenmez", () => {
    const candidates = [candidate("a", { status: "neverReviewed" }), candidate("b", { status: "neverReviewed" }, daysAgo(1))];

    const result = selectReviewSession(candidates);

    expect(result).toHaveLength(2);
  });

  it(`due item sayısı ${REVIEW_SESSION_SIZE}'ten FAZLAYSA, tam olarak ${REVIEW_SESSION_SIZE} döner`, () => {
    const candidates = Array.from({ length: 8 }, (_, i) => candidate(`word-${i}`, { status: "neverReviewed" }, daysAgo(i)));

    const result = selectReviewSession(candidates);

    expect(result).toHaveLength(REVIEW_SESSION_SIZE);
  });

  it("hiç due item yoksa boş dizi döner", () => {
    const notDue = candidate("x", { status: "notDue", lastReviewedAt: daysAgo(1), consecutiveCorrect: 1, nextDueAt: daysAgo(-5) });
    expect(selectReviewSession([notDue])).toEqual([]);
  });

  it("determinism: aynı girdi → her zaman aynı çıktı", () => {
    const candidates = Array.from({ length: 8 }, (_, i) => candidate(`word-${i}`, { status: "neverReviewed" }, daysAgo(i)));
    expect(selectReviewSession(candidates)).toEqual(selectReviewSession(candidates));
  });
});
