import {
  answerPassageQuestionRequestSchema,
  passageLevelSchema,
  passagePageSchema,
  passageQuestionSchema,
  passageSchema,
  passagesQuerySchema,
  saveWordRequestSchema,
} from "@linguascroll/shared-types";

/**
 * Okuma pratiği wire contract'ının (shared-types/passage.ts) davranış testleri. shared-types'ın kendi
 * test runner'ı yok; sözleşmeyi tüketen api paketinin jest'inde çalışıyor (diğer şema spec'leriyle aynı yer).
 */
const uuid = (n: number): string => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;

const unansweredQuestion = {
  id: uuid(10),
  type: "main-idea",
  prompt: "What is the main idea?",
  options: [
    { id: uuid(11), text: "A" },
    { id: uuid(12), text: "B" },
  ],
  result: null,
};

const openPassage = {
  access: "open" as const,
  id: uuid(1),
  level: "C1",
  title: "T",
  topic: "Sinirbilim",
  paragraphs: [[{ text: "plain " }, { text: "account for", word: { wordId: uuid(2), gloss: "açıklamak", saved: false } }]],
  questions: [unansweredQuestion],
};

describe("passageLevelSchema", () => {
  it.each(["B1", "B2", "C1", "C2"])("%s kabul edilir", (level) => {
    expect(passageLevelSchema.safeParse(level).success).toBe(true);
  });

  it.each(["A1", "A2", "b1", "", "X1"])("%s reddedilir", (level) => {
    expect(passageLevelSchema.safeParse(level).success).toBe(false);
  });
});

describe("passagesQuerySchema", () => {
  it("level zorunlu", () => {
    expect(passagesQuerySchema.safeParse({}).success).toBe(false);
  });

  it("A2 seviyesi geçersizdir", () => {
    expect(passagesQuerySchema.safeParse({ level: "A2" }).success).toBe(false);
  });

  it("cursor opsiyonel, boş string geçersiz", () => {
    expect(passagesQuerySchema.safeParse({ level: "B2" }).success).toBe(true);
    expect(passagesQuerySchema.safeParse({ level: "B2", cursor: "abc" }).success).toBe(true);
    expect(passagesQuerySchema.safeParse({ level: "B2", cursor: "" }).success).toBe(false);
  });
});

describe("passageSchema", () => {
  it("açık metni run'larıyla ve cevaplanmamış soruyla parse eder", () => {
    expect(passageSchema.safeParse(openPassage).success).toBe(true);
  });

  // NOT: Zod bilinmeyen anahtarları parse'ta düşürür; bu test şemanın bu alanları KABUL ETMEDİĞİNİ gösterir,
  // sunucunun göndermediğini DEĞİL. Sunucu tarafı kanıtı PR-3 e2e'sinde ham HTTP gövdesi üzerinde yapılacak.
  it("kilitli metin şeması paragraf ve soru alanlarını parse çıktısına almaz", () => {
    const parsed = passageSchema.parse({ ...openPassage, access: "locked" });
    expect(parsed.access).toBe("locked");
    expect(parsed).not.toHaveProperty("paragraphs");
    expect(parsed).not.toHaveProperty("questions");
  });

  it("açık metin paragraf veya soru olmadan reddedilir", () => {
    const { paragraphs: _paragraphs, ...withoutParagraphs } = openPassage;
    expect(passageSchema.safeParse(withoutParagraphs).success).toBe(false);
    expect(passageSchema.safeParse({ ...openPassage, questions: [] }).success).toBe(false);
  });

  it("bilinmeyen access değeri ve B1..C2 dışı seviye reddedilir", () => {
    expect(passageSchema.safeParse({ ...openPassage, access: "preview" }).success).toBe(false);
    expect(passageSchema.safeParse({ ...openPassage, level: "A2" }).success).toBe(false);
  });

  it("boş metinli run reddedilir", () => {
    expect(passageSchema.safeParse({ ...openPassage, paragraphs: [[{ text: "" }]] }).success).toBe(false);
  });
});

