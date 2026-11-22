import type { Passage } from "@linguascroll/shared-types";
import { z } from "zod";
import { PassagesApiError } from "./api/passages-api";
import {
  applyFreshSuccess,
  applyLoadMoreSuccess,
  classifyFailure,
  effectiveSelection,
  findOpenPassage,
  findQuestion,
  findWordSaved,
  initialPassageLevel,
  isOutcomeUncertain,
  mergeAnswersFromPage,
  passageContainsSpan,
  type PassagesLevelState,
} from "./passages-state";
import { CAT_SPAN_1, CAT_SPAN_2, CAT_WORD_ID, makeAnswer, makeLockedPassage, makeOpenPassage, makePage, makeQuestion, uuid } from "./passages-test-helpers";

jest.mock("../identity/auth-headers", () => ({ authHeaders: () => Promise.resolve({}) }));

const success = (state: PassagesLevelState) => {
  if (state.status !== "success") throw new Error("success bekleniyordu");
  return state;
};

function zodFailure(): unknown {
  try {
    z.string().parse(1);
  } catch (error) {
    return error;
  }
  throw new Error("ZodError bekleniyordu");
}

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

  it("classifyFailure: kesin ret YALNIZ sözleşmedeki 400/401/403/404; 429 ayrı; 408 ve diğer 4xx belirsiz", () => {
    for (const status of [400, 401, 403, 404]) expect(classifyFailure(new PassagesApiError("x", status))).toBe("rejected");
    expect(classifyFailure(new PassagesApiError("x", 429))).toBe("rate-limited");
    for (const status of [408, 409, 410, 413, 422, 425, 500, 502, 503, 504]) expect(classifyFailure(new PassagesApiError("x", status))).toBe("uncertain");
    expect(classifyFailure(new PassagesApiError("x", undefined, true))).toBe("uncertain");
    expect(classifyFailure(new Error("Oturum yok"))).toBe("rejected");
    expect(isOutcomeUncertain(new PassagesApiError("x", 408))).toBe(true);
    expect(isOutcomeUncertain(new PassagesApiError("x", 429))).toBe(false);
  });

  it("isOutcomeUncertain: timeout/5xx/ağ hatası belirsiz; 4xx ve diğer hatalar kesin", () => {
    expect(isOutcomeUncertain(new PassagesApiError("x", undefined, true))).toBe(true);
    expect(isOutcomeUncertain(new PassagesApiError("x", 502))).toBe(true);
    expect(isOutcomeUncertain(new TypeError("Network request failed"))).toBe(true);
    expect(isOutcomeUncertain(new SyntaxError("Unexpected end of JSON input"))).toBe(true); // 200 ama gövde okunamadı
    expect(isOutcomeUncertain(zodFailure())).toBe(true); // 200 ama sözleşmeye uymayan gövde
    expect(isOutcomeUncertain(new PassagesApiError("x", 403))).toBe(false);
    expect(isOutcomeUncertain(new PassagesApiError("x", 400))).toBe(false);
    expect(isOutcomeUncertain(new Error("Oturum yok"))).toBe(false); // istek hiç atılmadı
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

  it("findQuestion/passageContainsSpan: yalnız AÇIK metinlerde; geçiş o metne VE kelimeye ait olmalı", () => {
    const byLevel = { B2: applyFreshSuccess(makePage([makeOpenPassage(1), makeLockedPassage(2)], null)) };
    expect(findQuestion(byLevel, makeQuestion(11).id)?.id).toBe(makeQuestion(11).id);
    expect(findQuestion(byLevel, uuid(9999))).toBeNull();
    expect(passageContainsSpan(byLevel, uuid(1), CAT_WORD_ID, CAT_SPAN_1)).toBe(true);
    expect(passageContainsSpan(byLevel, uuid(1), CAT_WORD_ID, CAT_SPAN_2)).toBe(true); // aynı kelimenin ikinci geçişi
    expect(passageContainsSpan(byLevel, uuid(1), uuid(501), CAT_SPAN_1)).toBe(false); // başka kelime
    expect(passageContainsSpan(byLevel, uuid(1), CAT_WORD_ID, uuid(9998))).toBe(false); // bilinmeyen geçiş
    expect(passageContainsSpan(byLevel, uuid(2), CAT_WORD_ID, CAT_SPAN_1)).toBe(false); // kilitli metin
  });
});

describe("ekran seçicileri (PR-7)", () => {
  const withSaved = (saved: boolean) => {
    const passage = makeOpenPassage(1);
    passage.paragraphs = [[{ text: "cat", word: { wordId: CAT_WORD_ID, gloss: "kedi", saved, spanId: CAT_SPAN_1, contextSentence: "A cat sat." } }]];
    return applyFreshSuccess(makePage([passage, makeLockedPassage(2)], null));
  };

  it("findWordSaved: yüklü açık metinlerde kelimenin kayıtlı bayrağı; yüklenmemiş/olmayan kelime false", () => {
    expect(findWordSaved(withSaved(true), CAT_WORD_ID)).toBe(true);
    expect(findWordSaved(withSaved(false), CAT_WORD_ID)).toBe(false);
    expect(findWordSaved(withSaved(true), uuid(9999))).toBe(false);
    expect(findWordSaved({ status: "loading" }, CAT_WORD_ID)).toBe(false);
  });

  it("findOpenPassage: yalnız hâlâ AÇIK metni verir (kilitli/yok → null)", () => {
    const state = withSaved(false);
    expect(findOpenPassage(state, uuid(1))?.id).toBe(uuid(1));
    expect(findOpenPassage(state, uuid(2))).toBeNull();
    expect(findOpenPassage(state, uuid(3))).toBeNull();
    expect(findOpenPassage({ status: "loading" }, uuid(1))).toBeNull();
  });

  it("effectiveSelection: elenmiş şık seçili sayılmaz", () => {
    expect(effectiveSelection("a", new Set())).toBe("a");
    expect(effectiveSelection("a", new Set(["a"]))).toBeNull();
    expect(effectiveSelection(undefined, new Set())).toBeNull();
  });

  it("initialPassageLevel: onboarding seviyesi B1..C2 ise aynen, A1/A2/boş ise B1 (otomatik yükseltme yok)", () => {
    expect(initialPassageLevel("C1")).toBe("C1");
    expect(initialPassageLevel("B2")).toBe("B2");
    expect(initialPassageLevel("A2")).toBe("B1");
    expect(initialPassageLevel(null)).toBe("B1");
    expect(initialPassageLevel(undefined)).toBe("B1");
  });
});
