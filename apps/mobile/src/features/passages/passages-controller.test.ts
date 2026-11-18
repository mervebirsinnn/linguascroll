import type { PassageLevel, PassagePage } from "@linguascroll/shared-types";
import { PassagesApiError } from "./api/passages-api";
import { ANSWER_FAILED_MESSAGE, ANSWER_UNCERTAIN_MESSAGE, PassagesController, type PassagesDeps } from "./passages-controller";
import { CAT_WORD_ID, deferred, flush, makeAnswer, makeLockedPassage, makeOpenPassage, makePage, uuid, type OpenPassage } from "./passages-test-helpers";

jest.mock("../identity/auth-headers", () => ({ authHeaders: () => Promise.resolve({}) }));

type Fakes = {
  deps: PassagesDeps;
  fetchPassages: jest.Mock;
  answerPassageQuestion: jest.Mock;
  savePassageWord: jest.Mock;
  unsaveWord: jest.Mock;
};

function makeDeps(): Fakes {
  const fetchPassages = jest.fn();
  const answerPassageQuestion = jest.fn();
  const savePassageWord = jest.fn().mockResolvedValue({ created: true });
  const unsaveWord = jest.fn().mockResolvedValue(undefined);
  return { fetchPassages, answerPassageQuestion, savePassageWord, unsaveWord, deps: { fetchPassages, answerPassageQuestion, savePassageWord, unsaveWord, sleep: () => Promise.resolve() } };
}

function start(fakes: Fakes): PassagesController {
  const controller = new PassagesController(fakes.deps);
  controller.activate();
  return controller;
}

const level = (controller: PassagesController, l: PassageLevel) => controller.getSnapshot().byLevel[l];
const open = (controller: PassagesController, l: PassageLevel, index = 0) => {
  const state = level(controller, l);
  if (state?.status !== "success") throw new Error("success bekleniyordu");
  return state.items[index] as OpenPassage;
};
const networkError = () => new TypeError("Network request failed");

describe("yükleme ve yarışlar", () => {
  it("ensureLoaded: ilk çağrı çeker, ikinci çağrı (uçuşta ya da yüklüyken) yeniden istek atmaz", async () => {
    const fakes = makeDeps();
    const d = deferred<PassagePage>();
    fakes.fetchPassages.mockReturnValueOnce(d.promise);
    const controller = start(fakes);

    controller.ensureLoaded("B2");
    controller.ensureLoaded("B2");
    expect(fakes.fetchPassages).toHaveBeenCalledTimes(1);
    expect(level(controller, "B2")).toEqual({ status: "loading" });

    d.resolve(makePage([makeOpenPassage(1)]));
    await flush();
    controller.ensureLoaded("B2");
    expect(fakes.fetchPassages).toHaveBeenCalledTimes(1);
    expect(level(controller, "B2")?.status).toBe("success");
  });

  it("SEVİYE DEĞİŞİMİ: geç gelen B1 yanıtı C1 durumunu ezmez, kendi yuvasına yazılır", async () => {
    const fakes = makeDeps();
    const b1 = deferred<PassagePage>();
    fakes.fetchPassages.mockImplementation((l: PassageLevel) => (l === "B1" ? b1.promise : Promise.resolve(makePage([makeOpenPassage(2, { level: "C1" })]))));
    const controller = start(fakes);

    controller.ensureLoaded("B1");
    controller.ensureLoaded("C1");
    await flush();
    expect(open(controller, "C1").id).toBe(uuid(2));

    b1.resolve(makePage([makeOpenPassage(1, { level: "B1" })]));
    await flush();

    expect(open(controller, "C1").id).toBe(uuid(2));
    expect(open(controller, "B1").id).toBe(uuid(1));
  });

  it("HESAP DEĞİŞİMİ: eski denetleyici deactivate olunca onun uçuştaki yanıtı hiçbir durumu yazmaz", async () => {
    const fakes = makeDeps();
    const d = deferred<PassagePage>();
    fakes.fetchPassages.mockReturnValueOnce(d.promise);
    const oldAccount = start(fakes);
    oldAccount.ensureLoaded("B2");
    const before = oldAccount.getSnapshot();

    oldAccount.deactivate(); // userId değişti → hook eskisini bırakıp yenisini kurar
    d.resolve(makePage([makeOpenPassage(1)]));
    await flush();

    expect(oldAccount.getSnapshot()).toBe(before);
    expect(level(oldAccount, "B2")).toEqual({ status: "loading" });
  });

  it("StrictMode çift effect: deactivate→activate sonrası ensureLoaded takılı 'loading'i yeniden çeker", async () => {
    const fakes = makeDeps();
    fakes.fetchPassages.mockReturnValueOnce(new Promise(() => {})).mockResolvedValueOnce(makePage([makeOpenPassage(1)]));
    const controller = start(fakes);
    controller.ensureLoaded("B2");
    controller.deactivate();
    controller.activate();

    controller.ensureLoaded("B2");
    await flush();

    expect(fakes.fetchPassages).toHaveBeenCalledTimes(2);
    expect(level(controller, "B2")?.status).toBe("success");
  });

  it("LOADMORE/REFRESH yarışı: uçuşta başka istek varken ikincisi yok sayılır; çift loadMore tek istek atar", async () => {
    const fakes = makeDeps();
    fakes.fetchPassages.mockResolvedValueOnce(makePage([makeOpenPassage(1)], "c1"));
    const controller = start(fakes);
    controller.ensureLoaded("B2");
    await flush();

    const more = deferred<PassagePage>();
    fakes.fetchPassages.mockReturnValueOnce(more.promise);
    controller.loadMore("B2");
    controller.loadMore("B2");
    controller.refresh("B2");
    expect(fakes.fetchPassages).toHaveBeenCalledTimes(2);
    expect(fakes.fetchPassages).toHaveBeenLastCalledWith("B2", "c1");

    more.resolve(makePage([makeOpenPassage(1), makeOpenPassage(2)], null));
    await flush();
    const state = level(controller, "B2");
    expect(state?.status === "success" && state.items.map((item) => item.id)).toEqual([uuid(1), uuid(2)]);
    controller.loadMore("B2"); // nextCursor null: seviye sonu, istek yok
    expect(fakes.fetchPassages).toHaveBeenCalledTimes(2);
  });

  it("loadMore hatası listeyi korur; refresh hatası listeyi tam ekran hataya çevirmez", async () => {
    const fakes = makeDeps();
    fakes.fetchPassages.mockResolvedValueOnce(makePage([makeOpenPassage(1)], "c1"));
    const controller = start(fakes);
    controller.ensureLoaded("B2");
    await flush();

    fakes.fetchPassages.mockRejectedValueOnce(new PassagesApiError("x", 503));
    controller.loadMore("B2");
    await flush();
    let state = level(controller, "B2");
    expect(state?.status === "success" && state.loadMoreError).toMatch(/yoğun/);

    fakes.fetchPassages.mockRejectedValueOnce(networkError());
    controller.refresh("B2");
    await flush();
    state = level(controller, "B2");
    expect(state?.status).toBe("success");
  });
});

