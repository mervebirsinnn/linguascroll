import type { PublishDraft } from "./publish-draft.schema";
import type { QualityIssue, QualityIssueCode, QualityIssueSeverity, QualityReport, QualityStatus } from "./content-quality.schema";

/**
 * Chunk 13 — Content Quality Gate. TEK public export: `evaluateContentQuality`.
 * Geri kalan her şey private — `personalization-ranking.ts`'teki desenle AYNI
 * (çok sayıda küçük private helper, TEK test edilen public fonksiyon). Bir
 * rule-registry/plugin sistemi/BaseQualityRule hiyerarşisi YOK — bu dosya
 * sadece sabit bir kontrol listesini SIRAYLA çalıştırıp issue'ları topluyor.
 *
 * `Omit<PublishDraft, "quality">`: fonksiyonun kendi ürettiği `quality`
 * alanını GİRDİ olarak OKUYAMAMASI tip seviyesinde garanti ediliyor (kullanıcı
 * kararı — dairesel bağımlılık istemiyoruz). Bu, gerçek bir modül import
 * döngüsü de YARATMIYOR: bu dosya `publish-draft.schema.ts`'i import ediyor,
 * ama `publish-draft.schema.ts` bu dosyayı hiç bilmiyor (sadece
 * `content-quality.schema.ts`'i import ediyor) — döngü sadece TİP seviyesinde
 * bilinçli olarak kesiliyor, modül grafiğinde hiç yok.
 */
export type QualityCheckContent = Omit<PublishDraft, "quality">;
type QualityCheckSegment = QualityCheckContent["segments"][number];
type QualityCheckLearningPoint = QualityCheckContent["learningPoints"][number];
type QualityCheckVocabularyItem = QualityCheckContent["vocabulary"][number];

/**
 * Madde 7 — devasa bir stopword/NLP kütüphanesi YOK, LinguaScroll için küçük,
 * elle seçilmiş, statik bir ignore-set. Yeni bir dependency gerektirmiyor.
 */
const IGNORED_VOCABULARY_LEMMAS = new Set([
  "a", "an", "the", "and", "or", "but", "is", "am", "are", "was", "were", "be", "been", "being",
  "to", "of", "in", "on", "at", "for", "with", "as", "by", "from", "very", "so", "this", "that",
  "these", "those", "it", "its", "he", "she", "they", "we", "you", "i", "not", "no", "yes", "do", "does", "did",
]);

const MAX_EXPLANATION_CHARS = 400;
const TRIVIAL_SEGMENT_MAX_WORDS = 3;
const TRIVIAL_SEGMENT_EXPLANATION_MAX_CHARS = 150;
const MAX_LEARNING_POINTS_PER_SEGMENT = 2;
const THIN_TRANSCRIPT_MIN_SEGMENTS = 3;
const MIN_QUESTION_CHARS = 8;
const MIN_OPTION_CHARS = 2;
/**
 * Chunk 14 kalibrasyonu — `quizTooTrivial` SADECE alıntılanan segment metni
 * sorunun karakter uzunluğunun bu ORANDAN FAZLASINI kaplıyorsa tetiklenir
 * (yani sorunun geri kalanı — gerçek soru içeriği — ihmal edilebilir kısa).
 * "'{segment}' — gerçek bir soru?" kalıbı (mevcut, meşru içeriğin çoğu bunu
 * kullanıyor) genelde %30-40 civarı bir oranla bu eşiğin ALTINDA kalır.
 */
const TRIVIAL_QUIZ_QUOTE_DOMINANCE_RATIO = 0.7;

function issue(code: QualityIssueCode, severity: QualityIssueSeverity, segmentOrdinal: number | null, message: string): QualityIssue {
  return { code, severity, segmentOrdinal, message };
}

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

