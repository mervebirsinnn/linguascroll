import { computePassageContentHash } from "./passage-pack";
import { validatePackSet, validatePassagePack } from "./passage-pack-validator";
import { FIXTURE_PACK_PARAGRAPH, validPack } from "./passage-pack-fixtures";

const codes = (input: unknown): string[] => validatePassagePack(input).issues.map((issue) => issue.code);
const clone = () => structuredClone(validPack());

describe("validatePassagePack — pozitif", () => {
  it("geçerli paket: sorun yok ve pack döner", () => {
    const result = validatePassagePack(validPack());
    expect(result.issues).toEqual([]);
    expect(result.pack?.slug).toBe("fixture-lighthouse");
  });

  it("kaynaklı iddia listesi varsa noFactualClaims olmadan da geçer", () => {
    const pack = clone();
    pack.editorial = { original: true, sources: [{ claim: "iddia", source: "kaynak", checkedOn: "2026-11-18" }] };
    expect(codes(pack)).toEqual([]);
  });

  it("kaynak alıntısını özgün beyanı olmadan aynı kalite kapısından geçirir", () => {
    const excerpt = {
      ...validPack(),
      editorial: {
        original: false,
        sourceType: "verbatim-excerpt",
        sources: [{ claim: "Kaynak metindeki görüş", source: "Kullanıcının sağladığı PDF, s. 1", checkedOn: "2026-11-19" }],
      },
    };
    expect(codes(excerpt)).toEqual([]);
    expect(validatePassagePack(excerpt).pack?.editorial.original).toBe(false);
    expect(codes({ ...excerpt, words: [] })).toContain("schema");
    const uncovered = structuredClone(excerpt);
    uncovered.words = uncovered.words.filter((word) => word.lemma !== "the");
    expect(codes(uncovered)).toContain("word-occurrence-uncovered");
  });

  it("alıntıda kaynak ve açık kaynak türü zorunlu; noFactualClaims bunları atlamaz", () => {
    const base = { original: false, sourceType: "verbatim-excerpt", sources: [] };
    expect(codes({ ...validPack(), editorial: base })).toContain("schema");
    expect(codes({ ...validPack(), editorial: { ...base, noFactualClaims: true } })).toContain("schema");
    const sources = [{ claim: "iddia", source: "PDF", checkedOn: "2026-11-19" }];
    expect(codes({ ...validPack(), editorial: { original: false, sources } })).toContain("schema");
    expect(codes({ ...validPack(), editorial: { ...base, sources, sourceType: "unknown" } })).toContain("schema");
  });
});