describe("erişim değişimi (satın alma / restore / abonelik kaybı)", () => {
  it("KAZANIM: kilitli liste atılır ve yeniden çekilir; yeni AÇIK veri kazanır, eski kilitli kopya önüne geçmez", async () => {
    const fakes = makeDeps();
    fakes.fetchPassages.mockResolvedValueOnce(makePage([makeLockedPassage(1), makeLockedPassage(2)], "c1"));
    const controller = start(fakes);
    controller.ensureLoaded("B2");
    await flush();

    const refetch = deferred<PassagePage>();
    fakes.fetchPassages.mockReturnValueOnce(refetch.promise);
    controller.onAccessVerified();
    expect(level(controller, "B2")).toEqual({ status: "loading" }); // eski kilitli kartlar anında gitti
    expect(controller.getSnapshot().accessChanged).toBe(true);

    refetch.resolve(makePage([makeOpenPassage(1), makeOpenPassage(2)]));
    await flush();

    expect(open(controller, "B2", 0).access).toBe("open");
    expect(open(controller, "B2", 1).access).toBe("open");
    expect(controller.getSnapshot().accessChanged).toBe(false);
  });

  it("erişim değişiminden ÖNCE yola çıkmış eski sayfa yanıtı (kilitli) sıfırlanmış listeyi geri getirmez", async () => {
    const fakes = makeDeps();
    fakes.fetchPassages.mockResolvedValueOnce(makePage([makeLockedPassage(1)], "c1"));
    const controller = start(fakes);
    controller.ensureLoaded("B2");
    await flush();
    const stale = deferred<PassagePage>();
    fakes.fetchPassages.mockReturnValueOnce(stale.promise);
    controller.loadMore("B2"); // eski (kilitli) cursor ile uçuşta

    fakes.fetchPassages.mockResolvedValueOnce(makePage([makeOpenPassage(1)]));
    controller.onAccessVerified();
    await flush();
    stale.resolve(makePage([makeLockedPassage(1), makeLockedPassage(2)]));
    await flush();

    const state = level(controller, "B2");
    expect(state?.status === "success" && state.items.map((item) => [item.id, item.access])).toEqual([[uuid(1), "open"]]);
  });

  it("KAYIP: açık metin, cevap ve kelime verisi bellekten atılır; yeniden çekimde ücretsiz örnek açık kalır, ücretliler kilitli gelir", async () => {
    const fakes = makeDeps();
    const free = makeOpenPassage(1);
    const paid = makeOpenPassage(2);
    fakes.fetchPassages.mockResolvedValueOnce(makePage([free, paid]));
    const controller = start(fakes);
    controller.ensureLoaded("B2");
    await flush();
    fakes.answerPassageQuestion.mockResolvedValueOnce(makeAnswer(free.questions[0]!, 0, 0));
    await controller.answer(free.questions[0]!.id, free.questions[0]!.options[0]!.id);
    controller.toggleElimination(paid.questions[0]!.id, paid.questions[0]!.options[1]!.id);
    expect(controller.getSnapshot().eliminated.size).toBe(1);

    const refetch = deferred<PassagePage>();
    fakes.fetchPassages.mockReturnValueOnce(refetch.promise);
    controller.onAccessVerified();

    // Sunucu yanıtı gelmeden önce: açık içerik hiçbir yerde kalmadı.
    const snap = controller.getSnapshot();
    expect(snap.byLevel).toEqual({ B2: { status: "loading" } });
    expect(snap.eliminated.size).toBe(0);
    expect(JSON.stringify(snap)).not.toContain("kedi");

    refetch.resolve(makePage([{ ...free }, makeLockedPassage(2)]));
    await flush();
    expect(open(controller, "B2", 0).access).toBe("open"); // ücretsiz örnek kilitlenmedi (kararı sunucu verdi)
    const state = level(controller, "B2");
    expect(state?.status === "success" && state.items[1]!.access).toBe("locked");
  });

  it("deactivate edilmiş denetleyici erişim olayını yok sayar (istek atmaz)", async () => {
    const fakes = makeDeps();
    const controller = new PassagesController(fakes.deps);
    controller.onAccessVerified();
    expect(fakes.fetchPassages).not.toHaveBeenCalled();
  });

  it("403 (cevap): ağ hatası gibi davranmaz; erişim yeniden yüklenir ve ücretli veri atılır", async () => {
    const fakes = makeDeps();
    const passage = makeOpenPassage(1);
    fakes.fetchPassages.mockResolvedValueOnce(makePage([passage]));
    const controller = start(fakes);
    controller.ensureLoaded("B2");
    await flush();
    fakes.answerPassageQuestion.mockRejectedValueOnce(new PassagesApiError("x", 403));
    fakes.fetchPassages.mockResolvedValueOnce(makePage([makeLockedPassage(1)]));

    await controller.answer(passage.questions[0]!.id, passage.questions[0]!.options[0]!.id);
    await flush();

    expect(fakes.answerPassageQuestion).toHaveBeenCalledTimes(1); // 403 yeniden denenmez
    expect(controller.getSnapshot().answerErrors).toEqual({});
    expect(level(controller, "B2")?.status === "success" && (level(controller, "B2") as { items: { access: string }[] }).items[0]!.access).toBe("locked");
  });

  it("403 (kelime kaydı) aynı şekilde erişimi yeniden yükler", async () => {
    const fakes = makeDeps();
    fakes.fetchPassages.mockResolvedValueOnce(makePage([makeOpenPassage(1)]));
    const controller = start(fakes);
    controller.ensureLoaded("B2");
    await flush();
    fakes.savePassageWord.mockRejectedValueOnce(new PassagesApiError("x", 403));
    fakes.fetchPassages.mockResolvedValueOnce(makePage([makeLockedPassage(1)]));

    await controller.saveWord(uuid(1), CAT_WORD_ID);
    await flush();

    expect(fakes.fetchPassages).toHaveBeenCalledTimes(2);
    expect(controller.getSnapshot().wordErrors).toEqual({});
  });
});

