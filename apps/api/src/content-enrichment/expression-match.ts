/**
 * Quality gate'in `learningPointExpressionNotInTranscript` / `vocabularyLemmaNotInTranscript`
 * kontrolleri için küçük, deterministik "ifade transcript'te geçiyor mu" seam'i.
 *
 * SORUMLULUK SINIRI: bu modül YALNIZCA yüzey-biçim (surface-form) varlığını kontrol eder —
 * "bu kelime dizisi, çekim ekleri/notation farkı tolere edilerek metinde geçiyor mu". Anlamsal
 * eşdeğerlik, eş anlamlılık, doğru lemma tespiti veya "aynı ifade" iddiasında BULUNMAZ. Eşleşme
 * "içerik doğru" demek değildir, eşleşmeme de "yanlış" demek değildir; sonuç sadece bir
 * reviewer sinyalidir (gate'te `warning`).
 *
 * Düz `text.includes(expression)` çekim farkında ("take aback" ↔ "taken aback"), araya kelime
 * girmesinde ("hear out" ↔ "hear you out") ve pedagojik notation'larda ("be good at + V-ing",
 * "should have + past participle") yanlış pozitif; alt-dize eşleşmesinde ("art" ↔ "start")
 * yanlış negatif üretiyordu. Karar: stemming/NLP kütüphanesi YOK — (1) TOKEN-sınırlı karşılaştırma
 * (alt-dize eşleşmesi yok), (2) küçük düzensiz-fiil tablosu, (3) kaba suffix soyucu (kök en az
 * MIN_STEM_LENGTH harf), (4) notation/placeholder atma, (5) ifade kelimelerinin SIRAYLA ve araya
 * en fazla MAX_GAP_WORDS kelime girerek bulunması.
 *
 * Hyphen boşluğu ("double -edged") eşleştirme için normalize edilir, AMA bu bozuk yazımı
 * meşrulaştırmaz: biçim hatasını quality gate'in AYRI `malformedHyphenSpacing` uyarısı yakalar
 * (bkz. content-quality-gate.ts).
 */
const MAX_GAP_WORDS = 1;
// Suffix soyulduktan sonra kök bundan kısaysa kelime soyulmaz ("need"→"ne", "bring"→"br" olmasın).
const MIN_STEM_LENGTH = 3;

// Notation: "+" ve sonrası (ör. "be good at + V-ing", "should have + past participle") atılır.
// Placeholder'lar ("someone", "something", "one's") metinde somut bir kelimeyle değişeceği için atılır.
const PLACEHOLDER_WORDS = new Set(["someone", "somebody", "something", "sb", "sth", "one's", "ones"]);

// Placeholder olmasa da araya girebilen, anlamı değiştirmeyen küçük dolgu kelimeleri (stem hâlinde).
const FILLER_WORDS_RAW = ["not", "never", "just", "really", "simply", "also", "only", "always", "still", "even", "very", "quite", "already", "often", "ever", "all",
  // Ayrılabilen phrasal verb'lerde araya giren nesne zamiri ("hear you out", "take it back").
  "me", "you", "him", "her", "us", "them", "it"];