/**
 * Madde 4 — Zod/STT tarafından ZATEN garanti edilenler burada TEKRARLANMIYOR:
 * boş `segments` dizisi (şema `.min(1)`), tek-segment `endMs > startMs` (şema
 * `.refine`), aşırı uzun/kısa TEK segment süresi/karakteri (STT'nin
 * `MAX_SEGMENT_DURATION_MS`/`MAX_SEGMENT_CHARS`'ı zaten üretim anında zorluyor).
 * Burada YENİ olan: (1) whitespace-only metin (`.min(1)` bunu YAKALAMIYOR —
 * tek bir " " karakteri uzunluk 1), (2) CROSS-segment sıra/overlap bütünlüğü
 * (tek-segment refine bunu hiç bilmiyor), (3) bitişik segment tekrarı,
 * (4) toplam transcript'in çok ince olması.
 */
function checkTranscriptQuality(segments: readonly QualityCheckSegment[]): QualityIssue[] {
  const issues: QualityIssue[] = [];

  if (segments.length === 0) {
    // Defense-in-depth — publishDraftSchema zaten `.min(1)` ile engelliyor,
    // ama bu fonksiyon doğrudan (şema'yı bypass eden) bir girdiyle de
    // çağrılabilir (bkz. content-quality-gate.spec.ts).
    issues.push(issue("emptyTranscript", "reject", null, "Transcript hiç segment içermiyor."));
    return issues;
  }

  for (const segment of segments) {
    if (segment.text.trim().length === 0) {
      issues.push(issue("whitespaceOnlySegment", "reject", segment.ordinal, `Segment ${segment.ordinal} sadece boşluk karakterlerinden oluşuyor.`));
    }
  }

  const sorted = [...segments].sort((a, b) => a.ordinal - b.ordinal);
  for (let i = 1; i < sorted.length; i++) {
    const previous = sorted[i - 1]!;
    const current = sorted[i]!;
    if (current.startMs < previous.endMs) {
      issues.push(
        issue(
          "overlappingSegments",
          "reject",
          current.ordinal,
          `Segment ${current.ordinal} (start=${current.startMs}ms), önceki segment ${previous.ordinal}'in bitişinden (${previous.endMs}ms) ÖNCE başlıyor.`,
        ),
      );
    }
    if (current.text.trim().toLowerCase() === previous.text.trim().toLowerCase()) {
      issues.push(issue("duplicateAdjacentSegment", "warning", current.ordinal, `Segment ${current.ordinal}, bir önceki segmentle (${previous.ordinal}) birebir aynı metne sahip.`));
    }
  }

  if (segments.length < THIN_TRANSCRIPT_MIN_SEGMENTS) {
    issues.push(issue("thinTranscript", "warning", null, `Transcript sadece ${segments.length} segment içeriyor — çok kısa/anlamsız olabilir.`));
  }

  return issues;
}

/**
 * Madde 5 — gerçek dil tespiti YOK (ML/LLM eklenmiyor). `explanationLanguagesIdentical`
 * SADECE normalize edilip BİREBİR string eşitliği kontrol ediyor — güvenilir,
 * düşük false-positive riskli TEK sinyal. Daha "akıllı" bir heuristik (örn.
 * Türkçe'ye özgü karakter sayımı) BİLİNÇLİ OLARAK eklenmedi çünkü güvenilir
 * şekilde kontrol edilemez (kısa/karaktersiz Türkçe cümlelerde yanlış pozitif
 * riski yüksek) — "basit, güvenilir şekilde kontrol edilemeyen şeyi deterministic
 * gate'e zorla koyma" kararı.
 */
