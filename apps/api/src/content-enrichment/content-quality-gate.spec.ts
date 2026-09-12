import { evaluateContentQuality, type QualityCheckContent } from "./content-quality-gate";

/**
 * Baseline: hiçbir kuralı tetiklemeyen, gerçekçi bir LinguaScroll içeriği.
 * Testler bunun ÜZERİNE tek bir alanı bozarak (override) belirli bir kuralı
 * izole ediyor — "clean content → pass" testinin kendisi de bu fixture'ın
 * GERÇEKTEN temiz olduğunu kanıtlıyor.
 */
function cleanContent(): QualityCheckContent {
  return {
    contentId: "x",
    muxAssetId: "local-x",
    sourceFile: "/tmp/x.mp4",
    durationMs: 5000,
    topic: "humor",
    cefrLevel: "A1",
    segments: [
      { ordinal: 1, startMs: 0, endMs: 1000, text: "He ended up staying there.", englishExplanation: "He stayed longer than he had planned.", turkishExplanation: "Planladığından daha uzun süre kaldı." },
      { ordinal: 2, startMs: 1000, endMs: 2000, text: "She loves reading books.", englishExplanation: "She enjoys reading very much.", turkishExplanation: "Okumaktan çok hoşlanıyor." },
      { ordinal: 3, startMs: 2000, endMs: 3000, text: "They went to the market yesterday.", englishExplanation: "They visited the market the day before.", turkishExplanation: "Bir önceki gün pazara gittiler." },
    ],
    vocabulary: [{ lemma: "market", gloss: "pazar" }],
    learningPoints: [
      {
        segmentOrdinal: 1,
        type: "phrase",
        expression: "ended up staying",
        englishExplanation: "Describes an unplanned result.",
        turkishExplanation: "Planlanmamış bir sonucu anlatır.",
        exampleEn: null,
        exampleTr: null,
      },
    ],
    quiz: {
      segmentOrdinal: 2,
      question: "What does she love doing?",
      options: [
        { text: "Reading books", isCorrect: true },
        { text: "Cooking food", isCorrect: false },
        { text: "Playing games", isCorrect: false },
        { text: "Watching movies", isCorrect: false },
      ],
    },
  };
}

describe("evaluateContentQuality — clean content", () => {
  it("gerçekçi, temiz bir içerik için pass döner, hiç issue üretmez", () => {
    const report = evaluateContentQuality(cleanContent());
    expect(report).toEqual({ status: "pass", issues: [] });
  });
});

describe("evaluateContentQuality — transcript quality (reject)", () => {
  it("emptyTranscript: boş segments dizisi → reject", () => {
    const report = evaluateContentQuality({ ...cleanContent(), segments: [] });
    expect(report.status).toBe("reject");
    expect(report.issues.map((i) => i.code)).toContain("emptyTranscript");
  });

  it("whitespaceOnlySegment: sadece boşluktan oluşan segment metni → reject (z.string().min(1) bunu YAKALAMIYOR)", () => {
    const content = cleanContent();
    content.segments[0]!.text = "   ";
    const report = evaluateContentQuality(content);
    expect(report.status).toBe("reject");
    expect(report.issues.map((i) => i.code)).toContain("whitespaceOnlySegment");
  });

  it("overlappingSegments: bir segment önceki segment bitmeden başlıyor → reject", () => {
    const content = cleanContent();
    content.segments[1]!.startMs = 500; // segment 1 endMs=1000, segment 2 artık 500'de başlıyor
    const report = evaluateContentQuality(content);
    expect(report.status).toBe("reject");
    expect(report.issues.map((i) => i.code)).toContain("overlappingSegments");
  });
});

