import { normalizeGlossWord } from "@linguascroll/shared-types";
import { PASSAGE_TRAP_TYPES, passagePackSchema, type PassagePack } from "./passage-pack";
import { buildParagraphRuns } from "./passage-runs";

/**
 * Yayın kalite kapısı: DB'nin ZORLAMADIĞI içerik kuralları (şekil için passage-pack.ts). Saf fonksiyon; ilk hatada
 * durmaz, TÜM sorunları kodlarıyla toplar ki içerik üreticisi tek turda hepsini düzeltsin.
 *
 * Çalışma zamanıyla aynı kural: span'lar sunucunun kullandığı `buildParagraphRuns`'tan geçirilir — yayın kapısını
 * geçen metin /passages'ta 500 üretemez (o fonksiyon tutarsız veride patlar).
 *
 * EŞİKLER (editoryal, ayarlanabilir; tasarımda sayısal değer verilmemişti, makul varsayılanlar):
 */
/** Bir sorunun en uzun/en kısa şıkkının karakter uzunluğu oranı bunu aşarsa "uzun şık = doğru" ipucu riski. */
export const MAX_OPTION_LENGTH_RATIO = 2.5;
/** Bir metnin 4 sorusunda doğru cevap aynı konumda en fazla bu kadar kez olabilir (dengeli konum dağılımı). */
export const MAX_SAME_CORRECT_POSITION = 2;

export type PackIssue = { code: string; path: string; message: string };
const issue = (code: string, path: string, message: string): PackIssue => ({ code, path, message });

export function validatePassagePack(input: unknown): { pack: PassagePack | null; issues: PackIssue[] } {
  const parsed = passagePackSchema.safeParse(input);
  if (!parsed.success) {
    return {
      pack: null,
      issues: parsed.error.issues.map((zodIssue) => issue("schema", zodIssue.path.join("."), zodIssue.message)),
    };
  }
  const pack = parsed.data;
  const issues: PackIssue[] = [];

  validateParagraphs(pack, issues);
  validateWords(pack, issues);
  validateQuestions(pack, issues);
  validateEditorial(pack, issues);
  return { pack: issues.length === 0 ? pack : null, issues };
}

function validateParagraphs(pack: PassagePack, issues: PackIssue[]): void {
  pack.paragraphs.forEach((paragraph, index) => {
    if (paragraph.trim().length === 0) issues.push(issue("paragraph-empty", `paragraphs.${index}`, "Boş paragraf"));
    else if (paragraph !== paragraph.trim()) issues.push(issue("paragraph-untrimmed", `paragraphs.${index}`, "Paragraf başında/sonunda boşluk var (offset'ler kayar)"));
  });
}

function validateWords(pack: PassagePack, issues: PackIssue[]): void {
  const seen = new Set<string>();
  let spanProblem = false;
  pack.words.forEach((word, wordIndex) => {
    const base = `words.${wordIndex}`;
    const identity = `${word.lemma}\u0000${word.gloss}`;
    if (seen.has(identity)) issues.push(issue("word-duplicate", base, `Aynı (lemma, anlam) iki kez: "${word.lemma}"`));
    seen.add(identity);
    // Video yolu lemma'yı normalizeGlossWord ile yazar; paketteki lemma farklı biçimdeyse ("Lighthouse") mevcut satırı
    // bulamaz, kelime defterinde kopya açardı.
    if (word.lemma !== normalizeGlossWord(word.lemma)) {
      issues.push(issue("lemma-not-normalized", `${base}.lemma`, `Lemma normalize biçimde olmalı: "${normalizeGlossWord(word.lemma)}"`));
    }

    for (const [spanIndex, span] of word.spans.entries()) {
      const paragraph = pack.paragraphs[span.paragraphIndex];
      const path = `${base}.spans.${spanIndex}`;
      if (paragraph === undefined) {
        spanProblem = true;
        issues.push(issue("span-paragraph-missing", path, `paragraphIndex ${span.paragraphIndex} yok`));
      } else if (span.end <= span.start || span.end > paragraph.length) {
        spanProblem = true;
        issues.push(issue("span-out-of-range", path, `[${span.start}, ${span.end}) paragraf dışında`));
      } else if (paragraph.slice(span.start, span.end) !== span.surface) {
        spanProblem = true;
        issues.push(issue("span-surface-mismatch", path, `Metinde "${paragraph.slice(span.start, span.end)}" var, "${span.surface}" yazılmış`));
      }
    }

    // İlk geçişin cümlesi: contextSentence, ilk span'ı içeren bir metin parçası olmalı (kaydedilen kaynak cümle).
    const first = [...word.spans].sort((a, b) => a.paragraphIndex - b.paragraphIndex || a.start - b.start)[0];
    const firstParagraph = first ? pack.paragraphs[first.paragraphIndex] : undefined;
    if (first && word.contextSentence.length <= first.end - first.start) {
      issues.push(issue("context-sentence-too-short", `${base}.contextSentence`, "contextSentence kelimenin kendisinden uzun, tam bir cümle/parça olmalı"));
    } else if (first && firstParagraph !== undefined && !containsAround(firstParagraph, word.contextSentence, first.start, first.end)) {
      issues.push(issue("context-sentence-mismatch", `${base}.contextSentence`, "contextSentence, kelimenin ilk geçtiği yeri içeren metin parçası değil"));
    }
  });

  // Çakışma: sunucunun kullandığı fonksiyonla (aralık/surface hatası zaten raporlandıysa tekrar etme).
  if (spanProblem) return;
  const info = new Map(pack.words.map((word, index) => [`w${index}`, { gloss: word.gloss, saved: false }]));
  pack.paragraphs.forEach((paragraph, paragraphIndex) => {
    if (paragraph.length === 0) return;
    const spans = pack.words.flatMap((word, index) =>
      word.spans.filter((span) => span.paragraphIndex === paragraphIndex).map((span) => ({ start: span.start, end: span.end, wordId: `w${index}`, surface: span.surface })),
    );
    try {
      buildParagraphRuns(paragraph, spans, info);
    } catch (error) {
      issues.push(issue("span-overlap", `paragraphs.${paragraphIndex}`, error instanceof Error ? error.message : String(error)));
    }
  });
}

