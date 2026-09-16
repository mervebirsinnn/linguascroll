import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { GoogleGenAI } from "@google/genai";
import { eq } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import type { Pool } from "pg";
import { quizOptionsTable, quizzesTable } from "../quizzes/quizzes.schema";
import { createTestDatabaseConnection, truncateTestTables } from "../videos/test-database";
import { transcriptSegmentLearningPointsTable } from "../videos/transcript-segment-learning-points.schema";
import { videoTranscriptSegmentsTable } from "../videos/transcript-segments.schema";
import { videosTable } from "../videos/videos.schema";
import { videoWordsTable } from "../words/video-words.schema";
import { wordsTable } from "../words/words.schema";
import { enrichTranscript } from "./enrichment-llm-client";
import { buildPublishDraft } from "./enrich-transcript";
import { sttDraftSchema } from "./stt-draft.schema";
import { publishDraftSchema } from "./publish-draft.schema";
import { assertPassesQualityGate, copyMediaFile, publishContent } from "./publish-content";
import { assertValidSegmentReferences } from "./validate-segment-references";

/**
 * Chunk 12 — "Deterministic pipeline proof" (kullanıcı kararı, live API
 * erişimi olmadan önce). GERÇEK bir STT çıktısını (scripts/stt/output/a1final1/
 * draft.json — repo'da zaten mevcut, gerçek bir insan konuşmalı videodan)
 * baştan sona pipeline'dan geçirir:
 *
 *   gerçek draft.json → sttDraftSchema.parse
 *   → enrichTranscript (Gemini client MOCK'lanmış — gerçek ağ çağrısı YOK)
 *   → assertValidSegmentReferences
 *   → buildPublishDraft
 *   → diske yaz + diskten OKU (gerçek round-trip)
 *   → publishDraftSchema.parse (publish-content.ts'in okuyacağı ŞEKİLDE)
 *   → publishContent (GERÇEK test Postgres'ine, transaction içinde)
 *   → copyMediaFile (GERÇEK kaynak video dosyası, geçici bir media dir'e)
 *   → DB'deki TÜM ilişkiler doğrulanır
 *
 * BU TEST NE KANITLAMAZ: LLM'in ürettiği içeriğin KALİTESİNİ (topic/CEFR/
 * explanation/vocabulary/quiz seçimlerinin isabeti) — enrichment JSON'u burada
 * elle yazılmış, deterministik bir sabit. Kalite kanıtı SADECE gerçek bir API
 * çağrısıyla (bkz. Chunk 12 sonuç raporundaki "Live LLM quality proof: PENDING").
 * Bu test kanıtladığı şey: pipeline'ın mekanik iskeletinin (parse→validate→
 * dosya→publish→DB) UÇTAN UCA, gerçek bir transcript ve gerçek bir DB'ye karşı
 * ÇALIŞTIĞI — LLM'in DIŞINDAKİ her şey.
 */

const REAL_DRAFT_PATH = path.resolve(__dirname, "..", "..", "scripts", "stt", "output", "a1final1", "draft.json");