describe("validatePassagePack — her kural için bir negatif test", () => {
  it("işlevsel sözcükler ve AYNI kelimenin her geçişi kapsanmalı", () => {
    const missingFunctionWord = clone();
    missingFunctionWord.words = missingFunctionWord.words.filter((word) => word.lemma !== "the");
    expect(codes(missingFunctionWord)).toContain("word-occurrence-uncovered");
    const missingRepeat = clone();
    const repeated = missingRepeat.words.find((word) => word.lemma === "the")!;
    repeated.spans.pop();
    const result = validatePassagePack(missingRepeat);
    expect(result.pack).toBeNull();
    expect(result.issues.filter((entry) => entry.code === "word-occurrence-uncovered")).toHaveLength(1);
  });

  it("çok sözcüklü ifade kapsadığı sözcükleri karşılar; parçalı kelime kapsam sayılmaz", () => {
    const phrase = clone();
    phrase.words = phrase.words.filter((word) => word.lemma !== "old" && word.lemma !== "lighthouse");
    const start = FIXTURE_PACK_PARAGRAPH.indexOf("old lighthouse");
    phrase.words.push({ lemma: "old lighthouse", gloss: "eski deniz feneri", spans: [{ paragraphIndex: 0, start, end: start + 14, surface: "old lighthouse", contextSentence: "The old lighthouse stood above the harbour." }] });
    expect(codes(phrase)).toEqual([]);
    const partial = clone();
    partial.words[0]!.spans[0]!.end--;
    partial.words[0]!.spans[0]!.surface = "lighthous";
    expect(codes(partial)).toContain("word-occurrence-uncovered");
  });

  it("kesme işareti tek token; tire ayrık token, noktalama ve rakamlar kapsam dışı", () => {
    const paragraph = "Don't re-read 2026.";
    const pack = validPack({ paragraphs: [paragraph], words: [
      { lemma: "don't", gloss: "yapma", spans: [{ paragraphIndex: 0, start: 0, end: 5, surface: "Don't", contextSentence: paragraph }] },
      { lemma: "re-read", gloss: "yeniden oku", spans: [{ paragraphIndex: 0, start: 6, end: 13, surface: "re-read", contextSentence: paragraph }] },
    ] });
    pack.questions.forEach((question) => { question.evidence = { paragraphIndex: 0, start: 0, end: paragraph.length }; });
    expect(codes(pack)).toEqual([]);
  });

  it("şema: B1..C2 dışı seviye, 4 olmayan soru sayısı, geçersiz tuzak türü", () => {
    expect(codes({ ...validPack(), level: "A1" })).toContain("schema");
    expect(codes({ ...validPack(), questions: validPack().questions.slice(0, 3) })).toContain("schema");
    const pack = clone();
    pack.questions[0]!.options[1]!.trapType = "extrem" as never;
    expect(codes(pack)).toContain("schema");
  });

  it("tam 1 doğru şık: sıfır ve iki doğru", () => {
    const none = clone();
    none.questions[0]!.options.forEach((option) => (option.isCorrect = false));
    expect(codes(none)).toContain("correct-count");
    const two = clone();
    two.questions[0]!.options[1]!.isCorrect = true;
    expect(codes(two)).toContain("correct-count");
  });

  it("soru başına 4 şık", () => {
    const pack = clone();
    pack.questions[0]!.options.pop();
    expect(codes(pack)).toContain("option-count");
  });

  it("yanlış şıkta tuzak türü zorunlu; doğru şıkta zorunlu değil", () => {
    const pack = clone();
    pack.questions[0]!.options[1]!.trapType = null;
    expect(codes(pack)).toContain("trap-type-missing");
    expect(codes(clone())).not.toContain("trap-type-missing"); // doğru şıklar null
  });

  it("her şıkta gerekçe zorunlu (boş açıklama şemada reddedilir)", () => {
    const pack = clone();
    pack.questions[2]!.options[0]!.explanation = "   ";
    expect(codes(pack)).toContain("schema");
  });

  it("dayanak aralığı metin dışında", () => {
    const pack = clone();
    pack.questions[0]!.evidence = { paragraphIndex: 0, start: 0, end: FIXTURE_PACK_PARAGRAPH.length + 5 };
    expect(codes(pack)).toContain("evidence-out-of-range");
    const missing = clone();
    missing.questions[1]!.evidence = { paragraphIndex: 4, start: 0, end: 3 };
    expect(codes(missing)).toContain("evidence-out-of-range");
  });

  it("doğru cevap konumu dengesiz: dört soruda hep aynı konum", () => {
    const pack = clone();
    for (const q of pack.questions) q.options.forEach((option, index) => { option.isCorrect = index === 0; option.trapType = index === 0 ? null : "copy"; });
    expect(codes(pack)).toContain("correct-position-skew");
  });

  it("şık uzunluk farkı eşiği: doğru şık diğerlerinin 3 katı", () => {
    const pack = clone();
    pack.questions[0]!.options[0]!.text = "x".repeat(100);
    pack.questions[0]!.options[1]!.text = "kısa";
    expect(codes(pack)).toContain("option-length-ratio");
  });

  it("tekrar eden soru/şık anahtarı ve aynı şık metni", () => {
    const pack = clone();
    pack.questions[1]!.key = pack.questions[0]!.key;
    pack.questions[0]!.options[1]!.key = pack.questions[0]!.options[0]!.key;
    pack.questions[0]!.options[2]!.text = `${pack.questions[0]!.options[3]!.text} `; // boşluk farkı yeni şık sayılmaz
    const found = codes(pack);
    expect(found).toEqual(expect.arrayContaining(["question-key-duplicate", "option-key-duplicate", "option-text-duplicate"]));
  });

  it("span: surface metinle uyuşmuyor, aralık dışı, olmayan paragraf", () => {
    const mismatch = clone();
    mismatch.words[0]!.spans[0]!.surface = "lighthous";
    expect(codes(mismatch)).toContain("span-surface-mismatch");
    const outside = clone();
    outside.words[0]!.spans[0] = { paragraphIndex: 0, start: 100, end: 500, surface: "x", contextSentence: "x" };
    expect(codes(outside)).toContain("span-out-of-range");
    const noParagraph = clone();
    noParagraph.words[0]!.spans[0]!.paragraphIndex = 3;
    expect(codes(noParagraph)).toContain("span-paragraph-missing");
  });

  it("span: iki kelimenin aralıkları çakışıyor (sunucunun kullandığı buildParagraphRuns ile)", () => {
    const pack = clone();
    const keeper = pack.words[1]!;
    const lighthouse = pack.words[0]!.spans[0]!;
    keeper.spans = [{ ...lighthouse, surface: lighthouse.surface }]; // aynı aralık, aynı surface
    expect(codes(pack)).toContain("span-overlap");
  });

  it("her kelimenin en az bir span'ı olmalı (şema)", () => {
    const pack = clone();
    pack.words[0]!.spans = [];
    expect(codes(pack)).toContain("schema");
  });

  it("her GEÇİŞİN contextSentence'ı o geçişi içeren metin parçası olmalı (başka cümle ya da uydurma reddedilir)", () => {
    const pack = clone();
    pack.words[0]!.spans[0]!.contextSentence = "The lamp guided ships safely home.";
    expect(codes(pack)).toContain("context-sentence-mismatch");
    const invented = clone();
    invented.words[0]!.spans[0]!.contextSentence = "Bu cümle metinde yok.";
    expect(codes(invented)).toContain("context-sentence-mismatch");
  });

  it("lemma normalize olmalı (kopya kelime defteri girdisini önler); bağlam cümlesi kelimeden uzun olmalı", () => {
    const upper = clone();
    upper.words[0]!.lemma = "Lighthouse";
    expect(codes(upper)).toContain("lemma-not-normalized");
    const bare = clone();
    bare.words[0]!.spans[0]!.contextSentence = "lighthouse";
    expect(codes(bare)).toContain("context-sentence-too-short");
  });

  it("aynı (lemma, anlam) iki kez", () => {
    const pack = clone();
    pack.words.push(structuredClone(pack.words[0]!));
    expect(codes(pack)).toContain("word-duplicate");
  });

  it("paragraf: boş ve baş/son boşluklu", () => {
    const empty = clone();
    empty.paragraphs = ["   "];
    expect(codes(empty)).toContain("paragraph-empty");
    const untrimmed = clone();
    untrimmed.paragraphs = [` ${FIXTURE_PACK_PARAGRAPH}`];
    expect(codes(untrimmed)).toContain("paragraph-untrimmed");
  });

  it("editoryal: özgün içerikte kaynak ya da noFactualClaims, alıntıda açık kaynak türü zorunlu", () => {
    const pack = clone();
    pack.editorial = { original: true, sources: [] };
    expect(codes(pack)).toContain("editorial-sources-missing");
    expect(codes({ ...validPack(), editorial: { original: false, sources: [] } })).toContain("schema");
  });

  it("birden fazla sorunu tek turda toplar (ilk hatada durmaz)", () => {
    const pack = clone();
    pack.questions[0]!.options[1]!.trapType = null;
    pack.editorial = { original: true, sources: [] };
    expect(codes(pack)).toEqual(expect.arrayContaining(["trap-type-missing", "editorial-sources-missing"]));
  });
});

