import "dotenv/config";
import type { GoogleGenAI } from "@google/genai";
import { findWordTokens } from "@linguascroll/shared-types";
import { asc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { z } from "zod";
import { createDefaultClient, DEFAULT_MODEL } from "../content-enrichment/enrichment-llm-client";
import { videoTranscriptSegmentsTable } from "../videos/transcript-segments.schema";
import { videosTable } from "../videos/videos.schema";
import { SegmentWordGlossesRepository, type SegmentWordGlossInput } from "./segment-word-glosses-repository";

/**
 * Altyazı kelime anlamlarını OFFLINE üreten CLI (enrich-transcript.ts ile aynı
 * "Nest DI dışında, kendi Pool'unu açan bağımsız script" deseni). Runtime'da
 * (kullanıcı tıklarken) Gemini ÇAĞRILMAZ — kota ve gecikme riski yok.
 *
 * Kelime kümesini Gemini değil BİZ belirliyoruz (`findWordTokens`, mobile'ın
 * kullandığı AYNI tokenizer): Gemini sadece verilen kelimelere anlam yazıyor,
 * kendi kelime icat edemiyor — dönen her kelime istenen kümeyle doğrulanıyor.
 * Çağrı VİDEO başına bir tane (tüm segment'ler birlikte). Idempotent: anlamı
 * zaten üretilmiş videolar atlanır, yarım kalan bir koşu tekrar çalıştırılınca
 * kaldığı yerden devam eder.
 */

export class WordGlossError extends Error {}

export type GlossSegment = { id: string; ordinal: number; text: string };
export type SegmentWords = GlossSegment & { words: string[] };

export function parseArgs(argv: readonly string[]): { videoId: string | undefined } {
  let videoId: string | undefined;
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--video-id") {
      videoId = argv[++i];
    } else {
      throw new WordGlossError(`Bilinmeyen argüman: "${argv[i]}". Kullanım: [--video-id <uuid>] (verilmezse anlamı olmayan TÜM videolar işlenir).`);
    }
  }
  return { videoId };
}

export function collectSegmentWords(segments: readonly GlossSegment[]): SegmentWords[] {
  return segments.map((segment) => ({
    ...segment,
    words: [...new Set(findWordTokens(segment.text).map((token) => token.normalized))],
  }));
}

const glossOutputSchema = z.object({
  segments: z.array(
    z.object({
      ordinal: z.number().int(),
      glosses: z.array(z.object({ word: z.string(), gloss: z.string() })),
    }),
  ),
});

const OUTPUT_JSON_SCHEMA: Record<string, unknown> = {
  type: "object",
  properties: {
    segments: {
      type: "array",
      items: {
        type: "object",
        properties: {
          ordinal: { type: "integer" },
          glosses: {
            type: "array",
            items: {
              type: "object",
              properties: { word: { type: "string" }, gloss: { type: "string" } },
              required: ["word", "gloss"],
              additionalProperties: false,
            },
          },
        },
        required: ["ordinal", "glosses"],
        additionalProperties: false,
      },
    },
  },
  required: ["segments"],
  additionalProperties: false,
};

const SYSTEM_PROMPT = `You are a bilingual English-Turkish dictionary for LinguaScroll, an English-learning short-video app whose learners are native Turkish speakers.

You will be given numbered English subtitle lines. Under each line is the exact list of words to define. For EVERY listed word of EVERY line, give its short TURKISH meaning AS USED IN THAT SPECIFIC LINE (1-4 words; comma-separated Turkish synonyms are fine). Rules:
- The gloss is the meaning in context, not the most common dictionary sense. "bank" in "river bank" is "kıyı", not "banka".
- For a word that is part of a phrasal verb or idiom in that line, give the short Turkish meaning that the word carries in that phrase (e.g. "up" in "pile up" -> "yığılmak").
- Function words (the, a, to, is...) get a short, plain gloss as well (e.g. "the" -> "belirli tanımlık", "to" -> "-e/-mek için").
- Inflected forms: give the meaning of the form as it appears (e.g. "went" -> "gitti").
- NEVER write an English definition or leave a word out. Return the word EXACTLY as listed (same lowercase spelling).
- Natural Turkish only, no word-for-word calques.`;

export function buildGlossPrompt(segments: readonly SegmentWords[]): string {
  return segments
    .filter((segment) => segment.words.length > 0)
    .map((segment) => `${segment.ordinal}. ${segment.text}\n   words: ${segment.words.join(", ")}`)
    .join("\n\n");
}

export type ParsedGlosses = { glosses: SegmentWordGlossInput[]; missingCount: number };

/**
 * LLM çıktısı güvenilmez: sadece İSTENEN (segment, kelime) çiftleri kabul edilir,
 * fazlalık/uydurma kelime ve boş anlam sessizce atılır. Eksik kalanlar sayılır
 * (o kelime mobile'da tıklanamaz kalır — hata değil, ama raporlanır).
 */
