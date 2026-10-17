import { z } from "zod";

/**
 * Bir videonun altyazı kelime anlamları: `segmentId -> { normalizedWord -> gloss }`.
 * Anlamlar offline üretilip DB'de tutulur (bkz. apps/api words/generate-word-glosses.ts) —
 * mobile tıklama anında hiçbir LLM/ağ çağrısı beklemez.
 */
export const videoWordGlossesSchema = z.record(z.string().uuid(), z.record(z.string(), z.string().min(1)));

export type VideoWordGlosses = z.infer<typeof videoWordGlossesSchema>;

/**
 * Anahtar normalizasyonu VE kelime sınırı tanımı API (üretim) ile mobile'da
 * (arama) BİREBİR aynı olmak zorunda — ikisi ayrışırsa tıklama sessizce
 * "anlam yok"a düşer. Bu yüzden wire contract'ın bir parçası olarak burada:
 * tek tanım, iki tüketici.
 *
 * Kelime = harf dizisi, içinde tek tırnak/kesme olabilir ("don't", "it's").
 * Rakam ve noktalama kelime sayılmaz.
 */
const WORD_PATTERN = /[A-Za-z]+(?:['’][A-Za-z]+)*/g;

export type WordToken = { start: number; end: number; text: string; normalized: string };

export function normalizeGlossWord(token: string): string {
  return token.toLowerCase().replace(/’/g, "'");
}

export function findWordTokens(text: string): WordToken[] {
  const tokens: WordToken[] = [];
  for (const match of text.matchAll(WORD_PATTERN)) {
    const start = match.index ?? 0;
    tokens.push({ start, end: start + match[0].length, text: match[0], normalized: normalizeGlossWord(match[0]) });
  }
  return tokens;
}