describe("validatePackSet", () => {
  it("tekrar eden slug ve (seviye, sıra) çakışması", () => {
    const a = validPack();
    const b = validPack({ slug: "other" });
    const found = validatePackSet([a, b]).map((issue) => issue.code);
    expect(found).toContain("set-sort-order-duplicate");
    expect(validatePackSet([a, validPack()]).map((issue) => issue.code)).toContain("set-slug-duplicate");
  });

  it("ücretsiz örnek: yalnız B1/B2 ve seviye başına bir tane", () => {
    expect(validatePackSet([validPack({ level: "C1", isFreeSample: true })]).map((issue) => issue.code)).toContain("free-sample-level");
    const two = [validPack({ slug: "a", isFreeSample: true }), validPack({ slug: "b", sortOrder: 2, isFreeSample: true })];
    expect(validatePackSet(two).map((issue) => issue.code)).toContain("free-sample-duplicate");
    expect(validatePackSet([validPack({ isFreeSample: true }), validPack({ slug: "c", level: "B1", isFreeSample: true })])).toEqual([]);
  });
});

describe("computePassageContentHash", () => {
  it("JSON anahtar sırası ve kelime/span sırasından bağımsız, ama saklanan her alana duyarlı", () => {
    const base = validPack();
    const reordered = { ...validPack(), words: [...validPack().words].reverse() };
    expect(computePassageContentHash(reordered)).toBe(computePassageContentHash(base));
    expect(computePassageContentHash(JSON.parse(JSON.stringify(base)))).toBe(computePassageContentHash(base));

    const changedTitle = validPack({ title: "Başka" });
    const changedGloss = clone();
    changedGloss.words[0]!.gloss = "fener";
    const changedExplanation = clone();
    changedExplanation.questions[3]!.options[0]!.explanation = "Başka gerekçe";
    for (const changed of [changedTitle, changedGloss, changedExplanation]) {
      expect(computePassageContentHash(changed)).not.toBe(computePassageContentHash(base));
    }
  });

  it("sortOrder/isFreeSample/editorial hash'e girmez (yayıncıda ayrıca karşılaştırılır / saklanmaz)", () => {
    expect(computePassageContentHash(validPack({ sortOrder: 99, isFreeSample: true }))).toBe(computePassageContentHash(validPack()));
  });
});

