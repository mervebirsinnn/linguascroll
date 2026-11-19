import type { Passage, PassageAnswerResult, PassagePage, PassageQuestion } from "@linguascroll/shared-types";

/** Okuma pratiği testleri (state/controller/hook) için ortak, dar amaçlı veri ve zaman kontrol yardımcıları. */
export const uuid = (n: number): string => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;

export type OpenPassage = Extract<Passage, { access: "open" }>;

export function makeQuestion(n: number, result: PassageAnswerResult | null = null): PassageQuestion {
  return { id: uuid(100 + n), type: "detail", prompt: `Q${n}`, options: [0, 1, 2, 3].map((i) => ({ id: uuid(1000 + n * 10 + i), text: `o${i}` })), result };
}

export function makeAnswer(question: PassageQuestion, selectedIndex: number, correctIndex: number): PassageAnswerResult {
  return {
    selectedOptionId: question.options[selectedIndex]!.id,
    correctOptionId: question.options[correctIndex]!.id,
    correct: selectedIndex === correctIndex,
    options: question.options.map((option, i) => ({ optionId: option.id, isCorrect: i === correctIndex, trapType: i === correctIndex ? null : "copy", explanation: "e" })),
  };
}

export const CAT_WORD_ID = uuid(500);
/** Aynı "cat" kelimesinin iki geçişi (iki ayrı cümle): her geçişin kendi span kimliği ve cümlesi var. */
export const CAT_SPAN_1 = uuid(601);
export const CAT_SPAN_2 = uuid(602);

export function makeOpenPassage(n: number, overrides: Partial<OpenPassage> = {}): OpenPassage {
  return {
    access: "open",
    id: uuid(n),
    level: "B2",
    title: `T${n}`,
    topic: "K",
    paragraphs: [
      [
        { text: "A " },
        { text: "cat", word: { wordId: CAT_WORD_ID, gloss: "kedi", saved: false, spanId: CAT_SPAN_1, contextSentence: "A cat sat." } },
        { text: " sat. The " },
        { text: "cat", word: { wordId: CAT_WORD_ID, gloss: "kedi", saved: false, spanId: CAT_SPAN_2, contextSentence: "The cat left." } },
        { text: " left." },
      ],
    ],
    questions: [makeQuestion(n * 10 + 1), makeQuestion(n * 10 + 2), makeQuestion(n * 10 + 3), makeQuestion(n * 10 + 4)],
    ...overrides,
  };
}

export const makeLockedPassage = (n: number): Passage => ({ access: "locked", id: uuid(n), level: "B2", title: `L${n}`, topic: "K" });
export const makePage = (items: Passage[], nextCursor: string | null = null): PassagePage => ({ items, nextCursor });

export type Deferred<T> = { promise: Promise<T>; resolve: (value: T) => void; reject: (error: unknown) => void };
export function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

/** Bekleyen mikro-görevlerin (await zincirlerinin) tamamlanması için. */
export const flush = async (): Promise<void> => {
  for (let i = 0; i < 10; i++) await Promise.resolve();
};