describe("cevap gönderimi", () => {
  async function loaded() {
    const fakes = makeDeps();
    const passage = makeOpenPassage(1);
    fakes.fetchPassages.mockResolvedValueOnce(makePage([passage]));
    const controller = start(fakes);
    controller.ensureLoaded("B2");
    await flush();
    const question = passage.questions[0]!;
    return { fakes, controller, question, optionId: question.options[1]!.id };
  }

  it("başarı: sunucunun sonucu aynen uygulanır; gönderim sürerken aynı soruya İKİNCİ gönderim atılmaz (çift dokunma)", async () => {
    const { fakes, controller, question, optionId } = await loaded();
    const d = deferred<ReturnType<typeof makeAnswer>>();
    fakes.answerPassageQuestion.mockReturnValueOnce(d.promise);

    const first = controller.answer(question.id, optionId);
    const second = controller.answer(question.id, question.options[2]!.id);
    expect(controller.getSnapshot().pendingAnswers).toEqual({ [question.id]: optionId });
    d.resolve(makeAnswer(question, 1, 3));
    await Promise.all([first, second]);

    expect(fakes.answerPassageQuestion).toHaveBeenCalledTimes(1);
    expect(open(controller, "B2").questions[0]!.result?.selectedOptionId).toBe(optionId);
    expect(controller.getSnapshot().pendingAnswers).toEqual({});
  });

  it("cevaplanmış soruya ve elenmiş şıkka gönderim yapılmaz", async () => {
    const { fakes, controller, question } = await loaded();
    controller.toggleElimination(question.id, question.options[0]!.id);
    await controller.answer(question.id, question.options[0]!.id);
    expect(fakes.answerPassageQuestion).not.toHaveBeenCalled();

    fakes.answerPassageQuestion.mockResolvedValueOnce(makeAnswer(question, 1, 1));
    await controller.answer(question.id, question.options[1]!.id);
    await controller.answer(question.id, question.options[2]!.id);
    expect(fakes.answerPassageQuestion).toHaveBeenCalledTimes(1);
  });

  it("ZAMAN AŞIMI: cevap sunucuda kayıtlı olabilir → aynı şık bir kez yeniden gönderilir; dönen KAYITLI sonuç uygulanır", async () => {
    const { fakes, controller, question, optionId } = await loaded();
    fakes.answerPassageQuestion.mockRejectedValueOnce(new PassagesApiError("timeout", undefined, true));
    // İlk istek sunucuya ulaşıp kaydedilmişti; ikinci istek ilk cevap kazanır kuralıyla KAYITLI sonucu döndürür.
    fakes.answerPassageQuestion.mockResolvedValueOnce(makeAnswer(question, 1, 2));

    await controller.answer(question.id, optionId);

    expect(fakes.answerPassageQuestion).toHaveBeenCalledTimes(2);
    expect(fakes.answerPassageQuestion).toHaveBeenNthCalledWith(2, question.id, optionId);
    expect(open(controller, "B2").questions[0]!.result?.correct).toBe(false);
    expect(controller.getSnapshot().answerErrors).toEqual({});
  });

  it("5xx ve düz ağ hatası da belirsiz sayılır (yeniden gönderilir); 400 kesin hatadır (yeniden gönderilmez)", async () => {
    for (const [error, calls] of [[new PassagesApiError("x", 503), 2], [networkError(), 2], [new PassagesApiError("x", 400), 1]] as const) {
      const { fakes, controller, question, optionId } = await loaded();
      fakes.answerPassageQuestion.mockRejectedValue(error);
      fakes.fetchPassages.mockResolvedValue(makePage([makeOpenPassage(1)]));
      await controller.answer(question.id, optionId);
      expect(fakes.answerPassageQuestion).toHaveBeenCalledTimes(calls);
    }
  });

  it("yeniden gönderim de belirsiz kalırsa: 'emin değiliz' uyarısı + yeniden-okumayla kayıtlı cevap uzlaştırılır (liste/cursor korunur)", async () => {
    const { fakes, controller, question, optionId } = await loaded();
    fakes.answerPassageQuestion.mockRejectedValue(new PassagesApiError("timeout", undefined, true));
    const recorded = makeOpenPassage(1);
    recorded.questions[0] = { ...question, result: makeAnswer(question, 1, 1) }; // sunucu aslında kaydetmişti
    fakes.fetchPassages.mockResolvedValueOnce(makePage([recorded]));

    await controller.answer(question.id, optionId);
    await flush();

    expect(open(controller, "B2").questions[0]!.result?.selectedOptionId).toBe(optionId);
    expect(controller.getSnapshot().answerErrors).toEqual({}); // kayıtlı sonuç bulununca uyarı kalktı
  });

  it("uzlaştırmada kayıt bulunamazsa uyarı kalır ve kullanıcı tekrar dokunabilir (idempotent yeniden gönderim)", async () => {
    const { fakes, controller, question, optionId } = await loaded();
    fakes.answerPassageQuestion.mockRejectedValue(networkError());
    fakes.fetchPassages.mockResolvedValue(makePage([makeOpenPassage(1)]));

    await controller.answer(question.id, optionId);
    await flush();
    expect(controller.getSnapshot().answerErrors[question.id]).toBe(ANSWER_UNCERTAIN_MESSAGE);

    fakes.answerPassageQuestion.mockReset().mockResolvedValueOnce(makeAnswer(question, 1, 1));
    await controller.answer(question.id, optionId);
    expect(open(controller, "B2").questions[0]!.result).not.toBeNull();
    expect(controller.getSnapshot().answerErrors).toEqual({});
  });

  it("kesin hata (400) genel hata mesajı verir, belirsizlik uyarısı vermez", async () => {
    const { fakes, controller, question, optionId } = await loaded();
    fakes.answerPassageQuestion.mockRejectedValueOnce(new PassagesApiError("x", 400));
    await controller.answer(question.id, optionId);
    expect(controller.getSnapshot().answerErrors[question.id]).toBe(ANSWER_FAILED_MESSAGE);
  });

  it("gönderim sürerken hesap/erişim değişirse eski cevabın sonucu yeni duruma yazılmaz", async () => {
    const { fakes, controller, question, optionId } = await loaded();
    const d = deferred<ReturnType<typeof makeAnswer>>();
    fakes.answerPassageQuestion.mockReturnValueOnce(d.promise);
    const pending = controller.answer(question.id, optionId);

    fakes.fetchPassages.mockResolvedValueOnce(makePage([makeOpenPassage(1)]));
    controller.onAccessVerified();
    await flush();
    d.resolve(makeAnswer(question, 1, 1));
    await pending;

    expect(open(controller, "B2").questions[0]!.result).toBeNull(); // sonuç sunucudan yeniden okunacak veriye ait değil
    expect(controller.getSnapshot().pendingAnswers).toEqual({});
  });
});