describe("passageQuestionSchema", () => {
  it("cevaplanmamış soruda result null olmak zorunda; alan hiç yoksa reddedilir", () => {
    expect(passageQuestionSchema.safeParse(unansweredQuestion).success).toBe(true);
    const { result: _result, ...withoutResult } = unansweredQuestion;
    expect(passageQuestionSchema.safeParse(withoutResult).success).toBe(false);
  });

  it("cevaplanmış soruda sonuç parse edilir; bilinmeyen tuzak/soru türü düz metin olduğu için kırılmaz", () => {
    const answered = {
      ...unansweredQuestion,
      type: "a-type-added-for-c2",
      result: {
        selectedOptionId: uuid(11),
        correctOptionId: uuid(12),
        correct: false,
        options: [
          { optionId: uuid(11), isCorrect: false, trapType: "a-new-trap", explanation: "Çünkü …" },
          { optionId: uuid(12), isCorrect: true, trapType: null, explanation: "Metinde yazıyor." },
        ],
      },
    };
    expect(passageQuestionSchema.safeParse(answered).success).toBe(true);
  });

  // Aynı sınırlama: şema bu alanları çıktıya almaz; sunucunun cevaplanmamış soruda anahtar GÖNDERMEDİĞİ
  // (ve result: null döndürdüğü) PR-3 e2e'sinde ham gövdede doğrulanacak.
  it("cevap öncesi şık şeması doğruluk ve açıklama alanlarını parse çıktısına almaz", () => {
    const parsed = passageQuestionSchema.parse({
      ...unansweredQuestion,
      options: [
        { id: uuid(11), text: "A", isCorrect: true, explanation: "gizli" },
        { id: uuid(12), text: "B" },
      ],
    });
    expect(parsed.options[0]).not.toHaveProperty("isCorrect");
    expect(parsed.options[0]).not.toHaveProperty("explanation");
  });
});

describe("passagePageSchema", () => {
  it("nextCursor null seviye sonunu ifade eder", () => {
    expect(passagePageSchema.safeParse({ items: [openPassage], nextCursor: null }).success).toBe(true);
    expect(passagePageSchema.safeParse({ items: [openPassage] }).success).toBe(false);
  });
});

describe("answerPassageQuestionRequestSchema", () => {
  it("optionId uuid olmalı; istemci isCorrect gönderse bile düşer", () => {
    expect(answerPassageQuestionRequestSchema.safeParse({ optionId: "nope" }).success).toBe(false);
    const parsed = answerPassageQuestionRequestSchema.parse({ optionId: uuid(11), isCorrect: true });
    expect(parsed).toEqual({ optionId: uuid(11) });
  });
});

describe("saveWordRequestSchema — sourcePassageId", () => {
  it("eski istek şekilleri aynen geçerli (additive değişiklik)", () => {
    expect(saveWordRequestSchema.safeParse({}).success).toBe(true);
    expect(saveWordRequestSchema.safeParse({ sourceSegmentId: uuid(1) }).success).toBe(true);
    expect(saveWordRequestSchema.safeParse({ sourceSegmentId: null }).success).toBe(true);
  });

  it("yalnız sourcePassageId geçerli", () => {
    expect(saveWordRequestSchema.safeParse({ sourcePassageId: uuid(1) }).success).toBe(true);
    expect(saveWordRequestSchema.safeParse({ sourcePassageId: uuid(1), sourceSegmentId: null }).success).toBe(true);
  });

  it("ikisi birlikte gelirse reddedilir", () => {
    const result = saveWordRequestSchema.safeParse({ sourceSegmentId: uuid(1), sourcePassageId: uuid(2) });
    expect(result.success).toBe(false);
  });

  it("uuid olmayan sourcePassageId reddedilir", () => {
    expect(saveWordRequestSchema.safeParse({ sourcePassageId: "x" }).success).toBe(false);
  });
});
