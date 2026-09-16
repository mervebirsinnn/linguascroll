import { enrichmentOutputSchema } from "./enrichment-output.schema";

function validOutput(): Record<string, unknown> {
  return {
    contentSlug: "dog-three-words",
    topic: "humor",
    cefrLevel: "A1",
    segments: [{ ordinal: 1, englishExplanation: "A greeting.", turkishExplanation: "Bir selamlama." }],
    vocabulary: [{ lemma: "cute", gloss: "sevimli" }],
    learningPoints: [
      {
        segmentOrdinal: 1,
        type: "phrase",
        expression: "end up + V-ing",
        englishExplanation: "Describes an unplanned result.",
        turkishExplanation: "Planlanmamış bir sonucu anlatır.",
        exampleEn: "I ended up staying.",
        exampleTr: "Sonunda kaldım.",
      },
    ],
    quiz: {
      segmentOrdinal: 1,
      question: "What is the dog like?",
      options: [
        { text: "Cute", isCorrect: true },
        { text: "Angry", isCorrect: false },
        { text: "Tired", isCorrect: false },
        { text: "Hungry", isCorrect: false },
      ],
    },
  };
}

describe("enrichmentOutputSchema", () => {
  it("geçerli bir enrichment çıktısını kabul eder", () => {
    const result = enrichmentOutputSchema.safeParse(validOutput());
    expect(result.success).toBe(true);
  });

  it("izin verilen taxonomy dışında bir topic'i reddeder", () => {
    const result = enrichmentOutputSchema.safeParse({ ...validOutput(), topic: "sports" });
    expect(result.success).toBe(false);
  });

  it("geçersiz bir cefrLevel'ı reddeder", () => {
    const result = enrichmentOutputSchema.safeParse({ ...validOutput(), cefrLevel: "Z9" });
    expect(result.success).toBe(false);
  });

  it("birden fazla doğru cevaplı bir quiz'i reddeder", () => {
    const output = validOutput() as { quiz: { options: { text: string; isCorrect: boolean }[] } };
    output.quiz.options[1]!.isCorrect = true;
    const result = enrichmentOutputSchema.safeParse(output);
    expect(result.success).toBe(false);
  });

  it("4'ten az seçenekli bir quiz'i reddeder", () => {
    const output = validOutput() as { quiz: { options: unknown[] } };
    output.quiz.options = output.quiz.options.slice(0, 3);
    const result = enrichmentOutputSchema.safeParse(output);
    expect(result.success).toBe(false);
  });

  it("boş bir segments dizisini reddeder", () => {
    const result = enrichmentOutputSchema.safeParse({ ...validOutput(), segments: [] });
    expect(result.success).toBe(false);
  });

  it("boş bir vocabulary dizisini KABUL eder (madde 8: seçici, zorunlu değil)", () => {
    const result = enrichmentOutputSchema.safeParse({ ...validOutput(), vocabulary: [] });
    expect(result.success).toBe(true);
  });

  it("boş bir learningPoints dizisini KABUL eder (seçici, her segmentte olmak zorunda değil)", () => {
    const result = enrichmentOutputSchema.safeParse({ ...validOutput(), learningPoints: [] });
    expect(result.success).toBe(true);
  });

  it("kebab-case olmayan bir contentSlug'ı reddeder", () => {
    const result = enrichmentOutputSchema.safeParse({ ...validOutput(), contentSlug: "Dog Three Words" });
    expect(result.success).toBe(false);
  });
});
