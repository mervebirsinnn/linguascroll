import { assertValidSegmentReferences, SegmentReferenceError } from "./validate-segment-references";

const draftSegments = [
  { ordinal: 1, startMs: 0, endMs: 1000, text: "Hi," },
  { ordinal: 2, startMs: 1000, endMs: 3000, text: "welcome to the video." },
];

const validOutput = {
  segments: [
    { ordinal: 1, englishExplanation: "A greeting.", turkishExplanation: "Bir selamlama." },
    { ordinal: 2, englishExplanation: "Welcomes the viewer.", turkishExplanation: "İzleyiciyi karşılıyor." },
  ],
  learningPoints: [],
  quiz: {
    segmentOrdinal: 2,
    question: "What does the speaker do?",
    options: [
      { text: "Welcomes the viewer", isCorrect: true },
      { text: "Says goodbye", isCorrect: false },
      { text: "Asks a question", isCorrect: false },
      { text: "Gives an order", isCorrect: false },
    ],
  },
};

describe("assertValidSegmentReferences", () => {
  it("segment ordinal kümesi ve tüm referanslar geçerliyse throw etmez", () => {
    expect(() => assertValidSegmentReferences(validOutput, draftSegments)).not.toThrow();
  });

  it("çıktının segment ordinal kümesi draft'tan eksikse throw eder", () => {
    const output = { ...validOutput, segments: [validOutput.segments[0]!] };
    expect(() => assertValidSegmentReferences(output, draftSegments)).toThrow(SegmentReferenceError);
  });

  it("çıktı draft'ta olmayan bir ordinal içeriyorsa throw eder", () => {
    const output = { ...validOutput, segments: [...validOutput.segments, { ordinal: 99, englishExplanation: "x", turkishExplanation: "y" }] };
    expect(() => assertValidSegmentReferences(output, draftSegments)).toThrow(SegmentReferenceError);
  });

  it("bir learning point var olmayan bir segment ordinal'ına referans veriyorsa throw eder", () => {
    const output = {
      ...validOutput,
      learningPoints: [
        {
          segmentOrdinal: 99,
          type: "phrase" as const,
          expression: "x",
          englishExplanation: "x",
          turkishExplanation: "y",
          exampleEn: null,
          exampleTr: null,
        },
      ],
    };
    expect(() => assertValidSegmentReferences(output, draftSegments)).toThrow(SegmentReferenceError);
  });

  it("quiz var olmayan bir segment ordinal'ına referans veriyorsa throw eder", () => {
    const output = { ...validOutput, quiz: { ...validOutput.quiz, segmentOrdinal: 99 } };
    expect(() => assertValidSegmentReferences(output, draftSegments)).toThrow(SegmentReferenceError);
  });
});