describe("cümle çevirisi (contextSentenceTr)", () => {
  const translate = (pack: ReturnType<typeof clone>, only?: (sentence: string) => boolean) => {
    for (const word of pack.words) for (const span of word.spans) if (!only || only(span.contextSentence)) span.contextSentenceTr = `TR: ${span.contextSentence}`;
    return pack;
  };

  it("her geçişte çeviri varsa paket geçer; hiçbirinde yoksa da geçer (çevirisiz metinler bozulmaz)", () => {
    expect(codes(translate(clone()))).toEqual([]);
    expect(codes(clone())).toEqual([]);
  });

  it("yarım çeviri reddedilir: kimi geçişte var kimi geçişte yok", () => {
    const half = translate(clone(), (sentence) => sentence.startsWith("The old"));
    const result = codes(half);
    expect(result).toContain("sentence-translation-incomplete");
  });

  it("aynı İngilizce cümle iki farklı çeviriyle yazılamaz", () => {
    const pack = translate(clone());
    const spans = pack.words.flatMap((word) => word.spans).filter((span) => span.contextSentence === pack.words[0]!.spans[0]!.contextSentence);
    expect(spans.length).toBeGreaterThan(1);
    spans[1]!.contextSentenceTr = "TR: başka bir çeviri";
    expect(codes(pack)).toContain("sentence-translation-inconsistent");
  });

  it("boş çeviri şema hatasıdır", () => {
    const pack = translate(clone());
    pack.words[0]!.spans[0]!.contextSentenceTr = "   ";
    expect(codes(pack)).toContain("schema");
  });

  it("hash: çeviri eklenince değişir, çeviri yoksa eski hash'le bit bit aynı kalır", () => {
    const base = validPack();
    const translated = translate(clone());
    expect(computePassageContentHash(translated)).not.toBe(computePassageContentHash(base));
    const stripped = structuredClone(translated);
    for (const word of stripped.words) for (const span of word.spans) delete span.contextSentenceTr;
    expect(computePassageContentHash(stripped)).toBe(computePassageContentHash(base));
  });
});
