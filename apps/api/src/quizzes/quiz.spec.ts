import { quizSchema } from "./quiz";

describe("quizSchema — 'tam olarak bir doğru cevap' invariant'ı", () => {
  const baseQuiz = {
    id: "00000000-0000-4000-8000-000000000001",
    question: "test",
  };

  it("tam olarak bir isCorrect:true varsa kabul eder", () => {
    const result = quizSchema.safeParse({
      ...baseQuiz,
      options: [
        { id: "00000000-0000-4000-8000-000000000010", text: "a", isCorrect: true },
        { id: "00000000-0000-4000-8000-000000000011", text: "b", isCorrect: false },
      ],
    });

    expect(result.success).toBe(true);
  });

  it("sıfır isCorrect:true varsa REDDEDER (DB partial unique index bunu yakalamıyor, bu invariant onun yerini alıyor)", () => {
    const result = quizSchema.safeParse({
      ...baseQuiz,
      options: [
        { id: "00000000-0000-4000-8000-000000000010", text: "a", isCorrect: false },
        { id: "00000000-0000-4000-8000-000000000011", text: "b", isCorrect: false },
      ],
    });

    expect(result.success).toBe(false);
  });

  it("birden fazla isCorrect:true varsa REDDEDER", () => {
    const result = quizSchema.safeParse({
      ...baseQuiz,
      options: [
        { id: "00000000-0000-4000-8000-000000000010", text: "a", isCorrect: true },
        { id: "00000000-0000-4000-8000-000000000011", text: "b", isCorrect: true },
      ],
    });

    expect(result.success).toBe(false);
  });
});
