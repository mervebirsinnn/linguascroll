import { GoogleGenAI } from "@google/genai";
import { enrichmentOutputSchema, type EnrichmentOutput } from "./enrichment-output.schema";
import type { SttDraftSegment } from "./stt-draft.schema";

/**
 * Chunk 15 — Gemini migration (kullanıcı kararı: Anthropic'te ücretli kullanım
 * istemiyor, Gemini'nin ücretsiz tier'ı kullanılacak). Dosya adı artık
 * provider-nötr (`claude-client.ts` DEĞİL) — ama BaseAIService/AIEngineFactory/
 * Strategy hiyerarşisi YİNE yok: tek provider, tek implementation (Chunk 12
 * madde 11 kararı hâlâ geçerli, sadece implementasyon Anthropic'ten Gemini'ye
 * değişti). İki provider'ı AYNI ANDA desteklemek bugün gerçek bir ihtiyaç
 * değil — eklenmedi.
 *
 * Model adı KOD İÇİNE hardcode edilmiyor (kullanıcı kararı) — env var'dan
 * (`CONTENT_ENRICHMENT_MODEL`) okunuyor, `DEFAULT_MODEL` sadece o env var
 * tanımlı DEĞİLSE kullanılan, tek satırda değiştirilebilir bir varsayılan.
 */
const DEFAULT_MODEL = "gemini-3.8-flash";

export class EnrichmentLlmError extends Error {}

/**
 * Gemini'nin Interactions API'sine (`client.interactions.create`, güncel/
 * "non-legacy" structured-output yüzeyi — bkz. ai.google.dev/gemini-api/docs/
 * interactions/structured-output) `response_format.text.schema` olarak
 * verilen JSON Schema. SDK'nın kendi zod-entegrasyonu (varsa) BİLİNÇLİ OLARAK
 * kullanılmıyor: Anthropic'teki aynı kararın devamı — bu şekil
 * `enrichment-output.schema.ts`'in Zod şemasıyla ELLE senkron tutuluyor,
 * dönen JSON ayrıca (ikinci, bağımsız bir doğrulama olarak)
 * `enrichmentOutputSchema.parse()`'tan geçiyor.
 *
 * Şeklin kendisi Anthropic'ten Gemini'ye TAŞINIRKEN DEĞİŞMEDİ: Gemini'nin
 * Interactions API'si standart (lowercase) JSON Schema kullanıyor ve
 * nullable alanlar için `"type": ["string", "null"]` union'ını (Anthropic'le
 * aynı yazım) doğrudan destekliyor — resmi dokümantasyonda doğrulandı.
 */
const OUTPUT_JSON_SCHEMA: Record<string, unknown> = {
  type: "object",
  properties: {
    contentSlug: { type: "string", pattern: "^[a-z0-9]+(-[a-z0-9]+)*$" },
    topic: { type: "string", enum: ["dating", "travel", "career", "lifestyle", "humor"] },
    cefrLevel: { type: "string", enum: ["A1", "A2", "B1", "B2", "C1", "C2"] },
    segments: {
      type: "array",
      items: {
        type: "object",
        properties: {
          ordinal: { type: "integer" },
          englishExplanation: { type: "string" },
          turkishExplanation: { type: "string" },
        },
        required: ["ordinal", "englishExplanation", "turkishExplanation"],
        additionalProperties: false,
      },
    },
    vocabulary: {
      type: "array",
      items: {
        type: "object",
        properties: { lemma: { type: "string" }, gloss: { type: "string" } },
        required: ["lemma", "gloss"],
        additionalProperties: false,
      },
    },
    learningPoints: {
      type: "array",
      items: {
        type: "object",
        properties: {
          segmentOrdinal: { type: "integer" },
          type: { type: "string", enum: ["phrase", "grammar"] },
          expression: { type: "string" },
          englishExplanation: { type: "string" },
          turkishExplanation: { type: "string" },
          exampleEn: { type: ["string", "null"] },
          exampleTr: { type: ["string", "null"] },
        },
        required: ["segmentOrdinal", "type", "expression", "englishExplanation", "turkishExplanation", "exampleEn", "exampleTr"],
        additionalProperties: false,
      },
    },
    quiz: {
      type: "object",
      properties: {
        segmentOrdinal: { type: "integer" },
        question: { type: "string" },
        options: {
          type: "array",
          minItems: 4,
          maxItems: 4,
          items: {
            type: "object",
            properties: { text: { type: "string" }, isCorrect: { type: "boolean" } },
            required: ["text", "isCorrect"],
            additionalProperties: false,
          },
        },
      },
      required: ["segmentOrdinal", "question", "options"],
      additionalProperties: false,
    },
  },
  required: ["contentSlug", "topic", "cefrLevel", "segments", "vocabulary", "learningPoints", "quiz"],
  additionalProperties: false,
};

