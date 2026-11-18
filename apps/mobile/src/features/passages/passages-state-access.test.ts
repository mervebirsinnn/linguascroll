import type { Passage } from "@linguascroll/shared-types";
import { PassagesApiError } from "./api/passages-api";
import {
  applyFreshSuccess,
  applyLoadMoreSuccess,
  findQuestion,
  isOutcomeUncertain,
  mergeAnswersFromPage,
  passageContainsWord,
  type PassagesLevelState,
} from "./passages-state";
import { makeAnswer, makeLockedPassage, makeOpenPassage, makePage, makeQuestion, uuid } from "./passages-test-helpers";

jest.mock("../identity/auth-headers", () => ({ authHeaders: () => Promise.resolve({}) }));

const success = (state: PassagesLevelState) => {
  if (state.status !== "success") throw new Error("success bekleniyordu");
  return state;
};

describe("erişim durumu farklı kopyalar ve yeni saf yardımcılar (PR-7a)", () => {
  it("loadMore: eski KİLİTLİ kopya, gelen AÇIK kopyanın önüne geçmez (gelen kazanır); aynı erişimde ilk korunur", () => {
    const state = applyFreshSuccess(makePage([makeLockedPassage(1), makeOpenPassage(2)], "c1"));
    const incomingOpen = makeOpenPassage(1);
    const next = success(applyLoadMoreSuccess(state, makePage([incomingOpen, makeOpenPassage(2)], null)));
    expect(next.items[0]).toBe(incomingOpen);
    expect(next.items[1]).toBe(state.items[1]); // aynı erişim: ilk kopya (yerel cevaplar) korundu
  });

  it("loadMore: eski AÇIK kopya, sunucu artık KİLİTLİ derse ekranda kalmaz", () => {
    const state = applyFreshSuccess(makePage([makeOpenPassage(1)], "c1"));
    const next = success(applyLoadMoreSuccess(state, makePage([makeLockedPassage(1)], null)));
    expect(next.items.map((item) => item.access)).toEqual(["locked"]);
  });

  it("isOutcomeUncertain: timeout/5xx/ağ hatası belirsiz; 4xx ve diğer hatalar kesin", () => {
    expect(isOutcomeUncertain(new PassagesApiError("x", undefined, true))).toBe(true);
    expect(isOutcomeUncertain(new PassagesApiError("x", 502))).toBe(true);
    expect(isOutcomeUncertain(new TypeError("Network request failed"))).toBe(true);
    expect(isOutcomeUncertain(new PassagesApiError("x", 403))).toBe(false);
    expect(isOutcomeUncertain(new PassagesApiError("x", 400))).toBe(false);
    expect(isOutcomeUncertain(new Error("Oturum yok"))).toBe(false);
  });

  it("mergeAnswersFromPage: yalnız yerelde CEVAPSIZ olan soruya kayıtlı sonucu yazar; yerel cevabı ve listeyi korur", () => {
    const local = makeOpenPassage(1);
    local.questions[1] = makeQuestion(12, makeAnswer(makeQuestion(12), 0, 0)); // yerelde zaten cevaplı
    const state = applyFreshSuccess(makePage([local], "c1"));
    const server = makeOpenPassage(1);
    server.questions[0] = makeQuestion(11, makeAnswer(makeQuestion(11), 2, 2));
    server.questions[1] = makeQuestion(12, makeAnswer(makeQuestion(12), 3, 3)); // farklı sonuç: yerel cevaplıya dokunulmaz

    const merged = success(mergeAnswersFromPage(state, makePage([server, makeOpenPassage(9)], null)));

    const passage = merged.items[0] as Extract<Passage, { access: "open" }>;
    expect(passage.questions[0]!.result?.selectedOptionId).toBe(makeQuestion(11).options[2]!.id);
    expect(passage.questions[1]!.result).toBe(local.questions[1]!.result);
    expect(merged.items).toHaveLength(1);
    expect(merged.nextCursor).toBe("c1");
  });

  it("findQuestion/passageContainsWord: yalnız AÇIK metinlerde; kilitli metin ve bilinmeyen çift false", () => {
    const byLevel = { B2: applyFreshSuccess(makePage([makeOpenPassage(1), makeLockedPassage(2)], null)) };
    expect(findQuestion(byLevel, makeQuestion(11).id)?.id).toBe(makeQuestion(11).id);
    expect(findQuestion(byLevel, uuid(9999))).toBeNull();
    expect(passageContainsWord(byLevel, uuid(1), uuid(500))).toBe(true);
    expect(passageContainsWord(byLevel, uuid(1), uuid(501))).toBe(false);
    expect(passageContainsWord(byLevel, uuid(2), uuid(500))).toBe(false);
  });
});
