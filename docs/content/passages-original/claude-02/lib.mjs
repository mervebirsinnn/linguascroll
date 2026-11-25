// Claude parti 02 yardımcıları: cümleler `Word{anlam}` işaretiyle yazılır; betik temiz metni, kelime listesini,
// span offset'lerini ve cümle çevirilerini bu işaretten türetir (anlam sırası/sayısı hatası imkânsız).
const WORD = /[A-Za-z]+(?:['’][A-Za-z]+)*/g;
const MARK = /\{([^}]*)\}/g;
const PIECE = /([A-Za-z]+(?:['’][A-Za-z]+)*)\{([^}]*)\}/g;

// `kelime{}` (boş işaret) yalnız bu güvenli, bağlamdan bağımsız sözcüklerde varsayılan anlam verir; başka sözcükte hata atar.
const DEFAULT_GLOSS = {
  the: "belirli tanımlık", a: "bir", an: "bir", and: "ve", or: "ya da", but: "ama",
  is: "-dır (olmak fiili)", are: "-dır (olmak fiili)", was: "idi (olmak fiilinin geçmişi)", were: "idi (olmak fiilinin geçmişi)",
  be: "olmak", been: "olmuş (olmak fiili)", of: "-nin (aitlik)", in: "-de", on: "üzerinde", at: "-de", for: "için", with: "ile",
  it: "o", its: "onun", they: "onlar", their: "onların", them: "onları", we: "biz", our: "bizim", us: "bize", you: "sen", your: "senin",
  had: "-mişti (yardımcı fiil)", have: "-miştir (yardımcı fiil)", has: "-miştir (yardımcı fiil)", do: "olumsuz/soru yardımcı fiili", does: "olumsuz/soru yardımcı fiili", did: "olumsuz/soru yardımcı fiili (geçmiş)",
  as: "olarak / kadar (as)", he: "o", his: "onun", she: "o", her: "onun", this: "bu", these: "bu", not: "değil", if: "eğer",
};

/** rows: paragraf listesi; paragraf = [[işaretliCümle, çeviri], ...]. */
export function buildFromRows(slug, rows) {
  const paragraphs = [];
  const wordMap = new Map();
  rows.forEach((paragraph, paragraphIndex) => {
    let offset = 0;
    const clean = [];
    paragraph.forEach(([marked, translation]) => {
      const sentence = marked.replace(MARK, "");
      const tokens = [...sentence.matchAll(WORD)];
      // İşaret her kelimenin HEMEN arkasında olmalı: kelime{anlam}.
      const pieces = [...marked.matchAll(PIECE)];
      if (pieces.length !== tokens.length || [...marked.matchAll(MARK)].length !== tokens.length) {
        throw new Error(`${slug}: ${tokens.length} kelime, ${pieces.length} bitişik işaret: ${sentence}`);
      }
      tokens.forEach((token, i) => {
        const surface = token[0];
        if (pieces[i][1] !== surface) throw new Error(`${slug}: sıra uyuşmuyor: ${surface} / ${pieces[i][1]}`);
        let gloss = pieces[i][2];
        if (!gloss.trim()) gloss = DEFAULT_GLOSS[surface.toLowerCase()] ?? "";
        if (!gloss.trim()) throw new Error(`${slug}: varsayılan anlamı olmayan boş işaret: ${surface}`);
        const lemma = surface.toLowerCase().replace(/’/g, "'");
        const key = `${lemma}\u0000${gloss}`;
        if (!wordMap.has(key)) wordMap.set(key, { lemma, gloss, spans: [] });
        wordMap.get(key).spans.push({
          paragraphIndex, start: offset + token.index, end: offset + token.index + surface.length, surface,
          contextSentence: sentence, contextSentenceTr: translation,
        });
      });
      clean.push(sentence);
      offset += sentence.length + 1;
    });
    paragraphs.push(clean.join(" "));
  });
  return { paragraphs, words: [...wordMap.values()] };
}

export const evidenceOf = (paragraphs, paragraphIndex, text) => {
  const start = paragraphs[paragraphIndex].indexOf(text);
  if (start < 0) throw new Error(`dayanak bulunamadı: ${text}`);
  return { paragraphIndex, start, end: start + text.length };
};
export const option = (key, text, isCorrect, trapType, explanation) => ({ key, text, isCorrect, trapType, explanation });

/** Dayanak metnin hangi paragrafta olduğunu kendisi bulur (yeniden yazılan sorularda indeks hatasını önler). */
export const findEvidence = (paragraphs, text) => {
  const pi = paragraphs.findIndex((p) => p.includes(text));
  if (pi < 0) throw new Error(`dayanak bulunamadı: ${text}`);
  return evidenceOf(paragraphs, pi, text);
};
