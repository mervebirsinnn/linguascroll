import { computeWordReviewState, type ReviewEvent } from "./review-scheduling";

/**
 * `now` HER ZAMAN explicit — gerçek clock'a hiç dokunulmuyor (flaky test'ten
 * kaçınma, kullanıcı kararı). Sabit bir referans an kullanıyoruz.
 */
const NOW = new Date("2026-06-15T12:00:00.000Z");

function daysAgo(days: number, from: Date = NOW): Date {
  return new Date(from.getTime() - days * 24 * 60 * 60 * 1000);
}
function daysAfter(days: number, from: Date): Date {
  return new Date(from.getTime() + days * 24 * 60 * 60 * 1000);
}
function event(isCorrect: boolean, reviewedAt: Date): ReviewEvent {
  return { isCorrect, reviewedAt };
}

describe("computeWordReviewState — hiç review edilmemiş", () => {
  it("boş event listesi → neverReviewed", () => {
    expect(computeWordReviewState([], NOW)).toEqual({ status: "neverReviewed" });
  });
});

describe("computeWordReviewState — son review YANLIŞ", () => {
  it("tek bir yanlış review → dueIncorrect, interval hesabı YOK (anında due)", () => {
    const state = computeWordReviewState([event(false, daysAgo(0))], NOW);
    expect(state).toEqual({ status: "dueIncorrect", lastReviewedAt: daysAgo(0) });
  });

  it("iki ardışık DOĞRU'dan SONRA bir YANLIŞ → streak sıfırlanır, dueIncorrect (consecutiveCorrect state'te bile YOK)", () => {
    const events = [event(true, daysAgo(10)), event(true, daysAgo(5)), event(false, daysAgo(1))];
    const state = computeWordReviewState(events, NOW);
    expect(state.status).toBe("dueIncorrect");
  });

  it("YANLIŞ ÇOK YAKIN ZAMANDA olsa bile (1 dakika önce) hâlâ due — yanlış review için bekleme süresi YOK", () => {
    const oneMinuteAgo = new Date(NOW.getTime() - 60_000);
    const state = computeWordReviewState([event(false, oneMinuteAgo)], NOW);
    expect(state.status).toBe("dueIncorrect");
  });
});

describe("computeWordReviewState — 1. ardışık doğru (interval: 1 gün)", () => {
  it("review'dan HEMEN SONRA (interval dolmadan) → notDue, nextDueAt = +1 gün", () => {
    const reviewedAt = daysAgo(0.5); // 12 saat önce, 1 günü henüz doldurmadı
    const state = computeWordReviewState([event(true, reviewedAt)], NOW);
    expect(state).toEqual({ status: "notDue", lastReviewedAt: reviewedAt, consecutiveCorrect: 1, nextDueAt: daysAfter(1, reviewedAt) });
  });

  it("TAM sınırda (reviewedAt + 1 gün === now) → due (SINIR DAHİL, kullanıcı kararı)", () => {
    const reviewedAt = daysAgo(1);
    const state = computeWordReviewState([event(true, reviewedAt)], NOW);
    expect(state).toEqual({ status: "dueCorrect", lastReviewedAt: reviewedAt, consecutiveCorrect: 1 });
  });

  it("sınırdan biraz SONRA (1 gün + 1ms geçmiş) → due", () => {
    const reviewedAt = new Date(daysAgo(1).getTime() - 1);
    const state = computeWordReviewState([event(true, reviewedAt)], NOW);
    expect(state.status).toBe("dueCorrect");
  });

  it("sınırdan biraz ÖNCE (1 gün - 1ms) → henüz notDue", () => {
    const reviewedAt = new Date(daysAgo(1).getTime() + 1);
    const state = computeWordReviewState([event(true, reviewedAt)], NOW);
    expect(state.status).toBe("notDue");
  });
});

describe("computeWordReviewState — 2. ardışık doğru (interval: 3 gün)", () => {
  it("2 gün geçmiş (< 3) → henüz notDue", () => {
    const events = [event(true, daysAgo(10)), event(true, daysAgo(2))];
    const state = computeWordReviewState(events, NOW);
    expect(state.status).toBe("notDue");
    if (state.status === "notDue") {
      expect(state.consecutiveCorrect).toBe(2);
    }
  });

  it("TAM 3 gün geçmiş → due", () => {
    const events = [event(true, daysAgo(10)), event(true, daysAgo(3))];
    const state = computeWordReviewState(events, NOW);
    expect(state).toEqual({ status: "dueCorrect", lastReviewedAt: daysAgo(3), consecutiveCorrect: 2 });
  });
});

describe("computeWordReviewState — 3+ ardışık doğru (interval: 7 gün)", () => {
  it("tam 3 ardışık doğru, 7 gün geçmiş → due", () => {
    const events = [event(true, daysAgo(20)), event(true, daysAgo(15)), event(true, daysAgo(7))];
    const state = computeWordReviewState(events, NOW);
    expect(state).toEqual({ status: "dueCorrect", lastReviewedAt: daysAgo(7), consecutiveCorrect: 3 });
  });

  it("4 ardışık doğru (3'ten FAZLA) → interval YİNE 7 gün (üst sınır yok, hep 7)", () => {
    const events = [event(true, daysAgo(40)), event(true, daysAgo(30)), event(true, daysAgo(20)), event(true, daysAgo(7))];
    const state = computeWordReviewState(events, NOW);
    expect(state).toEqual({ status: "dueCorrect", lastReviewedAt: daysAgo(7), consecutiveCorrect: 4 });
  });

  it("3 ardışık doğru ama sadece 6 gün geçmiş (< 7) → henüz notDue", () => {
    const events = [event(true, daysAgo(20)), event(true, daysAgo(15)), event(true, daysAgo(6))];
    const state = computeWordReviewState(events, NOW);
    expect(state.status).toBe("notDue");
  });
});

describe("computeWordReviewState — girdi sırası ve sağlamlık", () => {
  it("event'ler kronolojik OLMAYAN sırada verilse bile doğru sonucu üretir (fonksiyon kendi sıralıyor)", () => {
    const chronological = [event(true, daysAgo(20)), event(true, daysAgo(15)), event(false, daysAgo(1))];
    const shuffled = [chronological[2]!, chronological[0]!, chronological[1]!];
    expect(computeWordReviewState(shuffled, NOW)).toEqual(computeWordReviewState(chronological, NOW));
  });

  it("girdi dizisini MUTATE etmez", () => {
    const events = [event(true, daysAgo(5)), event(false, daysAgo(1))];
    const copy = [...events];
    computeWordReviewState(events, NOW);
    expect(events).toEqual(copy);
  });
});
