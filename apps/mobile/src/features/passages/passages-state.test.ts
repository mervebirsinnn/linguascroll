import type { Passage, PassageAnswerResult, PassagePage, PassageQuestion } from "@linguascroll/shared-types";
import { PassagesApiError } from "./api/passages-api";
import {
  applyAnswerResult,
  applyFreshError,
  applyFreshSuccess,
  applyLoadMoreError,
  applyLoadMoreStart,
  applyLoadMoreSuccess,
  applyWordSaved,
  canLoadMore,
  canRefresh,
  canSelectOption,
  expandPassagePages,
  flattenPassagePages,
  formatAnswerSummary,
  INITIAL_LEVEL_STATE,
  invalidateAfterAccessChange,
  isPassageComplete,
  summarizeAnswers,
  toggleEliminated,
  type PassagesLevelState,
} from "./passages-state";

jest.mock("../identity/auth-headers", () => ({ authHeaders: () => Promise.resolve({}) }));

const uuid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;

function question(n: number, result: PassageAnswerResult | null = null): PassageQuestion {
  return { id: uuid(100 + n), type: "detail", prompt: `Q${n}`, options: [0, 1, 2, 3].map((i) => ({ id: uuid(1000 + n * 10 + i), text: `o${i}` })), result };
}

function answer(q: PassageQuestion, selectedIndex: number, correctIndex: number): PassageAnswerResult {
  return {
    selectedOptionId: q.options[selectedIndex]!.id,
    correctOptionId: q.options[correctIndex]!.id,
    correct: selectedIndex === correctIndex,
    options: q.options.map((option, i) => ({ optionId: option.id, isCorrect: i === correctIndex, trapType: i === correctIndex ? null : "copy", explanation: "e" })),
  };
}

function openPassage(n: number, overrides: Partial<Extract<Passage, { access: "open" }>> = {}): Extract<Passage, { access: "open" }> {
  return {
    access: "open",
    id: uuid(n),
    level: "B2",
    title: `T${n}`,
    topic: "K",
    paragraphs: [[{ text: "A " }, { text: "cat", word: { wordId: uuid(500), gloss: "kedi", saved: false, spanId: uuid(601), contextSentence: "A cat sat." } }, { text: " sat." }]],
    questions: [question(n * 10 + 1), question(n * 10 + 2), question(n * 10 + 3), question(n * 10 + 4)],
    ...overrides,
  };
}

const lockedPassage = (n: number): Passage => ({ access: "locked", id: uuid(n), level: "B2", title: `L${n}`, topic: "K" });
const page = (items: Passage[], nextCursor: string | null): PassagePage => ({ items, nextCursor });
const success = (state: PassagesLevelState) => {
  if (state.status !== "success") throw new Error("success bekleniyordu");
  return state;
};