function containsAround(paragraph: string, sentence: string, start: number, end: number): boolean {
  let from = paragraph.indexOf(sentence);
  while (from !== -1) {
    if (from <= start && from + sentence.length >= end) return true;
    from = paragraph.indexOf(sentence, from + 1);
  }
  return false;
}

function validateQuestions(pack: PassagePack, issues: PackIssue[]): void {
  const keys = new Set<string>();
  const correctPositions: number[] = [];

  pack.questions.forEach((question, questionIndex) => {
    const base = `questions.${questionIndex}`;
    if (keys.has(question.key)) issues.push(issue("question-key-duplicate", `${base}.key`, `Soru anahtarı tekrar: ${question.key}`));
    keys.add(question.key);

    const evidenceParagraph = pack.paragraphs[question.evidence.paragraphIndex];
    if (evidenceParagraph === undefined || question.evidence.end <= question.evidence.start || question.evidence.end > evidenceParagraph.length) {
      issues.push(issue("evidence-out-of-range", `${base}.evidence`, "Dayanak aralığı metinde yok"));
    }

    if (question.options.length !== 4) {
      issues.push(issue("option-count", `${base}.options`, `Soru başına 4 şık gerekir, ${question.options.length} var`));
    }
    const correct = question.options.flatMap((option, index) => (option.isCorrect ? [index] : []));
    if (correct.length !== 1) issues.push(issue("correct-count", `${base}.options`, `Tam 1 doğru şık gerekir, ${correct.length} var`));
    else correctPositions.push(correct[0]!);

    const optionKeys = new Set<string>();
    const optionTexts = new Set<string>();
    question.options.forEach((option, optionIndex) => {
      const path = `${base}.options.${optionIndex}`;
      if (optionKeys.has(option.key)) issues.push(issue("option-key-duplicate", `${path}.key`, `Şık anahtarı tekrar: ${option.key}`));
      optionKeys.add(option.key);
      const normalized = option.text.trim().toLowerCase();
      if (optionTexts.has(normalized)) issues.push(issue("option-text-duplicate", `${path}.text`, "Aynı şık metni iki kez"));
      optionTexts.add(normalized);
      // Yanlış şıkta tuzak türü zorunlu; doğru şıkta zorunlu DEĞİL (tasarım kararı). Gerekçe her şıkta zorunlu (şema).
      if (!option.isCorrect && option.trapType === null) {
        issues.push(issue("trap-type-missing", `${path}.trapType`, `Yanlış şıkta tuzak türü zorunlu (${PASSAGE_TRAP_TYPES.join(", ")})`));
      }
    });

    const lengths = question.options.map((option) => option.text.length);
    if (lengths.length > 0 && Math.max(...lengths) / Math.max(1, Math.min(...lengths)) > MAX_OPTION_LENGTH_RATIO) {
      issues.push(issue("option-length-ratio", `${base}.options`, `Şık uzunlukları çok farklı (oran > ${MAX_OPTION_LENGTH_RATIO})`));
    }
  });

  const counts = new Map<number, number>();
  for (const position of correctPositions) counts.set(position, (counts.get(position) ?? 0) + 1);
  for (const [position, count] of counts) {
    if (count > MAX_SAME_CORRECT_POSITION) {
      issues.push(issue("correct-position-skew", "questions", `Doğru cevap ${count} soruda aynı konumda (${position}); en fazla ${MAX_SAME_CORRECT_POSITION}`));
    }
  }
}

function validateEditorial(pack: PassagePack, issues: PackIssue[]): void {
  const { sources, noFactualClaims } = pack.editorial;
  if (sources.length === 0 && noFactualClaims !== true) {
    issues.push(issue("editorial-sources-missing", "editorial.sources", "Kaynak yok: kaynaklı iddia listesi ya da noFactualClaims: true gerekir"));
  }
}

/** Paket KÜMESİ kuralları (dosyalar arası): tekrar eden slug, (seviye, sıra) çakışması, ücretsiz örnek kuralı (B1/B2, seviye başına bir). */
export function validatePackSet(packs: readonly PassagePack[]): PackIssue[] {
  const issues: PackIssue[] = [];
  const slugs = new Set<string>();
  const positions = new Set<string>();
  const freeLevels = new Set<string>();
  for (const pack of packs) {
    if (slugs.has(pack.slug)) issues.push(issue("set-slug-duplicate", pack.slug, `Slug birden fazla pakette: ${pack.slug}`));
    slugs.add(pack.slug);
    const position = `${pack.level}:${pack.sortOrder}`;
    if (positions.has(position)) issues.push(issue("set-sort-order-duplicate", pack.slug, `(${pack.level}, sortOrder ${pack.sortOrder}) birden fazla pakette`));
    positions.add(position);
    if (pack.isFreeSample) {
      if (pack.level !== "B1" && pack.level !== "B2") issues.push(issue("free-sample-level", pack.slug, "Ücretsiz örnek yalnız B1 veya B2 olabilir"));
      if (freeLevels.has(pack.level)) issues.push(issue("free-sample-duplicate", pack.slug, `${pack.level} için birden fazla ücretsiz örnek`));
      freeLevels.add(pack.level);
    }
  }
  return issues;
}