const SYSTEM_PROMPT = `You are a language-learning content editor for LinguaScroll, an English-learning short-video app whose learners are native Turkish speakers.

You will be given a timestamped English transcript (already produced by a separate, verified speech-to-text step — treat every transcript line as ground truth; never invent, correct, or paraphrase what was actually said). Produce structured enrichment for it:

- contentSlug: a short (2-5 word), descriptive, kebab-case slug that summarizes what the video is actually about (not the generic topic category). Base it on the real content, not a generic label.
- topic: the single best-fitting content-interest category for this video, from the fixed allowed list only. If genuinely nothing fits well, pick the closest one — never leave it ambiguous.
- cefrLevel: your best pedagogical estimate of the difficulty (A1-C2), weighing sentence structure, vocabulary rarity, idioms, grammar complexity, and natural speech speed/complexity together — not vocabulary difficulty alone. This is an estimate for a language app, not a certified measurement.
- segments: for EVERY segment ordinal you were given (exactly the same set, no more, no fewer), a short English explanation and a short natural (not word-for-word) Turkish explanation of what that line means. For a trivial or already-simple line (a greeting, a single word), keep the explanation equally short and simple — do not manufacture pedagogical depth that isn't there.
- learningPoints: ONLY for segments that contain a phrase or grammar structure genuinely worth teaching a B1/B2 learner (a phrasal verb, an idiom, a non-obvious grammar pattern). Most segments should have none. Each must reference the exact segmentOrdinal it comes from. Do not invent generic grammar commentary that isn't tied to something actually said.
- vocabulary: ONLY genuinely useful words/phrases for a learner — prioritize phrasal verbs, idioms, and useful conversational vocabulary at B1/B2 level. Skip trivial closed-class words (the, and, is, very, a, to, ...). It is fine for this list to be empty or short.
- learningPoints and vocabulary must come from words/phrases that actually occur in the transcript, not invented additions.
- quiz: exactly one multiple-choice question that a learner who just watched this specific segment would immediately recognize as testing something they just encountered there — never generic trivia about the video's topic. Ground it in ONE specific segment (set segmentOrdinal to that segment's ordinal) and test ONE of: the meaning of a phrase/idiom actually used in it, a vocabulary item in its real sentence context, a paraphrase/comprehension of what the sentence actually means, a grammar/usage pattern actually present in it, or an idea explicitly stated in it. Where it reads naturally, make the connection to the video's content explicit in the wording (e.g. "In the video, what does 'double-edged sword' mean in this context?") — but do not force this phrasing onto every question if it already reads as clearly about that segment without it. Match the question's difficulty to cefrLevel: A1 → concrete, basic word/sentence meaning; A2 → contextual vocabulary meaning or a simple paraphrase; B1 → phrase/idiom meaning, inference, or paraphrase; B2 → nuance, idiomatic meaning, inference, or a genuine grammar/usage point — a B1/B2 video's quiz must never collapse into an A1-level "what does this common word mean" question. Exactly 4 options, exactly one correct. Distractors must be plausible and of similar semantic category and difficulty to the correct answer, not near-duplicates of it and not absurd/trivially eliminable — never one obviously-correct answer next to three unrelated or nonsense options, and never let the correct option be conspicuously longer/more detailed than the others. The correct answer must be provable strictly from that segment's text, with no outside/general knowledge required, and the question must not be answerable by someone who never watched the video — it must depend on the specific wording or context of that segment, not common sense alone.

All Turkish text must be natural Turkish, not a literal word-for-word translation.`;