function checkExplanationQuality(segments: readonly QualityCheckSegment[]): QualityIssue[] {
  const issues: QualityIssue[] = [];

  for (const segment of segments) {
    const en = segment.englishExplanation.trim();
    const tr = segment.turkishExplanation.trim();
    const text = segment.text.trim();

    if (en.length === 0 || tr.length === 0) {
      // whitespaceOnlySegment ile AYNI gerekçe: `.min(1)` whitespace'i durdurmuyor.
      issues.push(issue("emptyExplanation", "reject", segment.ordinal, `Segment ${segment.ordinal}'in İngilizce ve/veya Türkçe açıklaması boş/sadece boşluk.`));
      continue;
    }

    if (en.toLowerCase() === text.toLowerCase() || tr.toLowerCase() === text.toLowerCase()) {
      issues.push(issue("explanationMatchesTranscriptVerbatim", "warning", segment.ordinal, `Segment ${segment.ordinal}'in açıklaması, transcript metniyle birebir aynı — gerçek bir açıklama üretilmemiş olabilir.`));
    }

    const isTrivialSegment = countWords(text) <= TRIVIAL_SEGMENT_MAX_WORDS;
    if (en.length > MAX_EXPLANATION_CHARS || tr.length > MAX_EXPLANATION_CHARS) {
      issues.push(issue("explanationTooLong", "warning", segment.ordinal, `Segment ${segment.ordinal}'in açıklaması alışılmadık derecede uzun (>${MAX_EXPLANATION_CHARS} karakter).`));
    } else if (isTrivialSegment && (en.length > TRIVIAL_SEGMENT_EXPLANATION_MAX_CHARS || tr.length > TRIVIAL_SEGMENT_EXPLANATION_MAX_CHARS)) {
      issues.push(
        issue(
          "explanationDisproportionateForTrivialSegment",
          "warning",
          segment.ordinal,
          `Segment ${segment.ordinal} çok kısa/trivial ("${segment.text}") ama açıklaması orantısız uzun.`,
        ),
      );
    }

    if (en.toLowerCase() === tr.toLowerCase()) {
      issues.push(issue("explanationLanguagesIdentical", "warning", segment.ordinal, `Segment ${segment.ordinal}'in İngilizce ve Türkçe açıklamaları birebir aynı — Türkçe çeviri eksik olabilir.`));
    }
  }

  return issues;
}

/**
 * Madde 6 — Zod tarafından zaten garanti edilenler (boş `expression`, geçersiz
 * `type`) burada TEKRARLANMIYOR.
 *
 * `learningPointExpressionNotInTranscript` KESİNLİKLE bir semantic correctness
 * garantisi DEĞİL — kullanıcı kararı gereği SADECE "warning" severity'de.
 * "end up + V-ing" gibi pedagojik notation'lar transcript'te literal olarak
 * BULUNMAZ (konuşulan gerçek ifade "ended up staying" olabilir) — bu substring
 * kontrolü sadece bir "şüpheli sinyal", reviewer'ın bakması için. Stemming/
 * lemmatization/NLP dependency eklenmedi (bilinçli kapsam dışı).
 */
function checkLearningPointQuality(
  learningPoints: readonly QualityCheckLearningPoint[],
  segmentsByOrdinal: ReadonlyMap<number, QualityCheckSegment>,
): QualityIssue[] {
  const issues: QualityIssue[] = [];
  const countBySegment = new Map<number, number>();
  const seenExpressions = new Set<string>();

  for (const learningPoint of learningPoints) {
    countBySegment.set(learningPoint.segmentOrdinal, (countBySegment.get(learningPoint.segmentOrdinal) ?? 0) + 1);

    const key = learningPoint.expression.trim().toLowerCase();
    if (seenExpressions.has(key)) {
      issues.push(issue("duplicateLearningPoint", "warning", learningPoint.segmentOrdinal, `Learning point ifadesi ("${learningPoint.expression}") birden fazla kez üretilmiş.`));
    } else {
      seenExpressions.add(key);
    }

    const segment = segmentsByOrdinal.get(learningPoint.segmentOrdinal);
    if (segment) {
      const segmentText = segment.text.toLowerCase();
      if (key.length > 0 && !segmentText.includes(key)) {
        issues.push(
          issue(
            "learningPointExpressionNotInTranscript",
            "warning",
            learningPoint.segmentOrdinal,
            `Learning point ifadesi ("${learningPoint.expression}") segment ${learningPoint.segmentOrdinal}'in transcript metninde literal olarak bulunamadı — pedagojik notation/çekim farkı olabilir, yanlış pozitif olasılığı var.`,
          ),
        );
      }
      if (countWords(segment.text) <= TRIVIAL_SEGMENT_MAX_WORDS) {
        issues.push(
          issue(
            "learningPointOnTrivialSegment",
            "warning",
            learningPoint.segmentOrdinal,
            `Segment ${learningPoint.segmentOrdinal} çok kısa/trivial ("${segment.text}") ama bir learning point üretilmiş.`,
          ),
        );
      }
    }
  }

  for (const [segmentOrdinal, count] of countBySegment) {
    if (count > MAX_LEARNING_POINTS_PER_SEGMENT) {
      issues.push(issue("tooManyLearningPointsForSegment", "warning", segmentOrdinal, `Segment ${segmentOrdinal} için ${count} learning point üretilmiş (önerilen üst sınır: ${MAX_LEARNING_POINTS_PER_SEGMENT}).`));
    }
  }

  return issues;
}

