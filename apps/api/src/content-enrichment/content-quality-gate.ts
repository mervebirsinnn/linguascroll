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

/**
 * Chunk 16 revizyonu — gerçek cihaz testinde bulunan bulgu: quiz'ler PLACEMENT
 * açısından doğru (kaynak video her zaman doğru sırada), ama İÇERİK olarak
 * izlenen videoyla "bağlantısız hissettiriyor" ve çoğu zaman gereğinden kolay/
 * A1-seviyesinde. Bu üç sabit/helper, o problemin deterministik (LLM/CEFR-
 * skorlama içermeyen) bir kısmını yakalayan YENİ kontrollerin ortak altyapısı.
 *
 * Kasıtlı olarak YAPILMAYAN şey: CEFR seviyesine göre zorluk uyumu kontrolü.
 * "B1/B2 sorusu A1-seviyesine düşmesin" kararı (madde 5/6) — PROMPT seviyesinde
 * (bkz. enrichment-llm-client.ts SYSTEM_PROMPT) ele alınıyor, burada DEĞİL:
 * "bu soru B2'ye göre çok mu kolay" sorusu güvenilir şekilde deterministik
 * kurallarla cevaplanamaz (gerçek bir CEFR-zorluk sınıflandırıcısı gerektirir,
 * kullanıcı kararı gereği bu KAPSAM DIŞI). Burada SADECE CEFR'den bağımsız,
 * evrensel olarak "kötü quiz" sayılan desenler kontrol ediliyor.
 */
function tokenize(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter(Boolean),
  );
}

/** `tokenize`'ın aksine, `IGNORED_VOCABULARY_LEMMAS`'taki (the/is/a/...) kelimeleri de eler — "bu quiz kaynak segmentle ANLAMLI bir kelime paylaşıyor mu" sorusu için, sadece ortak "the"/"a" gibi kelimelerin yanlışlıkla "grounded" saydırmasını önlemek amacıyla. */
function meaningfulWords(text: string): Set<string> {
  return new Set([...tokenize(text)].filter((word) => word.length > 2 && !IGNORED_VOCABULARY_LEMMAS.has(word)));
}

function jaccardSimilarity(a: ReadonlySet<string>, b: ReadonlySet<string>): number {
  if (a.size === 0 && b.size === 0) {
    return 1;
  }
  let intersectionSize = 0;
  for (const item of a) {
    if (b.has(item)) {
      intersectionSize++;
    }
  }
  const unionSize = a.size + b.size - intersectionSize;
  return unionSize === 0 ? 0 : intersectionSize / unionSize;
}

/**
 * İki seçenek birebir aynı DEĞİL (o zaten `duplicateQuizOptions`/reject) ama
 * kelime kümesi düzeyinde büyük ölçüde ÖRTÜŞÜYORSA ("can provide benefits but
 * also create risks" vs "can create risks but also provide benefits" gibi bir
 * yeniden-sıralama/parafraz) — quiz'i fiilen cevaplanamaz/anlamsız hale
 * getiren "near-duplicate distractor" paterni. Eşik (0.8) KASITLI OLARAK
 * yüksek tutuluyor — tipik, meşru distractor'lar (aynı kategoriden ama farklı
 * kelimelerle: "Cooking food" / "Playing games") çok daha düşük skor üretir.
 */
const NEAR_DUPLICATE_QUIZ_OPTION_JACCARD_THRESHOLD = 0.8;

/**
 * Bilinen bir LLM quiz-üretim paterni: doğru cevap, distractor'lardan BELİRGİN
 * ŞEKİLDE uzun/kısa olduğunda, okumadan/anlamadan sadece "en detaylı görünen
 * seçenek" seçilerek doğru cevap tahmin edilebiliyor — madde 9'un ("videoyu
 * izlemeden cevaplanabilir olmasın") deterministik olarak yakalanabilen tek
 * alt-kümesi. Oran (1.8x) KASITLI OLARAK gevşek — meşru, doğal uzunluk
 * farklılıklarını false-positive ÜRETMEYECEK şekilde kalibre edildi.
 *
 * SADECE oran YETERSİZ: kısa tek-kelimelik seçeneklerde ("No" vs "Food"/
 * "Walk"/"Bowl" gibi — gerçek, meşru bir LinguaScroll quiz'i, bkz.
 * pipeline.e2e-spec.ts fixture'ı) birkaç karakterlik fark bile oranı kolayca
 * eşiğin üstüne çıkarıyor. Bu yüzden MUTLAK karakter farkı da (madde: en az
 * bu kadar karakter fark olmalı) AYRICA gerekiyor — sadece "uzun bir cümle
 * seçeneği, tek kelimelik distractor'lar arasında göze batıyor" gibi GERÇEK
 * anlamda göze çarpan durumları yakalamak için.
 */