function mockedEnrichmentResponseText(): string {
  return JSON.stringify({
    contentSlug: "dog-three-words",
    topic: "humor",
    cefrLevel: "A1",
    segments: [
      { ordinal: 1, englishExplanation: "Introduces the dog as cute but not smart.", turkishExplanation: "Köpeği sevimli ama akıllı değil diye tanıtıyor." },
      { ordinal: 2, englishExplanation: "The dog only understands three English words.", turkishExplanation: "Köpek sadece üç İngilizce kelime biliyor." },
      { ordinal: 3, englishExplanation: "The first word is 'food'.", turkishExplanation: "İlk kelime 'food' (yemek)." },
      { ordinal: 4, englishExplanation: "When he says 'food', the dog runs to his bowl.", turkishExplanation: "'Food' deyince köpek kabına koşuyor." },
      { ordinal: 5, englishExplanation: "The dog loves eating.", turkishExplanation: "Köpek yemeyi seviyor." },
      { ordinal: 6, englishExplanation: "The second word is 'walk'.", turkishExplanation: "İkinci kelime 'walk' (yürüyüş)." },
      { ordinal: 7, englishExplanation: "When he says 'walk', the dog brings the leash.", turkishExplanation: "'Walk' deyince köpek tasmayı getiriyor." },
      { ordinal: 8, englishExplanation: "The dog jumps with excitement.", turkishExplanation: "Köpek heyecanla zıplıyor." },
      { ordinal: 9, englishExplanation: "The third word is 'no'.", turkishExplanation: "Üçüncü kelime 'no' (hayır)." },
      { ordinal: 10, englishExplanation: "He says 'no' when the dog eats his shoe.", turkishExplanation: "Köpek ayakkabısını yediğinde 'no' diyor." },
    ],
    vocabulary: [
      { lemma: "leash", gloss: "tasma" },
      { lemma: "bowl", gloss: "kap, kase" },
    ],
    learningPoints: [
      {
        segmentOrdinal: 4,
        type: "phrase",
        // Kasıtlı olarak transcript'teki ("he runs to his bowl") ÇEKİMLİ haliyle
        // birebir — Chunk 13'ün `learningPointExpressionNotInTranscript`
        // kontrolü SADECE literal substring eşleşmesi arıyor (bkz.
        // content-quality-gate.ts), pedagojik notation ("run to" mastar hali)
        // burada kasıtlı KULLANILMIYOR ki bu test temiz bir "pass" göstersin —
        // o senaryonun (needsReview, false-positive riski) AYRI, özel testi
        // content-quality-gate.spec.ts'te.
        expression: "runs to",
        englishExplanation: "To move quickly towards something.",
        turkishExplanation: "Bir şeye doğru hızlıca koşmak.",
        exampleEn: "He runs to his bowl very fast.",
        exampleTr: "Kabına çok hızlı koşuyor.",
      },
    ],
    quiz: {
      segmentOrdinal: 9,
      question: "What is the dog's third word?",
      options: [
        { text: "No", isCorrect: true },
        { text: "Food", isCorrect: false },
        { text: "Walk", isCorrect: false },
        { text: "Bowl", isCorrect: false },
      ],
    },
  });
}

/** `client.interactions.create`'in gerçek dönüşü — sadece kodun okuduğu alanlar (`status`, `output_text`) dolduruluyor. */
function mockedInteraction(outputText: string): Awaited<ReturnType<GoogleGenAI["interactions"]["create"]>> {
  return {
    id: "interaction_pipeline_proof",
    status: "completed",
    output_text: outputText,
  } as unknown as Awaited<ReturnType<GoogleGenAI["interactions"]["create"]>>;
}