/**
 * Madde 7 — Zod tarafından garanti edilen boş `lemma`/`gloss` burada
 * TEKRARLANMIYOR. `vocabularyLemmaNotInTranscript` — learning point'teki AYNI
 * gerekçeyle SADECE warning (çekim/inflection farkı false-positive riski,
 * bkz. checkLearningPointQuality yorumu).
 */
function checkVocabularyQuality(vocabulary: readonly QualityCheckVocabularyItem[], fullTranscriptText: string): QualityIssue[] {
  const issues: QualityIssue[] = [];

  if (vocabulary.length === 0) {
    issues.push(issue("emptyVocabulary", "warning", null, "Vocabulary listesi boş. Video gerçekten öğretmeye değer kelime/ifade içermiyorsa normal olabilir, ama kontrol edilmeli."));
    return issues;
  }

  const seenLemmas = new Set<string>();
  for (const item of vocabulary) {
    const lemma = item.lemma.trim().toLowerCase();

    if (seenLemmas.has(lemma)) {
      issues.push(issue("duplicateVocabularyLemma", "warning", null, `"${item.lemma}" birden fazla kez vocabulary'e eklenmiş.`));
    } else {
      seenLemmas.add(lemma);
    }

    if (IGNORED_VOCABULARY_LEMMAS.has(lemma)) {
      issues.push(issue("trivialVocabularyLemma", "warning", null, `"${item.lemma}" çok temel/trivial bir kelime — muhtemelen öğretmeye değmez.`));
    }

    if (lemma.length > 0 && !fullTranscriptText.includes(lemma)) {
      issues.push(
        issue(
          "vocabularyLemmaNotInTranscript",
          "warning",
          null,
          `"${item.lemma}" transcript metninde literal olarak bulunamadı — çekim/inflection farkı olabilir, yanlış pozitif olasılığı var.`,
        ),
      );
    }
  }

  return issues;
}

/**
 * Madde 8 — semantic correctness'i KESİN ölçmeye çalışmıyor (canlı LLM kalite
 * kanıtı sonrasına bırakıldı). Zod tarafından garanti edilenler (tam bir doğru
 * cevap, 4 seçenek, quiz source segment referansı) burada TEKRARLANMIYOR.
 */
