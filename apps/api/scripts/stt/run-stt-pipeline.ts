#!/usr/bin/env node
import { spawn, spawnSync } from "node:child_process";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { computeLanguageStatus, type LanguageStatus } from "./language-status";
import { forwardTerminationSignals, killChildTree } from "./process-lifecycle";
import { buildDraftSegments, SegmentationError, type DraftSegment } from "./segment-transcript";
import { buildSrt } from "./srt";
import { transcriptCandidateSchema } from "./transcript-candidate";

/**
 * Chunk 11 — TEK kullanıcı komutu: `pnpm --filter @linguascroll/api stt:process`.
 * Bu dosya NestJS'in HİÇBİR parçası DEĞİL — hiçbir Controller/Service/Repository
 * import etmiyor, `app.module.ts` bunu hiç bilmiyor, kendi bağımsız
 * tsconfig/jest.config'i ile derlenip çalışıyor (bkz. scripts/stt/tsconfig.json).
 *
 * Akış: input seç (allowlist+is-file doğrulanmış) → preflight → transcribe.py'yi
 * spawn et (o, kendi içinde media duration/audio-stream kontrolü yapıyor) →
 * candidate JSON'u Zod'dan geçir → language-status hesapla → deterministik
 * segmentasyon → STAGING klasörüne yaz → HEPSİ başarılıysa TEK bir atomic
 * rename ile output/<content-id>/'e publish et → tmp'yi temizle (varsayılan)
 * veya koru (--keep-temp).
 *
 * BU CHUNK'TA YOK: DB yazımı, approved artifact, explanation/learning
 * point/quiz, mobile değişikliği — bkz. sonuç raporundaki "scope dışı" bölümü.
 */

const STT_ROOT = path.resolve(__dirname, "..");
const INPUT_DIR = path.join(STT_ROOT, "input");
const TMP_DIR = path.join(STT_ROOT, "tmp");
const OUTPUT_DIR = path.join(STT_ROOT, "output");
const TRANSCRIBE_SCRIPT = path.join(STT_ROOT, "transcribe.py");

/** Madde 2 — sadece bu uzantılara izin verilir; input hem auto-detect hem --input için buradan geçer. */
const ALLOWED_VIDEO_EXTENSIONS = new Set([".mp4", ".mov", ".mkv", ".webm", ".m4v"]);

/** Madde 2 — content-id bir path parçası olarak kullanılmadan önce bu deseni sağlamalı (`..`/`/`/`\` imkansız). */
const CONTENT_ID_PATTERN = /^[a-z0-9][a-z0-9-]{0,63}$/;

/**
 * İKİ AYRI timeout — model indirme süresi transcribe süresine KARIŞMASIN diye:
 *  - OVERALL: spawn anından itibaren, kötü senaryoda (soğuk model indirme +
 *    transcription) makul bir üst sınır.
 *  - TRANSCRIPTION_PHASE: SADECE transcribe.py kendi stderr'ine "Transcribe
 *    ediliyor" satırını yazdıktan SONRA başlar (yani model zaten hazır/inmiş) —
 *    bu, gerçek transcription çalışmasının kendisi için çok daha sıkı bir sınır.
 * Ayrı bir "download manager" YOK — sadece iki isimlendirilmiş sabit + bir
 * stderr marker kontrolü.
 */
const OVERALL_TIMEOUT_MS = 20 * 60 * 1000;
const TRANSCRIPTION_PHASE_TIMEOUT_MS = 5 * 60 * 1000;
const TRANSCRIPTION_START_MARKER = "Transcribe ediliyor";

export class PipelineError extends Error {}

export type ParsedArgs = { input: string | undefined; keepTemp: boolean; contentId: string | undefined };

export function parseArgs(argv: readonly string[]): ParsedArgs {
  let input: string | undefined;
  let keepTemp = false;
  let contentId: string | undefined;
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--input") {
      input = argv[++i];
    } else if (arg === "--keep-temp") {
      keepTemp = true;
    } else if (arg === "--content-id") {
      contentId = argv[++i];
    } else {
      throw new PipelineError(`Bilinmeyen argüman: "${arg}". Kullanım: --input <yol> [--content-id <id>] [--keep-temp]`);
    }
  }
  return { input, keepTemp, contentId };
}

export function slugify(fileName: string): string {
  const withoutExt = fileName.replace(/\.[^./\\]+$/, "");
  const slug = withoutExt
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "content";
}

/** Madde 2 — allowlist dışı bir uzantı hiçbir zaman ffmpeg/whisper'a geçirilmez. */
export function assertAllowedExtension(filePath: string): void {
  const ext = path.extname(filePath).toLowerCase();
  if (!ALLOWED_VIDEO_EXTENSIONS.has(ext)) {
    throw new PipelineError(
      `Desteklenmeyen dosya uzantısı: "${ext || "(uzantısız)"}" — izin verilenler: ${[...ALLOWED_VIDEO_EXTENSIONS].join(", ")}`,
    );
  }
}

