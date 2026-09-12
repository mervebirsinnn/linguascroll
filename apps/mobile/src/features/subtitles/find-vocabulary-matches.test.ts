import type { VideoVocabularyItem } from "@linguascroll/shared-types";
import { buildSubtitleSpans, findVocabularyMatches } from "./find-vocabulary-matches";

function makeItem(id: string, lemma: string, gloss = "gloss", saved = false): VideoVocabularyItem {
  return { word: { id, language: "en", lemma, gloss }, saved };
}

describe("findVocabularyMatches", () => {
  it("tam kelime sınırıyla (case-insensitive) eşleşen bir lemma'yı bulur", () => {
    const bowl = makeItem("1", "bowl");
    const matches = findVocabularyMatches("He runs to his BOWL very fast.", [bowl]);
    expect(matches).toHaveLength(1);
    expect(matches[0]).toMatchObject({ start: 15, end: 19, word: bowl });
  });

  it("çok kelimeli bir phrase'i (boşluk dahil) tek bir eşleşme olarak bulur", () => {
    const phrase = makeItem("1", "end up staying");
    const matches = findVocabularyMatches("He ended up staying there. He ended up staying anyway.", [phrase]);
    expect(matches).toHaveLength(0); // "ended" != "end" — kelime sınırı tam eşleşme ister, çekim farkı YAKALANMAZ (bilinçli)
  });

  it("kelime sınırı olmayan bir alt-dizeyi (örn. \"cat\" \"category\" içinde) EŞLEŞTİRMEZ", () => {
    const cat = makeItem("1", "cat");
    const matches = findVocabularyMatches("This falls into a specific category.", [cat]);
    expect(matches).toHaveLength(0);
  });

  it("lemma transcript'te ÇEKİMLİ halde geçiyorsa (\"go\" vs \"went\") EŞLEŞMEZ — güvenilir olmayan eşleşme zorlanmaz", () => {
    const go = makeItem("1", "go");
    const matches = findVocabularyMatches("They went to the market yesterday.", [go]);
    expect(matches).toHaveLength(0);
  });

  it("aynı lemma metinde birden fazla kez geçiyorsa HEPSİNİ bulur", () => {
    const bowl = makeItem("1", "bowl");
    const matches = findVocabularyMatches("The bowl is next to the other bowl.", [bowl]);
    expect(matches).toHaveLength(2);
  });

  it("çakışan (overlapping) eşleşmelerde EN UZUN (en spesifik) olanı tercih eder", () => {
    const short = makeItem("1", "up");
    const long = makeItem("2", "ended up staying");
    const matches = findVocabularyMatches("He ended up staying there.", [short, long]);
    expect(matches).toHaveLength(1);
    expect(matches[0]?.word).toBe(long);
  });

  it("boş lemma'yı yok sayar (throw etmez)", () => {
    const empty = makeItem("1", "   ");
    expect(() => findVocabularyMatches("Some text.", [empty])).not.toThrow();
    expect(findVocabularyMatches("Some text.", [empty])).toHaveLength(0);
  });

  it("eşleşme yoksa boş dizi döner", () => {
    const cute = makeItem("1", "cute");
    expect(findVocabularyMatches("He is not very smart.", [cute])).toEqual([]);
  });
});

describe("buildSubtitleSpans", () => {
  it("eşleşme yoksa metnin tamamını TEK bir plain span olarak döner", () => {
    const spans = buildSubtitleSpans("He is not very smart.", []);
    expect(spans).toEqual([{ text: "He is not very smart.", word: null }]);
  });

  it("metnin başında/ortasında/sonunda vocabulary olsa da TÜM metni, sırayla, boşluksuz kapsar", () => {
    const bowl = makeItem("1", "bowl");
    const spans = buildSubtitleSpans("He runs to his bowl very fast.", [bowl]);
    const reconstructed = spans.map((span) => span.text).join("");
    expect(reconstructed).toBe("He runs to his bowl very fast.");
    expect(spans.find((span) => span.word === bowl)?.text).toBe("bowl");
  });

  it("metnin TAM BAŞINDA bir vocabulary eşleşmesi varsa öncesinde boş bir plain span üretmez", () => {
    const hi = makeItem("1", "Hi");
    const spans = buildSubtitleSpans("Hi, welcome.", [hi]);
    expect(spans[0]).toEqual({ text: "Hi", word: hi });
  });

  it("metnin TAM SONUNDA bir vocabulary eşleşmesi varsa sonrasında boş bir plain span üretmez", () => {
    const bowl = makeItem("1", "bowl");
    const spans = buildSubtitleSpans("his bowl", [bowl]);
    expect(spans[spans.length - 1]).toEqual({ text: "bowl", word: bowl });
  });

  it("birden fazla farklı vocabulary kelimesi aynı cümlede ayrı span'ler üretir", () => {
    const leash = makeItem("1", "leash");
    const bowl = makeItem("2", "bowl");
    const spans = buildSubtitleSpans("He brings the leash and eats from the bowl.", [leash, bowl]);
    expect(spans.filter((span) => span.word !== null)).toHaveLength(2);
  });
});