export function parseGlossOutput(rawJson: unknown, segments: readonly SegmentWords[]): ParsedGlosses {
  const parsed = glossOutputSchema.safeParse(rawJson);
  if (!parsed.success) {
    throw new WordGlossError(`LLM çıktısı beklenen şekilde değil:\n${parsed.error.issues.map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`).join("\n")}`);
  }

  const segmentByOrdinal = new Map(segments.map((segment) => [segment.ordinal, segment]));
  const accepted = new Map<string, SegmentWordGlossInput>();
  for (const outputSegment of parsed.data.segments) {
    const segment = segmentByOrdinal.get(outputSegment.ordinal);
    if (!segment) {
      continue;
    }
    const allowedWords = new Set(segment.words);
    for (const { word, gloss } of outputSegment.glosses) {
      const normalizedWord = word.trim().toLowerCase();
      const trimmedGloss = gloss.trim();
      if (allowedWords.has(normalizedWord) && trimmedGloss) {
        accepted.set(`${segment.id}\u0000${normalizedWord}`, { segmentId: segment.id, word: normalizedWord, gloss: trimmedGloss });
      }
    }
  }

  const requestedCount = segments.reduce((sum, segment) => sum + segment.words.length, 0);
  return { glosses: [...accepted.values()], missingCount: requestedCount - accepted.size };
}

export async function generateGlossesForVideo(
  segments: readonly GlossSegment[],
  options: { client?: GoogleGenAI; model?: string } = {},
): Promise<ParsedGlosses> {
  const segmentWords = collectSegmentWords(segments);
  if (segmentWords.every((segment) => segment.words.length === 0)) {
    return { glosses: [], missingCount: 0 };
  }

  const model = options.model ?? process.env.CONTENT_ENRICHMENT_MODEL ?? DEFAULT_MODEL;
  const client = options.client ?? createDefaultClient();

  let rawText: string;
  try {
    const interaction = await client.interactions.create({
      model,
      input: buildGlossPrompt(segmentWords),
      system_instruction: SYSTEM_PROMPT,
      response_format: { type: "text", mime_type: "application/json", schema: OUTPUT_JSON_SCHEMA },
    });
    if (interaction.status !== "completed" || !interaction.output_text) {
      throw new WordGlossError(`Gemini interaction tamamlanmadı (status: "${interaction.status}").`);
    }
    rawText = interaction.output_text;
  } catch (error) {
    if (error instanceof WordGlossError) {
      throw error;
    }
    throw new WordGlossError(`Gemini API çağrısı başarısız oldu: ${error instanceof Error ? error.message : String(error)}`);
  }

  let rawJson: unknown;
  try {
    rawJson = JSON.parse(rawText);
  } catch {
    throw new WordGlossError(`LLM yanıtı geçerli JSON değil:\n${rawText}`);
  }
  return parseGlossOutput(rawJson, segmentWords);
}

function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new WordGlossError(`"${key}" tanımlı değil (.env dosyasını kontrol edin).`);
  }
  return value;
}

async function main(): Promise<void> {
  const { videoId } = parseArgs(process.argv.slice(2));
  const pool = new Pool({ connectionString: requireEnv("DATABASE_URL") });
  const db = drizzle(pool);
  const repository = new SegmentWordGlossesRepository(db);

  try {
    const videos = videoId
      ? await db.select({ id: videosTable.id, muxAssetId: videosTable.muxAssetId }).from(videosTable).where(eq(videosTable.id, videoId))
      : await db.select({ id: videosTable.id, muxAssetId: videosTable.muxAssetId }).from(videosTable);
    if (videos.length === 0) {
      console.error(videoId ? `"${videoId}" ile eşleşen video bulunamadı.` : "Hiç video yok.");
      return;
    }

    let generated = 0;
    let skipped = 0;
    const failed: string[] = [];
    for (const video of videos) {
      if (await repository.hasAnyForVideo(video.id)) {
        skipped++;
        continue;
      }
      try {
        const segments = await db
          .select({ id: videoTranscriptSegmentsTable.id, ordinal: videoTranscriptSegmentsTable.ordinal, text: videoTranscriptSegmentsTable.text })
          .from(videoTranscriptSegmentsTable)
          .where(eq(videoTranscriptSegmentsTable.videoId, video.id))
          .orderBy(asc(videoTranscriptSegmentsTable.ordinal));
        const { glosses, missingCount } = await generateGlossesForVideo(segments);
        await repository.insertMany(glosses);
        generated++;
        console.error(`[ok] ${video.muxAssetId}: ${glosses.length} anlam${missingCount > 0 ? `, ${missingCount} kelime eksik kaldı` : ""}`);
      } catch (error) {
        failed.push(video.muxAssetId);
        console.error(`[failed] ${video.muxAssetId}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    console.error(`\n=== ÖZET === Üretilen: ${generated}, Atlanan (zaten var): ${skipped}, Başarısız: ${failed.length}`);
    if (failed.length > 0) {
      console.error("Başarısızlar tekrar çalıştırılınca kaldığı yerden devam eder.");
      process.exitCode = 1;
    }
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  main().catch((error: unknown) => {
    console.error(error instanceof WordGlossError ? `\nHATA: ${error.message}` : error);
    process.exit(1);
  });
}