describe("kelime kaydı (sourcePassageId sözleşmesi)", () => {
  it("dokunulan METNİN id'si gönderilir; başarıda kelime TÜM metin/geçişlerde kayıtlı görünür", async () => {
    const fakes = makeDeps();
    fakes.fetchPassages.mockResolvedValueOnce(makePage([makeOpenPassage(1), makeOpenPassage(2)]));
    const controller = start(fakes);
    controller.ensureLoaded("B2");
    await flush();

    await controller.saveWord(uuid(2), CAT_WORD_ID); // kullanıcı 2. metindeki "cat"e dokundu

    expect(fakes.savePassageWord).toHaveBeenCalledWith(CAT_WORD_ID, uuid(2));
    for (const index of [0, 1]) {
      expect(open(controller, "B2", index).paragraphs[0]![1]!.word?.saved).toBe(true);
    }
    await controller.unsaveWord(CAT_WORD_ID);
    expect(open(controller, "B2", 0).paragraphs[0]![1]!.word?.saved).toBe(false);
  });

  it("kelime o metinde yoksa / metin kilitliyse istek ATILMAZ (sunucu 400/403 verirdi)", async () => {
    const fakes = makeDeps();
    fakes.fetchPassages.mockResolvedValueOnce(makePage([makeOpenPassage(1), makeLockedPassage(2)]));
    const controller = start(fakes);
    controller.ensureLoaded("B2");
    await flush();

    await controller.saveWord(uuid(1), uuid(9999));
    await controller.saveWord(uuid(2), CAT_WORD_ID);
    await controller.saveWord(uuid(777), CAT_WORD_ID);

    expect(fakes.savePassageWord).not.toHaveBeenCalled();
  });

  it("çift dokunma: kaydetme sürerken aynı kelimeye ikinci istek atılmaz; hata mesajı ve yeniden deneme", async () => {
    const fakes = makeDeps();
    fakes.fetchPassages.mockResolvedValueOnce(makePage([makeOpenPassage(1)]));
    const controller = start(fakes);
    controller.ensureLoaded("B2");
    await flush();
    const d = deferred<unknown>();
    fakes.savePassageWord.mockReturnValueOnce(d.promise);

    const first = controller.saveWord(uuid(1), CAT_WORD_ID);
    const second = controller.saveWord(uuid(1), CAT_WORD_ID);
    expect(controller.getSnapshot().pendingWords.has(CAT_WORD_ID)).toBe(true);
    d.reject(networkError());
    await Promise.all([first, second]);

    expect(fakes.savePassageWord).toHaveBeenCalledTimes(1);
    expect(controller.getSnapshot().wordErrors[CAT_WORD_ID]).toBeDefined();
    expect(controller.getSnapshot().pendingWords.size).toBe(0);
    expect(open(controller, "B2").paragraphs[0]![1]!.word?.saved).toBe(false);

    await controller.saveWord(uuid(1), CAT_WORD_ID);
    expect(open(controller, "B2").paragraphs[0]![1]!.word?.saved).toBe(true);
    expect(controller.getSnapshot().wordErrors).toEqual({});
  });
});
