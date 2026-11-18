import type { PassagePack } from "./passage-pack";

/**
 * Yayın paketi TEST fixture'ı (gerçek içerik DEĞİL; content/ altında bilerek yok). Geçerli bir paket döner; testler
 * `mutate` ile TEK bir kuralı bozup tam o kodun raporlandığını doğrular.
 */
const PARAGRAPH = "The old lighthouse stood above the harbour. Every evening the keeper climbed its stairs. The lamp guided ships safely home.";

const SENTENCES = [
  "The old lighthouse stood above the harbour.",
  "Every evening the keeper climbed its stairs.",
  "The lamp guided ships safely home.",
];

function range(surface: string): { paragraphIndex: number; start: number; end: number; surface: string } {
  const start = PARAGRAPH.indexOf(surface);
  if (start < 0) throw new Error(`fixture: "${surface}" paragrafta yok`);
  return { paragraphIndex: 0, start, end: start + surface.length, surface };
}

/** Geçiş = aralık + o geçişin cümlesi (pakette her span kendi cümlesini taşır). */
function span(surface: string, contextSentence: string): ReturnType<typeof range> & { contextSentence: string } {
  return { ...range(surface), contextSentence };
}

function question(index: number, correctIndex: number): PassagePack["questions"][number] {
  return {
    key: `q${index}`,
    type: "detail",
    prompt: `Fixture soru ${index}?`,
    evidence: range("Every evening the keeper climbed its stairs"),
    options: [0, 1, 2, 3].map((optionIndex) => ({
      key: `o${optionIndex}`,
      text: `Seçenek ${index}-${optionIndex} aynı uzunlukta`,
      isCorrect: optionIndex === correctIndex,
      trapType: optionIndex === correctIndex ? null : "copy",
      explanation: `Gerekçe ${index}-${optionIndex}`,
    })),
  };
}

export function validPack(overrides: Partial<PassagePack> = {}): PassagePack {
  return {
    slug: "fixture-lighthouse",
    level: "B2",
    title: "Fixture başlığı",
    topic: "Fixture",
    sortOrder: 1,
    isFreeSample: false,
    paragraphs: [PARAGRAPH],
    words: [
      { lemma: "lighthouse", gloss: "deniz feneri", spans: [span("lighthouse", SENTENCES[0]!)] },
      { lemma: "keeper", gloss: "bekçi", spans: [span("keeper", SENTENCES[1]!)] },
    ],
    // Doğru şık konumları 0,1,2,3: dengeli.
    questions: [question(1, 0), question(2, 1), question(3, 2), question(4, 3)],
    editorial: { original: true, noFactualClaims: true, sources: [] },
    ...overrides,
  };
}

export { PARAGRAPH as FIXTURE_PACK_PARAGRAPH };