describe("content-enrichment pipeline (deterministic, gerçek draft.json + gerçek Postgres, LLM MOCK'lanmış)", () => {
  let db: NodePgDatabase;
  let pool: Pool;
  let tmpRoot: string;

  beforeAll(() => {
    const connection = createTestDatabaseConnection();
    db = connection.db;
    pool = connection.pool;
  });

  beforeEach(async () => {
    await truncateTestTables(db);
    tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "pipeline-proof-"));
  });

  afterEach(() => {
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  });

  afterAll(async () => {
    await pool.end();
  });

  it("gerçek draft.json → mock LLM → enriched.json → publish → DB (uçtan uca, tüm ilişkiler doğru)", async () => {
    // 1) Gerçek STT çıktısı (repo'da mevcut, hiç değiştirilmedi).
    expect(fs.existsSync(REAL_DRAFT_PATH)).toBe(true);
    const rawDraft: unknown = JSON.parse(fs.readFileSync(REAL_DRAFT_PATH, "utf-8"));
    const draft = sttDraftSchema.parse(rawDraft);
    expect(draft.languageStatus).toBe("ready");
    expect(draft.segments).toHaveLength(10);

    // 2) LLM çağrısı MOCK'lanıyor — gerçek ağ çağrısı YOK.
    const client = new GoogleGenAI({ apiKey: "test" });
    const createSpy = jest.spyOn(client.interactions, "create").mockResolvedValue(mockedInteraction(mockedEnrichmentResponseText()));

    const enrichmentOutput = await enrichTranscript(draft.segments, { client });
    expect(createSpy).toHaveBeenCalledTimes(1);

    // 3) Segment referansları draft'ın gerçek ordinal'leriyle tutarlı mı?
    assertValidSegmentReferences(enrichmentOutput, draft.segments);

    // 4) enrich-transcript.ts'in GERÇEK buildPublishDraft'ı — Chunk 13'ün
    // Quality Gate'i BURADA otomatik çalışıyor (buildPublishDraft'ın içinde).
    const publishDraft = buildPublishDraft(draft.contentId, draft.sourceFile, draft.durationMs, draft.segments, enrichmentOutput);
    expect(publishDraft.muxAssetId).toBe("local-dog-three-words");
    // Metin (text) enrichment'tan DEĞİL, doğrudan draft'tan geliyor — STT'nin
    // ürettiği gerçek cümle asla değişmiyor (madde 2/6: transcript source of truth).
    expect(publishDraft.segments[0]?.text).toBe(draft.segments[0]?.text);
    // Bu fixture kasıtlı olarak TEMİZ (gerçekçi ama gate'in hiçbir kuralını
    // tetiklemeyecek şekilde yazıldı) — gate'in gerçekçi LinguaScroll içeriğini
    // yanlışlıkla needsReview'a düşürmediğini kanıtlıyor.
    expect(publishDraft.quality).toEqual({ status: "pass", issues: [] });

    // 5) Diske yaz + diskten GERİ OKU — gerçek round-trip (publish-content.ts'in
    // gerçekte yapacağı şey: elle düzenlenmiş bir dosyayı okumak).
    const enrichedPath = path.join(tmpRoot, "enriched.json");
    fs.writeFileSync(enrichedPath, JSON.stringify(publishDraft, null, 2), "utf-8");
    const rawFromDisk: unknown = JSON.parse(fs.readFileSync(enrichedPath, "utf-8"));
    const parsedFromDisk = publishDraftSchema.parse(rawFromDisk);
    assertValidSegmentReferences(parsedFromDisk, parsedFromDisk.segments);

    // 5.5) `publish-content.ts`'in gerçekte yapacağı fresh quality-gate
    // kontrolü — diskteki `quality` alanına GÜVENMEDEN, `--acknowledge-needs-review`
    // OLMADAN da geçiyor çünkü içerik gerçekten temiz.
    const freshQuality = assertPassesQualityGate(parsedFromDisk, false);
    expect(freshQuality.status).toBe("pass");

    // 6) GERÇEK publish transaction'ı, GERÇEK test Postgres'ine.
    const { videoId } = await publishContent(db, parsedFromDisk);

    // 7) GERÇEK kaynak video dosyası, geçici bir media dir'e kopyalanıyor
    // (public/media'ya DEĞİL — testin gerçek app asset'lerine dokunmaması için).
    const mediaDir = path.join(tmpRoot, "media");
    const mediaDestination = copyMediaFile(parsedFromDisk.sourceFile, parsedFromDisk.muxAssetId, mediaDir);
    expect(fs.existsSync(mediaDestination)).toBe(true);
    expect(fs.statSync(mediaDestination).size).toBeGreaterThan(0);

    // 8) DB'deki TÜM ilişkiler.
    const [video] = await db.select().from(videosTable).where(eq(videosTable.id, videoId));
    expect(video?.muxAssetId).toBe("local-dog-three-words");
    expect(video?.topic).toBe("humor");
    expect(video?.cefrLevel).toBe("A1");

    const segments = await db
      .select()
      .from(videoTranscriptSegmentsTable)
      .where(eq(videoTranscriptSegmentsTable.videoId, videoId))
      .orderBy(videoTranscriptSegmentsTable.ordinal);
    expect(segments).toHaveLength(10);
    expect(segments.map((s) => s.text)).toEqual(draft.segments.map((s) => s.text));

    const segment4 = segments.find((s) => s.ordinal === 4)!;
    const learningPoints = await db
      .select()
      .from(transcriptSegmentLearningPointsTable)
      .where(eq(transcriptSegmentLearningPointsTable.transcriptSegmentId, segment4.id));
    expect(learningPoints).toHaveLength(1);
    expect(learningPoints[0]?.expression).toBe("runs to");

    const words = await db.select().from(wordsTable).orderBy(wordsTable.lemma);
    expect(words.map((w) => w.lemma)).toEqual(["bowl", "leash"]);
    const videoWords = await db.select().from(videoWordsTable).where(eq(videoWordsTable.videoId, videoId));
    expect(videoWords).toHaveLength(2);

    const segment9 = segments.find((s) => s.ordinal === 9)!;
    const quizzes = await db.select().from(quizzesTable).where(eq(quizzesTable.sourceTranscriptSegmentId, segment9.id));
    expect(quizzes).toHaveLength(1);
    const options = await db.select().from(quizOptionsTable).where(eq(quizOptionsTable.quizId, quizzes[0]!.id)).orderBy(quizOptionsTable.position);
    expect(options).toHaveLength(4);
    expect(options.filter((o) => o.isCorrect)).toEqual([expect.objectContaining({ text: "No" })]);
  });
});
