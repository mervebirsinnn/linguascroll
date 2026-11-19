import { toWordSheetEntry } from "./passage-word-entry";
import { CAT_SPAN_1, CAT_SPAN_2, CAT_WORD_ID, makeOpenPassage, uuid } from "./passages-test-helpers";

jest.mock("../identity/auth-headers", () => ({ authHeaders: () => Promise.resolve({}) }));

describe("toWordSheetEntry", () => {
  const passage = makeOpenPassage(1);
  const runs = passage.paragraphs[0]!;

  it("düz metin run'ı için null döner", () => {
    expect(toWordSheetEntry(passage.id, runs[0]!)).toBeNull();
  });

  it("dokunulan GEÇİŞİN kimliğini, cümlesini ve anlamını taşır; başlık metinde göründüğü hâlidir", () => {
    expect(toWordSheetEntry(passage.id, runs[1]!)).toEqual({
      wordId: CAT_WORD_ID,
      spanId: CAT_SPAN_1,
      passageId: uuid(1),
      displayText: "cat",
      gloss: "kedi",
      sentence: "A cat sat.",
      saved: false,
    });
    // Aynı kelimenin ikinci geçişi: farklı span ve KENDİ cümlesi.
    expect(toWordSheetEntry(passage.id, runs[3]!)).toMatchObject({ spanId: CAT_SPAN_2, sentence: "The cat left." });
  });

  it("görünen ifade sözlük biçiminden farklıysa yüzey metni korunur ve lemma/dil ALANI UYDURULMAZ", () => {
    const inflected = {
      text: "accounted for",
      word: { wordId: uuid(700), gloss: "açıklamak", saved: true, spanId: uuid(701), contextSentence: "Results accounted for the gap." },
    };
    const entry = toWordSheetEntry(passage.id, inflected);

    expect(entry?.displayText).toBe("accounted for");
    expect(entry).not.toHaveProperty("lemma");
    expect(entry).not.toHaveProperty("language");
    expect(Object.keys(entry!).sort()).toEqual(["displayText", "gloss", "passageId", "saved", "sentence", "spanId", "wordId"]);
    expect(entry?.saved).toBe(true);
  });
});
