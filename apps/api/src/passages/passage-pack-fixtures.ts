import type { PassagePack } from "./passage-pack";

/**
 * Yayın paketi TEST fixture'ı (gerçek içerik DEĞİL; content/ altında bilerek yok). Geçerli bir paket döner; testler
 * `mutate` ile TEK bir kuralı bozup tam o kodun raporlandığını doğrular.
 */
const PARAGRAPH = "The old lighthouse stood above the harbour. Every evening the keeper climbed its stairs. The lamp guided ships safely home.";

function span(surface: string): { paragraphIndex: number; start: number; end: number; surface: string } {
  const start = PARAGRAPH.indexOf(surface);
  if (start < 0) throw new Error(`fixture: "${surface}" paragrafta yok`);
  return { paragraphIndex: 0, start, end: start + surface.length, surface };
}

function question(index: number, correctIndex: number): PassagePack["questions"][number] {
  return {
    key: `q${index}`,
    type: "detail",
    prompt: `Fixture soru ${index}?`,
    evidence: span("Every evening the keeper climbed its stairs"),
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
      { lemma: "lighthouse", gloss: "deniz feneri", contextSentence: "The old lighthouse stood above the harbour.", spans: [span("lighthouse")] },
      { lemma: "keeper", gloss: "bekçi", contextSentence: "Every evening the keeper climbed its stairs.", spans: [span("keeper")] },
    ],
    // Doğru şık konumları 0,1,2,3: dengeli.
    questions: [question(1, 0), question(2, 1), question(3, 2), question(4, 3)],
    editorial: { original: true, noFactualClaims: true, sources: [] },
    ...overrides,
  };
}

export { PARAGRAPH as FIXTURE_PACK_PARAGRAPH };