function buildUserPrompt(segments: readonly SttDraftSegment[]): string {
  const transcriptLines = segments.map((segment) => `${segment.ordinal}. ${segment.text}`).join("\n");
  return `Transcript segments (ordinal. text):\n\n${transcriptLines}`;
}

/**
 * Tek bir Gemini API çağrısı — tool-use/agentic loop YOK: bu, açık-uçlu bir
 * keşif görevi değil, tek-seferlik yapılandırılmış üretim (bkz. Chunk 12
 * planı, "hangi surface" kararı — Chunk 15'te provider değişti, karar
 * değişmedi). `client` opsiyonel dependency olarak enjekte edilebiliyor —
 * testler gerçek ağ çağrısı yapmadan `client.interactions.create`'i
 * mock'layabiliyor (bkz. enrichment-llm-client.spec.ts).
 */
export async function enrichTranscript(
  segments: readonly SttDraftSegment[],
  options: { client?: GoogleGenAI; model?: string } = {},
): Promise<EnrichmentOutput> {
  const model = options.model ?? process.env.CONTENT_ENRICHMENT_MODEL ?? DEFAULT_MODEL;
  const client = options.client ?? createDefaultClient();

  let rawText: string;
  try {
    const interaction = await client.interactions.create({
      model,
      input: buildUserPrompt(segments),
      system_instruction: SYSTEM_PROMPT,
      response_format: { type: "text", mime_type: "application/json", schema: OUTPUT_JSON_SCHEMA },
    });
    if (interaction.status !== "completed" || !interaction.output_text) {
      throw new EnrichmentLlmError(
        `Gemini interaction beklenen şekilde tamamlanmadı (status: "${interaction.status}").`,
      );
    }
    rawText = interaction.output_text;
  } catch (error) {
    if (error instanceof EnrichmentLlmError) {
      throw error;
    }
    throw new EnrichmentLlmError(
      `Gemini API çağrısı başarısız oldu: ${error instanceof Error ? error.message : String(error)}`,
    );
  }

  let rawJson: unknown;
  try {
    rawJson = JSON.parse(rawText);
  } catch {
    throw new EnrichmentLlmError(`LLM yanıtı geçerli JSON değil:\n${rawText}`);
  }

  const parseResult = enrichmentOutputSchema.safeParse(rawJson);
  if (!parseResult.success) {
    throw new EnrichmentLlmError(
      `LLM çıktısı enrichmentOutputSchema'yı sağlamadı:\n${parseResult.error.issues.map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`).join("\n")}`,
    );
  }
  return parseResult.data;
}

// Chunk 17C.2 — gerçek smoke testte bulunan bulgu: `interactions.create()` SDK
// içinde AYRI bir alt-client (speakeasy-üretimi Interactions bridge) üzerinden
// gidiyor ve onun tek-deneme timeout_ms'i, bu option verilmezse -1 (sınırsız)
// oluyor — SDK'nın kendi retry/backoff tavanı (maxElapsedTime/maxRetries) SADECE
// dönen denemeler arasındaki süreyi sınırlıyor, hiç dönmeyen TEK bir denemeyi
// sınırlayamıyor. Gerçek testte tam bu yüzden 240s+ boyunca sıfır byte'lık bir
// yanıtsızlık gözlemlendi (retry/backoff DEĞİŞTİRİLMEDİ — sadece her denemeye
// bir üst sınır kondu). `httpOptions.timeout` mevcut SDK'nın kendi, dokümante
// constructor option'ı; yeni dependency veya elle AbortController yok.
const GEMINI_REQUEST_TIMEOUT_MS = 120_000;

function createDefaultClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new EnrichmentLlmError("GEMINI_API_KEY tanımlı değil — apps/api/.env dosyasını kontrol edin.");
  }
  return new GoogleGenAI({ apiKey, httpOptions: { timeout: GEMINI_REQUEST_TIMEOUT_MS } });
}