/**
 * `--input` verilmediyse `input/`'da (allowlist'e uyan) TAM OLARAK bir dosya
 * olmasını bekler — en yaygın (tek video) durumda kullanıcı hiçbir flag
 * geçmek zorunda kalmaz. Sonuçta seçilen dosyanın GERÇEKTEN normal bir dosya
 * olduğu (dizin/özel dosya değil) ve allowlist'te olduğu HER İKİ koldan sonra
 * TEK bir noktada doğrulanır.
 */
export function resolveInputPath(explicitInput: string | undefined, inputDir: string = INPUT_DIR): string {
  let resolved: string;

  if (explicitInput) {
    resolved = path.isAbsolute(explicitInput) ? explicitInput : path.resolve(process.cwd(), explicitInput);
    if (!fs.existsSync(resolved)) {
      throw new PipelineError(`Belirtilen input dosyası bulunamadı: "${resolved}"`);
    }
  } else {
    if (!fs.existsSync(inputDir)) {
      throw new PipelineError(`Input klasörü yok: "${inputDir}"`);
    }
    const candidates = fs
      .readdirSync(inputDir)
      .filter((name) => name !== ".gitkeep" && !name.startsWith("."))
      .filter((name) => ALLOWED_VIDEO_EXTENSIONS.has(path.extname(name).toLowerCase()));
    if (candidates.length === 0) {
      throw new PipelineError(
        `"${inputDir}" içinde bir video bulunamadı (izin verilen uzantılar: ${[...ALLOWED_VIDEO_EXTENSIONS].join(", ")}).\n` +
          `Kendi izniniz olan / kullanım hakkınız olan, 15-60 saniye, anlaşılır İngilizce konuşma içeren bir video ` +
          `dosyasını bu klasöre bırakıp tekrar çalıştırın.`,
      );
    }
    if (candidates.length > 1) {
      throw new PipelineError(
        `"${inputDir}" içinde birden fazla dosya var (${candidates.join(", ")}) — hangisini işleyeceğimi ` +
          `--input <dosya-adı> ile belirtin.`,
      );
    }
    resolved = path.join(inputDir, candidates[0]!);
  }

  if (!fs.statSync(resolved).isFile()) {
    throw new PipelineError(`Input bir normal dosya değil (dizin/özel dosya olabilir): "${resolved}"`);
  }
  assertAllowedExtension(resolved);
  return resolved;
}

/**
 * Madde 2 — content-id bir path parçası olarak kullanılmadan önce: (1) sıkı
 * bir allowlist deseniyle (sadece a-z0-9-) doğrulanır — bu TEK BAŞINA `..`/`/`/`\`
 * içermesini imkansız kılar; (2) DEFENSE-IN-DEPTH olarak, sonuçta üretilen
 * path'in gerçekten `outputRoot`'un İÇİNDE kaldığı ayrıca (resolve edilmiş
 * path karşılaştırmasıyla) doğrulanır.
 */
export function resolveOutputDir(contentId: string, outputRoot: string = OUTPUT_DIR): string {
  if (!CONTENT_ID_PATTERN.test(contentId)) {
    throw new PipelineError(
      `content-id geçersiz: "${contentId}" — sadece küçük harf/rakam/tire (a-z0-9-), ilk karakter harf/rakam olmalı, en fazla 64 karakter.`,
    );
  }
  const resolvedRoot = path.resolve(outputRoot);
  const candidate = path.resolve(resolvedRoot, contentId);
  if (candidate !== path.join(resolvedRoot, contentId) || path.dirname(candidate) !== resolvedRoot) {
    throw new PipelineError(`content-id, output klasörünün dışına çıkmaya çalışıyor: "${contentId}"`);
  }
  return candidate;
}

/** Chunk 11 madde 3/5: sessiz overwrite YOK — bu chunk'ta --force/versioning da yok. */
export function assertOutputDirAvailable(outputDir: string): void {
  if (fs.existsSync(outputDir)) {
    throw new PipelineError(
      `"${outputDir}" zaten var — üzerine YAZILMIYOR (bu chunk'ta overwrite/--force/versioning yok). ` +
        `Farklı bir --content-id kullanın veya mevcut klasörü elle kaldırıp tekrar çalıştırın.`,
    );
  }
}

function checkFfmpegAvailable(): void {
  const result = spawnSync("ffmpeg", ["-version"]);
  if (result.error) {
    throw new PipelineError("ffmpeg PATH'te bulunamadı. Kurulum: https://ffmpeg.org/download.html");
  }
}