const IRREGULAR_STEMS: Readonly<Record<string, string>> = {
  am: "be", is: "be", are: "be", was: "be", were: "be", been: "be", being: "be",
  has: "have", had: "have", having: "have",
  does: "do", did: "do", done: "do", doing: "do",
  took: "take", taken: "take", takes: "take", taking: "take",
  made: "make", makes: "make", making: "make",
  got: "get", gotten: "get", gets: "get", getting: "get",
  gave: "give", given: "give", gives: "give", giving: "give",
  went: "go", gone: "go", goes: "go", going: "go",
  saw: "see", seen: "see", sees: "see",
  came: "come", comes: "come", coming: "come",
  ran: "run", runs: "run", running: "run",
  knew: "know", known: "know", knows: "know",
  said: "say", says: "say",
  thought: "think", thinks: "think",
  kept: "keep", keeps: "keep",
  left: "leave", leaves: "leave",
  brought: "bring", brings: "bring",
  told: "tell", tells: "tell",
  found: "find", finds: "find",
};

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/(\w)\s+-\s*(\w)/g, "$1-$2") // STT'nin ürettiği "double -edged" boşluğu
    .replace(/[-]/g, " ")
    .replace(/[^a-z0-9'\s+]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

/** Sondaki 'e' atılır: düzensiz tablo sonucu ("take") ile suffix-soyulmuş hali ("tak"+"ing") aynı kökte buluşsun. */
function dropTrailingE(word: string): string {
  return word.endsWith("e") && word.length > 3 ? word.slice(0, -1) : word;
}

/** Kaba stem: düzensiz tablo, sonra suffix soyma; sondaki çift harf ve 'e' normalize edilir. */
function stem(word: string): string {
  const irregular = IRREGULAR_STEMS[word];
  if (irregular) {
    return dropTrailingE(irregular);
  }
  let result = word;
  if (result.length > 4 && result.endsWith("ing")) {
    result = result.slice(0, -3);
  } else if (result.length > 3 && result.endsWith("ed")) {
    result = result.slice(0, -2);
  } else if (result.length > 4 && result.endsWith("ies")) {
    result = `${result.slice(0, -3)}y`;
  } else if (result.length > 3 && result.endsWith("es")) {
    result = result.slice(0, -2);
  } else if (result.length > 3 && result.endsWith("s") && !result.endsWith("ss")) {
    result = result.slice(0, -1);
  }
  if (result.length > 3 && result[result.length - 1] === result[result.length - 2]) {
    result = result.slice(0, -1);
  }
  // Aşırı soyma koruması: kök çok kısaldıysa orijinal kelime korunur.
  if (result.length < MIN_STEM_LENGTH) {
    return word;
  }
  return dropTrailingE(result);
}

// Metin tarafı stem'lenmiş karşılaştırıldığı için dolgu kelimeleri de stem hâlinde tutulur.
const FILLER_WORDS = new Set(FILLER_WORDS_RAW.map(stem));

/** Ifade kelimesinin kökü + "bu kelimeden önce, placeholder yüzünden araya HERHANGİ bir kelime girebilir" bilgisi. */
interface WantedToken {
  readonly stem: string;
  readonly anyGapBefore: boolean;
}

function expressionTokens(expression: string): WantedToken[] {
  const beforeNotation = expression.split("+")[0] ?? "";
  const tokens: WantedToken[] = [];
  let pendingPlaceholder = false;
  for (const word of tokenize(beforeNotation)) {
    if (PLACEHOLDER_WORDS.has(word)) {
      pendingPlaceholder = true;
      continue;
    }
    tokens.push({ stem: stem(word), anyGapBefore: pendingPlaceholder });
    pendingPlaceholder = false;
  }
  return tokens;
}

/**
 * `expression`, `text` içinde (çekim farkı, notation ve sınırlı araya-girme toleransıyla) YÜZEY
 * BİÇİMİ olarak geçiyor mu. Sadece token-sınırlı stem-subsequence; anlam iddiası yok. Araya girebilen:
 * placeholder'ın ("hear someone out") yerine geçen en fazla MAX_GAP_WORDS kelime VEYA FILLER_WORDS
 * ("be good at" ↔ "am not good at"). Başka hiçbir kelime araya giremez ("black ice" ≠ "black and ice").
 */
export function expressionAppearsInText(expression: string, text: string): boolean {
  if (expression.trim().length === 0) {
    return true;
  }
  const wanted = expressionTokens(expression);
  if (wanted.length === 0) {
    return true;
  }
  const textStems = tokenize(text).map(stem);
  for (let start = 0; start < textStems.length; start++) {
    if (textStems[start] !== wanted[0]!.stem) {
      continue;
    }
    let position = start;
    let matched = 1;
    for (let w = 1; w < wanted.length; w++) {
      const next = wanted[w]!;
      let found = -1;
      for (let probe = position + 1; probe <= position + 1 + MAX_GAP_WORDS && probe < textStems.length; probe++) {
        if (textStems[probe] === next.stem) {
          found = probe;
          break;
        }
        // Eşleşmeyen kelime araya giriyor: sadece placeholder izni ya da dolgu kelimesiyse devam.
        if (!next.anyGapBefore && !FILLER_WORDS.has(textStems[probe]!)) {
          break;
        }
      }
      if (found === -1) {
        break;
      }
      position = found;
      matched++;
    }
    if (matched === wanted.length) {
      return true;
    }
  }
  return false;
}
