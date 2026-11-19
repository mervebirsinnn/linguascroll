import type { PassagePack } from "./passage-pack";
import { findWordTokens } from "@linguascroll/shared-types";

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

function allFixtureWords(): PassagePack["words"] {
  const glosses: Record<string, string> = {
    lighthouse: "deniz feneri", keeper: "bekçi", the: "belirtme tanımlığı", old: "eski", stood: "duruyordu",
    above: "üstünde", harbour: "liman", every: "her", evening: "akşam", climbed: "tırmandı", its: "onun",
    stairs: "merdivenler", lamp: "lamba", guided: "yol gösterdi", ships: "gemiler", safely: "güvenle", home: "eve",
  };
  const words = new Map<string, PassagePack["words"][number]>();
  // İki eski anahtar ilk iki sırada kalır; mutasyon testleri bu iki hedefi özellikle kullanır.
  for (const lemma of ["lighthouse", "keeper"]) words.set(lemma, { lemma, gloss: glosses[lemma]!, spans: [] });
  for (const token of findWordTokens(PARAGRAPH)) {
    const contextSentence = SENTENCES.find((sentence) => {
      const start = PARAGRAPH.indexOf(sentence);
      return start <= token.start && start + sentence.length >= token.end;
    });
    const gloss = glosses[token.normalized];
    if (!contextSentence || !gloss) throw new Error(`fixture: eksik cümle/anlam: ${token.text}`);
    const word = words.get(token.normalized) ?? { lemma: token.normalized, gloss, spans: [] };
    word.spans.push({ paragraphIndex: 0, start: token.start, end: token.end, surface: token.text, contextSentence });
    words.set(token.normalized, word);
  }
  return [...words.values()];
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
    words: allFixtureWords(),
    // Doğru şık konumları 0,1,2,3: dengeli.
    questions: [question(1, 0), question(2, 1), question(3, 2), question(4, 3)],
    editorial: { original: true, noFactualClaims: true, sources: [] },
    ...overrides,
  };
}

export { PARAGRAPH as FIXTURE_PACK_PARAGRAPH };