/**
 * Madde 4 — ATOMIC WRITER, SADECE kendi tek dosyasının tmp+rename'ini
 * yönetir; hiçbir klasörün/run'ın lifecycle'ına karışmaz. Run-klasörü
 * temizliği SADECE `cleanupRunDir`'in işi (bkz. main()) — ikisi birbirine
 * karışmıyor.
 */
function atomicWriteFile(finalPath: string, content: string): void {
  const tmpPath = `${finalPath}.tmp`;
  fs.writeFileSync(tmpPath, content, "utf-8");
  fs.renameSync(tmpPath, finalPath);
}

/**
 * Madde 4 — idempotent: dizin zaten yoksa (örn. staging başarıyla
 * output/'a taşındığı için) sessizce no-op, HATA VERMEZ. Bu, orkestratörün
 * "başarı yolunda staging zaten taşındı, finally yine de temizlemeye
 * çalışıyor" senaryosunda double-cleanup'ın asla patlamayacağının garantisi
 * (bkz. removeDirSafe.spec.ts).
 */
export function removeDirSafe(dir: string): void {
  fs.rmSync(dir, { recursive: true, force: true });
}

type RunTranscribeResult = { exitCode: number; timedOut: boolean; stderrTail: string };

/**
 * Python'u spawn eder, SIGINT/SIGTERM'i ona ilet (bkz. process-lifecycle.ts),
 * iki-aşamalı timeout uygular, stderr'i canlı yansıtır + son N satırı hata
 * mesajı için biriktirir.
 */
function runTranscribe(args: readonly string[]): Promise<RunTranscribeResult> {
  return new Promise((resolve) => {
    const pythonBin = process.env.PYTHON_BIN ?? "python";
    const child = spawn(pythonBin, [TRANSCRIBE_SCRIPT, ...args], { stdio: ["ignore", "pipe", "pipe"] });

    let timedOut = false;
    let sawTranscriptionMarker = false;
    let phaseTimeoutHandle: NodeJS.Timeout | undefined;
    const stderrLines: string[] = [];

    const onTimeout = () => {
      timedOut = true;
      killChildTree(child, os.platform());
    };
    const overallTimeoutHandle = setTimeout(onTimeout, OVERALL_TIMEOUT_MS);

    child.stderr?.on("data", (chunk: Buffer) => {
      const text = chunk.toString("utf-8");
      process.stderr.write(text);
      stderrLines.push(text);
      if (!sawTranscriptionMarker && text.includes(TRANSCRIPTION_START_MARKER)) {
        sawTranscriptionMarker = true;
        phaseTimeoutHandle = setTimeout(onTimeout, TRANSCRIPTION_PHASE_TIMEOUT_MS);
      }
    });

    const stopForwarding = forwardTerminationSignals(child, process, os.platform());

    child.on("exit", (code) => {
      clearTimeout(overallTimeoutHandle);
      if (phaseTimeoutHandle) {
        clearTimeout(phaseTimeoutHandle);
      }
      stopForwarding();
      resolve({ exitCode: code ?? 1, timedOut, stderrTail: stderrLines.join("").split("\n").slice(-20).join("\n") });
    });
  });
}