describe("evaluateContentQuality — transcript quality (needsReview)", () => {
  it("duplicateAdjacentSegment: bitişik iki segment birebir aynı metne sahip → needsReview/warning", () => {
    const content = cleanContent();
    content.segments[1]!.text = content.segments[0]!.text;
    const report = evaluateContentQuality(content);
    expect(report.status).toBe("needsReview");
    const issue = report.issues.find((i) => i.code === "duplicateAdjacentSegment");
    expect(issue?.severity).toBe("warning");
  });

  it("thinTranscript: 3'ten az segment → needsReview", () => {
    const content = cleanContent();
    content.segments = content.segments.slice(0, 2);
    // İlgisiz ordinal referanslarını (quiz segment 2, learningPoint segment 1) koruyoruz.
    const report = evaluateContentQuality(content);
    expect(report.status).toBe("needsReview");
    expect(report.issues.map((i) => i.code)).toContain("thinTranscript");
  });
});

describe("evaluateContentQuality — explanation quality", () => {
  it("emptyExplanation: EN/TR açıklaması sadece boşluk → reject", () => {
    const content = cleanContent();
    content.segments[0]!.englishExplanation = "   ";
    const report = evaluateContentQuality(content);
    expect(report.status).toBe("reject");
    expect(report.issues.map((i) => i.code)).toContain("emptyExplanation");
  });

  it("explanationMatchesTranscriptVerbatim: açıklama transcript metniyle birebir aynı → needsReview", () => {
    const content = cleanContent();
    content.segments[0]!.englishExplanation = content.segments[0]!.text;
    const report = evaluateContentQuality(content);
    expect(report.status).toBe("needsReview");
    expect(report.issues.map((i) => i.code)).toContain("explanationMatchesTranscriptVerbatim");
  });

  it("explanationTooLong: 400 karakterden uzun açıklama → needsReview", () => {
    const content = cleanContent();
    content.segments[0]!.englishExplanation = "word ".repeat(90).trim();
    const report = evaluateContentQuality(content);
    expect(report.status).toBe("needsReview");
    expect(report.issues.map((i) => i.code)).toContain("explanationTooLong");
  });

  it("explanationDisproportionateForTrivialSegment: çok kısa (\"Hi.\") bir segment için orantısız uzun açıklama → needsReview", () => {
    const content = cleanContent();
    content.segments[0]!.text = "Hi.";
    content.segments[0]!.englishExplanation = "x".repeat(200); // 150-400 arası — SADECE bu kural tetiklenir, explanationTooLong değil
    const report = evaluateContentQuality(content);
    expect(report.status).toBe("needsReview");
    expect(report.issues.map((i) => i.code)).toContain("explanationDisproportionateForTrivialSegment");
    expect(report.issues.map((i) => i.code)).not.toContain("explanationTooLong");
  });

  it("explanationLanguagesIdentical: EN ve TR açıklama birebir aynı string → needsReview (gerçek dil tespiti YOK, sadece normalize edilip karşılaştırma)", () => {
    const content = cleanContent();
    content.segments[0]!.turkishExplanation = content.segments[0]!.englishExplanation;
    const report = evaluateContentQuality(content);
    expect(report.status).toBe("needsReview");
    expect(report.issues.map((i) => i.code)).toContain("explanationLanguagesIdentical");
  });
});