describe("sayfalama", () => {
  it("fresh başarı önceki içeriğin üzerine yazar (append değil) ve aynı sayfadaki kopyayı düşürür", () => {
    const state = applyFreshSuccess(page([openPassage(1), openPassage(1), openPassage(2)], "c1"));
    expect(success(state).items.map((item) => item.id)).toEqual([uuid(1), uuid(2)]);
    expect(success(state).nextCursor).toBe("c1");
  });

  it("loadMore: yeni metinler eklenir; zaten listedeki id tekrar eklenmez ve İLK gelen (cevaplı) korunur", () => {
    const answered = openPassage(1);
    answered.questions[0] = question(11, answer(question(11), 0, 0));
    let state: PassagesLevelState = applyFreshSuccess(page([answered], "c1"));
    state = applyLoadMoreStart(state);
    expect(success(state).isLoadingMore).toBe(true);

    state = applyLoadMoreSuccess(state, page([openPassage(1), openPassage(2)], null));

    expect(success(state).items.map((item) => item.id)).toEqual([uuid(1), uuid(2)]);
    expect(success(state).items[0]).toBe(answered);
    expect(success(state)).toMatchObject({ nextCursor: null, isLoadingMore: false, loadMoreError: null });
  });

  it("loadMore hatası mevcut metinleri korur, kullanıcı-dostu mesaj verir; ham hata metni sızmaz", () => {
    const state = applyFreshSuccess(page([openPassage(1)], "c1"));
    const failed = success(applyLoadMoreError(applyLoadMoreStart(state), new PassagesApiError("Metinler getirilemedi: 503 Service Unavailable", 503)));
    expect(failed.items).toHaveLength(1);
    expect(failed.loadMoreError).toBe("Sunucu şu an çok yoğun. Birkaç dakika sonra tekrar dene.");
    expect(failed.loadMoreError).not.toContain("503");
    expect(success(applyLoadMoreError(state, new Error("Network request failed"))).loadMoreError).toMatch(/Bağlantı kurulamadı/);
  });

  it("ilk yükleme hatası: timeout ve 429 sunucu yoğun, diğerleri bağlantı mesajı", () => {
    expect(applyFreshError(new PassagesApiError("x", undefined, true))).toEqual({ status: "error", message: expect.stringContaining("Sunucu şu an çok yoğun") });
    expect(applyFreshError(new PassagesApiError("x", 429))).toMatchObject({ message: expect.stringContaining("yoğun") });
    expect(applyFreshError(new PassagesApiError("x", 403))).toMatchObject({ message: expect.stringContaining("Bağlantı kurulamadı") });
  });

  it("canLoadMore: tek istek ve nextCursor null seviye sonu (otomatik yeniden başlama yok)", () => {
    const withCursor = applyFreshSuccess(page([openPassage(1)], "c1"));
    const ended = applyFreshSuccess(page([openPassage(1)], null));
    expect(canLoadMore(withCursor, false)).toBe(true);
    expect(canLoadMore(withCursor, true)).toBe(false);
    expect(canLoadMore(ended, false)).toBe(false);
    expect(canLoadMore(INITIAL_LEVEL_STATE, false)).toBe(false);
    expect(canRefresh(false)).toBe(true);
    expect(canRefresh(true)).toBe(false);
  });

  it("success dışı durumlarda loadMore geçişleri durumu değiştirmez", () => {
    expect(applyLoadMoreStart(INITIAL_LEVEL_STATE)).toBe(INITIAL_LEVEL_STATE);
    expect(applyLoadMoreSuccess(INITIAL_LEVEL_STATE, page([], null))).toBe(INITIAL_LEVEL_STATE);
  });
});

describe("erişim değişimi (satın alma)", () => {
  it("tüm seviyelerin listesi sıfırlanır: kilitli kartlar eski haliyle kalmaz", () => {
    const before = { B2: applyFreshSuccess(page([lockedPassage(1)], null)) };
    const after = invalidateAfterAccessChange();
    expect(after).toEqual({});
    expect(after.B2).toBeUndefined();
    expect(before.B2.items[0]!.access).toBe("locked"); // girdi mutate edilmez
  });
});

describe("cevap ve kelime güncellemeleri", () => {
  it("cevap yalnız ilgili soruya yazılır, diğer soru/metin aynı nesne kalır; kilitli kartlara dokunmaz", () => {
    const first = openPassage(1);
    const second = openPassage(2);
    const state = applyFreshSuccess(page([first, lockedPassage(3), second], null));
    const target = first.questions[1]!;
    const result = answer(target, 2, 0);

    const next = success(applyAnswerResult(state, target.id, result));

    const updated = next.items[0] as Extract<Passage, { access: "open" }>;
    expect(updated.questions[1]!.result).toEqual(result);
    expect(updated.questions[0]).toBe(first.questions[0]);
    expect(next.items[1]).toBe(state.items[1]);
    expect(next.items[2]).toBe(second);
    expect(state.items[0]).toBe(first); // girdi mutate edilmedi
  });

  it("bilinmeyen soru id'si hiçbir şeyi değiştirmez", () => {
    const state = applyFreshSuccess(page([openPassage(1)], null));
    const next = success(applyAnswerResult(state, uuid(9999), answer(question(1), 0, 0)));
    expect(next.items[0]).toBe(state.items[0]);
  });

  it("kelime kaydı: aynı wordId'nin TÜM geçişlerinde ve tüm metinlerde güncellenir; başka kelime etkilenmez; geri alınabilir", () => {
    const withTwo = openPassage(1, {
      paragraphs: [
        [{ text: "cat", word: { wordId: uuid(500), gloss: "kedi", saved: false, spanId: uuid(601), contextSentence: "A cat sat." } }, { text: " and " }, { text: "dog", word: { wordId: uuid(501), gloss: "köpek", saved: false, spanId: uuid(603), contextSentence: "A dog barked." } }],
        [{ text: "cat", word: { wordId: uuid(500), gloss: "kedi", saved: false, spanId: uuid(602), contextSentence: "The cat left." } }],
      ],
    });
    const state = applyFreshSuccess(page([withTwo, openPassage(2)], null));

    const saved = success(applyWordSaved(state, uuid(500), true));
    const runs = (saved.items[0] as Extract<Passage, { access: "open" }>).paragraphs.flat();
    expect(runs.filter((run) => run.word?.wordId === uuid(500)).every((run) => run.word?.saved === true)).toBe(true);
    expect(runs.find((run) => run.word?.wordId === uuid(501))?.word?.saved).toBe(false);
    expect((saved.items[1] as Extract<Passage, { access: "open" }>).paragraphs[0]![1]!.word?.saved).toBe(true);

    const undone = success(applyWordSaved(saved, uuid(500), false));
    expect((undone.items[0] as Extract<Passage, { access: "open" }>).paragraphs.flat().every((run) => run.word?.saved !== true)).toBe(true);
  });
});