function checkQuizQuality(quiz: QualityCheckContent["quiz"], segmentsByOrdinal: ReadonlyMap<number, QualityCheckSegment>): QualityIssue[] {
  const issues: QualityIssue[] = [];
  const question = quiz.question.trim();

  if (question.length === 0) {
    issues.push(issue("emptyQuizQuestion", "reject", quiz.segmentOrdinal, "Quiz sorusu boş/sadece boşluk."));
  } else if (question.length < MIN_QUESTION_CHARS) {
    issues.push(issue("quizTooShort", "warning", quiz.segmentOrdinal, `Quiz sorusu alışılmadık derecede kısa: "${quiz.question}".`));
  }

  for (const option of quiz.options) {
    if (option.text.trim().length < MIN_OPTION_CHARS) {
      issues.push(issue("quizTooShort", "warning", quiz.segmentOrdinal, `Quiz seçeneği alışılmadık derecede kısa: "${option.text}".`));
    }
  }

  const normalizedOptionTexts = quiz.options.map((option) => option.text.trim().toLowerCase());
  const seenOptionTexts = new Set<string>();
  let hasDuplicateOption = false;
  for (const text of normalizedOptionTexts) {
    if (seenOptionTexts.has(text)) {
      hasDuplicateOption = true;
    }
    seenOptionTexts.add(text);
  }
  if (hasDuplicateOption) {
    // Hem "duplicate options" hem "correct answer bir distractor'la aynı"
    // senaryosunu TEK kontrol kapsıyor — case-insensitive aynı metinli iki
    // seçenek quiz'i cevaplanamaz/anlamsız hale getirir, bu yüzden reject.
    issues.push(issue("duplicateQuizOptions", "reject", quiz.segmentOrdinal, "Quiz seçeneklerinden en az ikisi (case-insensitive) birebir aynı metne sahip."));
  }

  const segment = segmentsByOrdinal.get(quiz.segmentOrdinal);
  if (segment && question.length > 0) {
    // Sondaki noktalama (./!/?) STRIP ediliyor — bir soru segment metnini
    // AYNEN kopyalarken noktalamayı değiştirmesi/kaldırması çok olası
    // ("books." → "books" veya "books?"), bu yüzden karşılaştırma noktalamaya
    // duyarlı OLMAMALI.
    const segmentText = segment.text.trim().toLowerCase().replace(/[.!?]+$/, "");
    // Chunk 13 audit'i (Chunk 14'te kalibre edildi) — SADECE segment metninin
    // question içinde geçmesi false-positive üretiyordu: mevcut, meşru
    // içeriğin ÇOĞU "'{segment}' — gerçek soru?" kalıbını kullanıyor (bağlam
    // için cümleyi alıntılayıp SONRA asıl soruyu soruyor). Bunu, "quote soruyu
    // ele geçiriyor mu" (question'ın BÜYÜK ÇOĞUNLUĞU alıntı, geri kalanı
    // ihmal edilebilir) sinyaline göre ayırt ediyoruz — deterministik olarak
    // güvenilir ayırt edilemeyen (quote + gerçek soru KARIŞIK) durumlarda
    // CONSERVATIVE davranıp flag ATMIYORUZ (madde 9 kararı).
    const quoteShareOfQuestion = segmentText.length / question.length;
    if (segmentText.length > 0 && question.toLowerCase().includes(segmentText) && quoteShareOfQuestion > TRIVIAL_QUIZ_QUOTE_DOMINANCE_RATIO) {
      issues.push(issue("quizTooTrivial", "warning", quiz.segmentOrdinal, "Quiz sorusu neredeyse TAMAMEN kaynak segment'in transcript metninden oluşuyor, gerçek bir soru içeriği yok/çok az — çok trivial olabilir (örn. \"What did they say?\" + transcript kopyası)."));
    }
  }

  return issues;
}

/**
 * Madde 10 — `status`, issue'ların severity'sinin EN KÖTÜSÜ (reject > needsReview
 * > pass) — ayrı bir skorlama/ağırlıklandırma motoru YOK, iki satırlık bir
 * indirgeme. `content.quality` HİÇ okunmuyor (parametre tipi zaten bunu
 * imkansız kılıyor, bkz. dosya başı yorumu) — dairesel bağımlılık yok.
 */
export function evaluateContentQuality(content: QualityCheckContent): QualityReport {
  const segmentsByOrdinal = new Map(content.segments.map((segment) => [segment.ordinal, segment]));
  const fullTranscriptText = content.segments.map((segment) => segment.text).join(" ").toLowerCase();

  const issues: QualityIssue[] = [
    ...checkTranscriptQuality(content.segments),
    ...checkExplanationQuality(content.segments),
    ...checkLearningPointQuality(content.learningPoints, segmentsByOrdinal),
    ...checkVocabularyQuality(content.vocabulary, fullTranscriptText),
    ...checkQuizQuality(content.quiz, segmentsByOrdinal),
  ];

  const status: QualityStatus = issues.some((current) => current.severity === "reject")
    ? "reject"
    : issues.length > 0
      ? "needsReview"
      : "pass";

  return { status, issues };
}