describe("evaluateContentQuality — learning point quality", () => {
  it("duplicateLearningPoint: aynı expression birden fazla kez → needsReview", () => {
    const content = cleanContent();
    content.learningPoints = [content.learningPoints[0]!, { ...content.learningPoints[0]!, segmentOrdinal: 2 }];
    const report = evaluateContentQuality(content);
    expect(report.status).toBe("needsReview");
    expect(report.issues.map((i) => i.code)).toContain("duplicateLearningPoint");
  });

  it("tooManyLearningPointsForSegment: aynı segmente 3'ten fazla learning point → needsReview", () => {
    const content = cleanContent();
    content.learningPoints = [
      { ...content.learningPoints[0]!, expression: "ended up" },
      { ...content.learningPoints[0]!, expression: "staying there" },
      { ...content.learningPoints[0]!, expression: "he ended" },
    ];
    const report = evaluateContentQuality(content);
    expect(report.status).toBe("needsReview");
    expect(report.issues.map((i) => i.code)).toContain("tooManyLearningPointsForSegment");
  });

  it("learningPointOnTrivialSegment: çok kısa (\"Hi.\") bir segmente learning point → needsReview", () => {
    const content = cleanContent();
    content.segments[0]!.text = "Hi.";
    content.learningPoints[0]!.expression = "Hi";
    const report = evaluateContentQuality(content);
    expect(report.status).toBe("needsReview");
    expect(report.issues.map((i) => i.code)).toContain("learningPointOnTrivialSegment");
  });

  /**
   * KULLANICI KARARI — false-positive riski BİLİNÇLİ kabul ediliyor: pedagojik
   * notation ("end up + V-ing", mastar/başlangıç hali) transcript'te LİTERAL
   * olarak bulunmaz (konuşulan gerçek ifade "ended up staying"). Bu kontrol
   * SADECE warning/needsReview — reject DEĞİL.
   */
  it("learningPointExpressionNotInTranscript: pedagojik notation transcript'te literal geçmiyor → SADECE needsReview/warning, reject DEĞİL", () => {
    const content = cleanContent();
    content.learningPoints[0]!.expression = "end up + V-ing"; // gerçek konuşulan hali: "ended up staying"
    const report = evaluateContentQuality(content);
    expect(report.status).toBe("needsReview");
    const issue = report.issues.find((i) => i.code === "learningPointExpressionNotInTranscript");
    expect(issue?.severity).toBe("warning");
  });
});

describe("evaluateContentQuality — vocabulary quality", () => {
  it("emptyVocabulary: boş vocabulary listesi → needsReview (hard reject DEĞİL — trivial bir video için meşru olabilir)", () => {
    const content = cleanContent();
    content.vocabulary = [];
    const report = evaluateContentQuality(content);
    expect(report.status).toBe("needsReview");
    expect(report.issues.map((i) => i.code)).toContain("emptyVocabulary");
  });

  it("duplicateVocabularyLemma: aynı lemma birden fazla kez → needsReview", () => {
    const content = cleanContent();
    content.vocabulary = [content.vocabulary[0]!, { ...content.vocabulary[0]! }];
    const report = evaluateContentQuality(content);
    expect(report.status).toBe("needsReview");
    expect(report.issues.map((i) => i.code)).toContain("duplicateVocabularyLemma");
  });

  it("trivialVocabularyLemma: ignore-set'teki bir kelime (\"the\") vocabulary'e eklenmiş → needsReview", () => {
    const content = cleanContent();
    content.vocabulary = [{ lemma: "the", gloss: "belirli tanımlık" }];
    const report = evaluateContentQuality(content);
    expect(report.status).toBe("needsReview");
    expect(report.issues.map((i) => i.code)).toContain("trivialVocabularyLemma");
  });

  /**
   * KULLANICI KARARI — aynı false-positive riski: "go" lemma'sı, transcript'te
   * DÜZENSİZ (irregular) bir fiil çekimi olan "went" olarak geçiyor — "went"
   * metninde literal "go" substring'i YOK (örn. "stay"/"staying" gibi düzenli
   * çekimlerin aksine, "go"/"went" bir substring ilişkisi kurmuyor). Stemming/
   * lemmatization eklenmedi (bilinçli kapsam dışı) — bu yüzden SADECE warning.
   */
  it("vocabularyLemmaNotInTranscript: lemma transcript'te düzensiz çekimli halde geçiyor (\"go\" vs \"went\") → SADECE needsReview/warning, reject DEĞİL", () => {
    const content = cleanContent();
    content.vocabulary = [{ lemma: "go", gloss: "gitmek" }]; // transcript: "They went to the market yesterday."
    const report = evaluateContentQuality(content);
    expect(report.status).toBe("needsReview");
    const issue = report.issues.find((i) => i.code === "vocabularyLemmaNotInTranscript");
    expect(issue?.severity).toBe("warning");
  });
});