describe("sayfalara açma ve özet", () => {
  it("açık metin: [metin, soru1..4, özet] = 6 sayfa; kilitli: tek sayfa; sayı veriden gelir", () => {
    const pages = expandPassagePages(openPassage(1));
    expect(pages).toHaveLength(6);
    expect(pages[0]).toEqual({ kind: "text" });
    expect(pages[4]).toMatchObject({ kind: "question", index: 3, total: 4 });
    expect(pages[5]).toEqual({ kind: "summary" });
    expect(expandPassagePages(lockedPassage(2))).toEqual([{ kind: "locked" }]);
    expect(expandPassagePages(openPassage(3, { questions: [question(31)] }))).toHaveLength(3);
  });

  it("flattenPassagePages: metin sırası ve metin içi sıra korunur, anahtarlar benzersiz; kilitli metin tek öğe", () => {
    const flat = flattenPassagePages([openPassage(1), lockedPassage(2), openPassage(3)]);
    expect(flat.map((item) => item.page.kind)).toEqual(["text", "question", "question", "question", "question", "summary", "locked", "text", "question", "question", "question", "question", "summary"]);
    expect(new Set(flat.map((item) => item.key)).size).toBe(flat.length);
    expect(flat[0]!.passage.id).toBe(uuid(1));
    expect(flat[6]!.passage.id).toBe(uuid(2));
    expect(flattenPassagePages([])).toEqual([]);
  });

  it("canlı özet: 2 doğru · 1 yanlış · 1 cevaplanmadı; hiç cevap yokken hepsi cevaplanmadı", () => {
    const q = [question(1), question(2), question(3), question(4)];
    q[0] = { ...q[0]!, result: answer(q[0]!, 0, 0) };
    q[1] = { ...q[1]!, result: answer(q[1]!, 1, 1) };
    q[2] = { ...q[2]!, result: answer(q[2]!, 0, 3) };
    expect(formatAnswerSummary(summarizeAnswers(q))).toBe("2 doğru · 1 yanlış · 1 cevaplanmadı");
    expect(isPassageComplete(q)).toBe(false);
    expect(formatAnswerSummary(summarizeAnswers([question(5), question(6)]))).toBe("0 doğru · 0 yanlış · 2 cevaplanmadı");
    q[3] = { ...q[3]!, result: answer(q[3]!, 0, 0) };
    expect(isPassageComplete(q)).toBe(true);
    expect(isPassageComplete([])).toBe(false);
  });
});

describe("✕ elemesi (yalnız yerel, geri alınabilir)", () => {
  const q = question(1);
  const [a, b, c, d] = q.options.map((option) => option.id) as [string, string, string, string];

  it("eler, tekrar dokununca geri alır; girdi set'i mutate edilmez", () => {
    const empty: ReadonlySet<string> = new Set();
    const one = toggleEliminated(empty, q, a);
    expect([...one]).toEqual([a]);
    expect(empty.size).toBe(0);
    expect(toggleEliminated(one, q, a).size).toBe(0);
  });

  it("son seçilebilir şık elenemez (kullanıcı kendini cevapsız bırakamaz)", () => {
    let set: ReadonlySet<string> = new Set();
    for (const id of [a, b, c]) set = toggleEliminated(set, q, id);
    expect(set.size).toBe(3);
    expect(toggleEliminated(set, q, d)).toBe(set);
    expect(canSelectOption(set, q, d)).toBe(true);
  });

  it("elenmiş şık seçilemez; cevaplanmış soruda eleme değişmez ve seçim kapalı; yabancı şık yok sayılır", () => {
    const set = toggleEliminated(new Set(), q, a);
    expect(canSelectOption(set, q, a)).toBe(false);
    expect(canSelectOption(set, q, b)).toBe(true);

    const answered = { ...q, result: answer(q, 1, 1) };
    expect(toggleEliminated(set, answered, c)).toBe(set);
    expect(canSelectOption(new Set(), answered, b)).toBe(false);

    expect(toggleEliminated(set, q, uuid(77777))).toBe(set);
  });
});