async function main(): Promise<void> {
  const { input, keepTemp, contentId: explicitContentId } = parseArgs(process.argv.slice(2));

  const inputPath = resolveInputPath(input);
  checkFfmpegAvailable();

  const contentId = explicitContentId ?? slugify(path.basename(inputPath));
  const outputDir = resolveOutputDir(contentId);
  assertOutputDirAvailable(outputDir);

  const runId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const tmpRunDir = path.join(TMP_DIR, runId);
  fs.mkdirSync(tmpRunDir, { recursive: true });

  // Madde 4 — RUN KLASÖRÜNÜN TÜM lifecycle'ı (oluşturma→temizleme) BURADA,
  // TEK bir `finally`'de yönetiliyor. Aşağıdaki hiçbir kod yolu artık kendi
  // başına cleanup çağırmıyor — try içindeki her `throw` otomatik olarak
  // finally'yi tetikler, double-cleanup riski yapısal olarak ortadan kalkıyor.
  try {
    const wavPath = path.join(tmpRunDir, "audio.wav");
    const candidatePath = path.join(tmpRunDir, "candidate.json");

    console.error(`İçerik: "${path.basename(inputPath)}" → content-id: "${contentId}"`);
    console.error("Model hazır değilse ilk çalıştırmada indirilecek (~500MB) — bu adım transcription timeout'una dahil DEĞİL.");

    const { exitCode, timedOut, stderrTail } = await runTranscribe([
      "--input",
      inputPath,
      "--tmp-wav",
      wavPath,
      "--output",
      candidatePath,
      "--model",
      "small",
      "--device",
      "cpu",
      "--compute-type",
      "int8",
    ]);

    if (exitCode !== 0 || timedOut) {
      throw new PipelineError(
        `STT teknik olarak başarısız oldu${timedOut ? " (timeout)" : ` (exit code ${exitCode})`}.\n` +
          `Son loglar:\n${stderrTail}`,
      );
    }

    const rawCandidate: unknown = JSON.parse(fs.readFileSync(candidatePath, "utf-8"));
    const parseResult = transcriptCandidateSchema.safeParse(rawCandidate);
    if (!parseResult.success) {
      throw new PipelineError(
        `transcribe.py'nin ürettiği candidate JSON beklenen şekilde değil:\n${parseResult.error.issues.map((i) => `  - ${i.path.join(".")}: ${i.message}`).join("\n")}`,
      );
    }
    const candidate = parseResult.data;

    const languageStatus: LanguageStatus = computeLanguageStatus(candidate);
    let draftSegments: DraftSegment[];
    try {
      draftSegments = buildDraftSegments(candidate.words, candidate.durationMs);
    } catch (error) {
      if (error instanceof SegmentationError) {
        throw new PipelineError(`Segmentasyon hatası: ${error.message}`);
      }
      throw error;
    }

    // Madde 3 — STAGING: draft.json + preview.srt ÖNCE run-specific tmp
    // altındaki bir staging klasörüne yazılır. Bu noktaya kadar `output/`
    // hiç dokunulmadı — herhangi bir adım burada patlarsa (yukarıdaki
    // throw'lar dahil) output/<content-id>/ ASLA var olmamış olur.
    const stagingContentDir = path.join(tmpRunDir, "staging", contentId);
    fs.mkdirSync(stagingContentDir, { recursive: true });
    atomicWriteFile(
      path.join(stagingContentDir, "draft.json"),
      JSON.stringify(
        {
          contentId,
          sourceFile: inputPath,
          languageStatus,
          detectedLanguage: candidate.detectedLanguage,
          languageProbability: candidate.languageProbability,
          durationMs: candidate.durationMs,
          segments: draftSegments,
        },
        null,
        2,
      ),
    );
    atomicWriteFile(path.join(stagingContentDir, "preview.srt"), buildSrt(draftSegments));

    // Madde 3 — PUBLISH: staging TAMAMEN hazır olduktan SONRA, TEK bir atomic
    // `rename` ile output/<content-id>/'e taşınır. rename() aynı dosya
    // sisteminde atomiktir — ya TAMAMEN olur ya HİÇ olmaz, yarım bir
    // output klasörü asla görünmez. Yayından hemen önce tekrar kontrol
    // ediyoruz (erken kontrolle publish arasında bir şey oluşmuş olabilir —
    // tek kullanıcılı bir CLI'da ihtimali düşük ama ucuz bir ek kontrol).
    assertOutputDirAvailable(outputDir);
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    fs.renameSync(stagingContentDir, outputDir);

    const draftPath = path.join(outputDir, "draft.json");
    const srtPath = path.join(outputDir, "preview.srt");

    console.error("");
    console.error(`Durum: ${languageStatus.toUpperCase()}`);
    console.error(`Algılanan dil: ${candidate.detectedLanguage} (p=${candidate.languageProbability.toFixed(2)})`);
    console.error(`Süre: ${(candidate.durationMs / 1000).toFixed(1)}s, ${candidate.words.length} kelime, ${draftSegments.length} segment`);
    console.error(`Setup: ${candidate.setupSeconds.toFixed(1)}s, Transcription: ${candidate.transcriptionSeconds.toFixed(1)}s`);
    console.error(`Draft:  ${draftPath}`);
    console.error(`Preview SRT: ${srtPath}`);
    if (languageStatus !== "ready") {
      console.error(`\nNOT: durum "${languageStatus}" — bu chunk'ta zaten approved/publish adımı yok, ama bilginize.`);
    }
  } finally {
    if (keepTemp) {
      console.error(`(--keep-temp: "${tmpRunDir}" korunuyor)`);
    } else {
      removeDirSafe(tmpRunDir);
    }
  }
}

// CLI olarak doğrudan çalıştırıldığında main()'i tetikler; bir test/başka
// modül tarafından import edildiğinde (bkz. run-stt-pipeline.spec.ts) TETİKLEMEZ
// — aksi halde bu dosyayı import etmek gerçek pipeline'ı çalıştırırdı.
if (require.main === module) {
  main().catch((error: unknown) => {
    if (error instanceof PipelineError) {
      console.error(`\nHATA: ${error.message}`);
    } else {
      console.error("\nBEKLENMEYEN HATA:");
      console.error(error);
    }
    process.exit(1);
  });
}