describe("evaluateContentQuality — quiz quality", () => {
  it("emptyQuizQuestion: sadece boşluktan oluşan soru → reject", () => {
    const content = cleanContent();
    content.quiz.question = "   ";
    const report = evaluateContentQuality(content);
    expect(report.status).toBe("reject");
    expect(report.issues.map((i) => i.code)).toContain("emptyQuizQuestion");
  });

  it("quizTooShort: aşırı kısa bir soru metni → needsReview", () => {
    const content = cleanContent();
    content.quiz.question = "Huh?";
    const report = evaluateContentQuality(content);
    expect(report.status).toBe("needsReview");
    expect(report.issues.map((i) => i.code)).toContain("quizTooShort");
  });

  it("quizTooShort: aşırı kısa bir seçenek metni → needsReview", () => {
    const content = cleanContent();
    content.quiz.options[1]!.text = "x";
    const report = evaluateContentQuality(content);
    expect(report.status).toBe("needsReview");
    expect(report.issues.map((i) => i.code)).toContain("quizTooShort");
  });

  it("duplicateQuizOptions: iki seçenek case-insensitive aynı metne sahip → reject (unanswerable quiz)", () => {
    const content = cleanContent();
    content.quiz.options[1]!.text = "READING BOOKS"; // doğru cevapla (case-insensitive) aynı
    const report = evaluateContentQuality(content);
    expect(report.status).toBe("reject");
    expect(report.issues.map((i) => i.code)).toContain("duplicateQuizOptions");
  });

  it("quizTooTrivial: soru NEREDEYSE TAMAMEN kaynak segment metninin kopyası (gerçek soru içeriği yok) → needsReview", () => {
    const content = cleanContent();
    content.quiz.question = "She loves reading books?"; // segment metninin kendisi + "?" — gerçek bir soru YOK
    const report = evaluateContentQuality(content);
    expect(report.status).toBe("needsReview");
    expect(report.issues.map((i) => i.code)).toContain("quizTooTrivial");
  });

  /**
   * KULLANICI KARARI (Chunk 13 audit'inden çıkan kalibrasyon düzeltmesi) —
   * mevcut, MEŞRU içeriğin çoğu "'{segment}' — gerçek soru?" kalıbını
   * kullanıyor: bağlam için cümleyi alıntılayıp SONRA asıl soruyu soruyor.
   * Segment metninin SADECE question içinde geçmesi TEK BAŞINA artık flag
   * üretmiyor — quote, sorunun BÜYÜK ÇOĞUNLUĞUNU (>%70) kaplamadığı sürece.
   */
  it("quizTooTrivial: segment metni context için alıntılanıp SONRASINDA gerçek/substantial bir soru soruluyorsa TETİKLENMEZ (false-positive düzeltmesi)", () => {
    const content = cleanContent();
    content.quiz.question = "'She loves reading books.' — What does she love doing in her free time?";
    const report = evaluateContentQuality(content);
    expect(report.issues.map((i) => i.code)).not.toContain("quizTooTrivial");
  });
});

describe("evaluateContentQuality — severity aggregation", () => {
  it("hem reject hem warning issue'ları birlikte varsa genel status reject kalır (reject > needsReview)", () => {
    const content = cleanContent();
    content.segments[0]!.text = "   "; // reject: whitespaceOnlySegment
    content.vocabulary = []; // warning: emptyVocabulary
    const report = evaluateContentQuality(content);
    expect(report.status).toBe("reject");
    expect(report.issues.map((i) => i.code)).toEqual(expect.arrayContaining(["whitespaceOnlySegment", "emptyVocabulary"]));
  });

  it("birden fazla ayrı issue doğru şekilde toplanır (concat, ilk bulunanda durmaz)", () => {
    const content = cleanContent();
    content.vocabulary = []; // emptyVocabulary
    content.segments[1]!.text = content.segments[0]!.text; // duplicateAdjacentSegment
    const report = evaluateContentQuality(content);
    expect(report.status).toBe("needsReview");
    expect(report.issues.length).toBeGreaterThanOrEqual(2);
    expect(report.issues.map((i) => i.code)).toEqual(expect.arrayContaining(["emptyVocabulary", "duplicateAdjacentSegment"]));
  });
});