const QUIZ_ANSWER_LENGTH_OUTLIER_RATIO = 1.8;
const QUIZ_ANSWER_LENGTH_OUTLIER_MIN_ABSOLUTE_DIFFERENCE_CHARS = 6;

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
    if (option.text.trim().length === 0) {
      // `quizTooShort` (aşağıda, <2 karakter) BUNU DA yakalar ama "obviously
      // weak distractor" istekindeki (bkz. dosya başı Chunk 16 yorumu) TAMAMEN
      // boş seçenek durumu, ayrıca reject şiddetinde KENDİ koduyla işaretleniyor
      // — quizTooShort SADECE warning, ama tamamen boş bir seçenek quiz'i
      // fiilen bozar (duplicateQuizOptions'la AYNI şiddet gerekçesi).
      issues.push(issue("emptyQuizOption", "reject", quiz.segmentOrdinal, "Quiz seçeneklerinden biri tamamen boş/sadece boşluk."));
    } else if (option.text.trim().length < MIN_OPTION_CHARS) {
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

  // Chunk 16 revizyonu — near-duplicate seçenekler (birebir aynı DEĞİL ama
  // kelime kümesi düzeyinde büyük ölçüde örtüşüyor, bkz. dosya başı yorumu).
  // `hasDuplicateOption` ile İŞARETLENMİŞ birebir-aynı çiftler burada TEKRAR
  // flag edilmiyor (jaccard zaten 1 olur ama farklı bir kod/mesaj üretmemek
  // için `text === text` durumunu atlıyoruz).
  const optionTokenSets = quiz.options.map((option) => tokenize(option.text));
  let hasNearDuplicateOption = false;
  for (let i = 0; i < optionTokenSets.length && !hasNearDuplicateOption; i++) {
    for (let j = i + 1; j < optionTokenSets.length; j++) {
      if (normalizedOptionTexts[i] === normalizedOptionTexts[j]) {
        continue; // birebir aynı — duplicateQuizOptions zaten yakaladı
      }
      if (jaccardSimilarity(optionTokenSets[i]!, optionTokenSets[j]!) >= NEAR_DUPLICATE_QUIZ_OPTION_JACCARD_THRESHOLD) {
        hasNearDuplicateOption = true;
        break;
      }
    }
  }
  if (hasNearDuplicateOption) {
    issues.push(
      issue(
        "nearDuplicateQuizOptions",
        "warning",
        quiz.segmentOrdinal,
        "Quiz seçeneklerinden en az ikisi birebir aynı değil ama kelime düzeyinde büyük ölçüde örtüşüyor (parafraz/yeniden sıralama) — doğru cevabı belirsizleştirebilir.",
      ),
    );
  }

  const correctOption = quiz.options.find((option) => option.isCorrect);
  if (correctOption) {
    // Chunk 16 revizyonu — "trivially easy pattern" (madde 9): doğru cevap
    // uzunluk olarak distractor'lardan belirgin şekilde sapıyorsa, soru
    // OKUNMADAN/ANLAŞILMADAN da tahmin edilebilir hale gelir (bkz. dosya başı
    // yorumu). Boş/az karakterli distractor'lar (zaten ayrı kodlarla
    // yakalanıyor) bu ortalamayı BOZMASIN diye hesaplamadan çıkarılıyor.
    const distractorLengths = quiz.options
      .filter((option) => !option.isCorrect)
      .map((option) => option.text.trim().length)
      .filter((length) => length > 0);
    if (distractorLengths.length > 0) {
      const averageDistractorLength = distractorLengths.reduce((sum, length) => sum + length, 0) / distractorLengths.length;
      const correctLength = correctOption.text.trim().length;
      const isRatioOutlier =
        averageDistractorLength > 0 &&
        (correctLength > averageDistractorLength * QUIZ_ANSWER_LENGTH_OUTLIER_RATIO ||
          correctLength * QUIZ_ANSWER_LENGTH_OUTLIER_RATIO < averageDistractorLength);
      const isOutlier =
        isRatioOutlier && Math.abs(correctLength - averageDistractorLength) >= QUIZ_ANSWER_LENGTH_OUTLIER_MIN_ABSOLUTE_DIFFERENCE_CHARS;
      if (isOutlier) {
        issues.push(
          issue(
            "quizAnswerLengthOutlier",
            "warning",
            quiz.segmentOrdinal,
            `Doğru cevap ("${correctOption.text}", ${correctLength} karakter) uzunluk olarak diğer seçeneklerden (ortalama ${averageDistractorLength.toFixed(1)} karakter) belirgin şekilde farklı — bilinen bir "okumadan tahmin edilebilir quiz" paterni.`,
          ),
        );
      }
    }
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

    // Chunk 16 revizyonu — gerçek cihaz bulgusu: quiz PLACEMENT olarak doğru
    // videoya ait olsa da, İÇERİK olarak o segmentte GEÇMEYEN bir şeyi test
    // ediyor hissi verebiliyor. "Anlamlı kelime" (stopword'ler hariç) düzeyinde
    // SIFIR ortak kelime varsa, soru + doğru cevap muhtemelen segment'in
    // dışından (başka bir segment/genel konu bilgisi) üretilmiş demektir.
    // Paraphrase/idiom-anlamı sorularının ÇOĞU gene de test edilen ifadeyi
    // (örn. "double-edged sword") soru metninde ALINTILAR — bu yüzden bu
    // kontrol düşük false-positive riskiyle warning seviyesinde tutuluyor
    // (learningPointExpressionNotInTranscript'teki AYNI temkinli yaklaşım).
    if (correctOption) {
      const segmentWords = meaningfulWords(segment.text);
      const quizWords = meaningfulWords(`${question} ${correctOption.text}`);
      const hasSharedMeaningfulWord = [...quizWords].some((word) => segmentWords.has(word));
      if (segmentWords.size > 0 && quizWords.size > 0 && !hasSharedMeaningfulWord) {
        issues.push(
          issue(
            "quizConceptNotGroundedInSegment",
            "warning",
            quiz.segmentOrdinal,
            `Quiz sorusu ve doğru cevabı, kaynak segment ${quiz.segmentOrdinal}'in metniyle (anlamlı kelime düzeyinde) hiçbir kelime paylaşmıyor — soru başka bir segment/genel konudan üretilmiş olabilir, kaynak segment'i gerçekten test etmiyor olabilir.`,
          ),
        );
      }
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
