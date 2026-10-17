import * as fs from "node:fs";
import * as path from "node:path";
import { execFileSync } from "node:child_process";
import { ABSOLUTE_PROFILE, RELATIVE_PROFILE, detectSpeechFromSamples, pcmS16leToSamples } from "./audio-onset";
import { MEDIA_SOURCE_DIR } from "./approved-artifact";
import { atomicWriteFile, resolveDraftPath, resolveEnrichedOutputPath } from "./enrich-transcript";
import { evaluateTimingQa, retimeSegments, segmentTimingFingerprint, type SegmentRetiming, type TimedSegment, type TimingQaReport } from "./segment-retiming";
import { sttDraftSchema } from "./stt-draft.schema";
import { timingQaPath } from "./timing-qa-gate";

/**
 * Whisper segment başlangıçlarını gerçek audio onset'ine hizalar + ±300 ms QA üretir.
 *   node dist/content-enrichment/align-onsets.js --content-ids a,b,c [--apply] [--report-dir <dizin>]
 *
 *  - Her içerik için `output/<id>/timing-qa.json` yazılır (terfi kapısı bunu okur, bkz. timing-qa-gate.ts).
 *  - `--apply`: yalnızca QA GEÇTİYSE draft.json ve (varsa) enriched.json'daki `startMs` güncellenir; metin/endMs/diğer
 *    alanlar dokunulmaz. QA kaldıysa transcript dosyalarına HİÇ yazılmaz.
 *  - DB/R2'ye dokunmaz. Deterministiktir: aynı ses + aynı segmentler = aynı sonuç.
 */
const SAMPLE_RATE = 16000;

export class AlignOnsetsError extends Error {}

export function parseAlignArgs(argv: readonly string[]): { contentIds: string[]; apply: boolean; reportDir: string | null } {
  const contentIds: string[] = [];
  let apply = false;
  let reportDir: string | null = null;
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--content-ids" || arg === "--content-id") {
      const value = argv[++i];
      if (!value || value.startsWith("--")) throw new AlignOnsetsError(`${arg} bir değer gerektirir.`);
      contentIds.push(...value.split(",").map((id) => id.trim()).filter(Boolean));
    } else if (arg === "--apply") apply = true;
    else if (arg === "--report-dir") {
      const value = argv[++i];
      if (!value || value.startsWith("--")) throw new AlignOnsetsError("--report-dir bir dizin gerektirir.");
      reportDir = value;
    } else throw new AlignOnsetsError(`Bilinmeyen argüman: "${arg}". Kullanım: --content-ids a,b [--apply] [--report-dir <dizin>]`);
  }
  if (contentIds.length === 0) throw new AlignOnsetsError("--content-ids (veya --content-id) zorunlu.");
  for (const id of contentIds) if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(id)) throw new AlignOnsetsError(`Geçersiz contentId: "${id}"`);
  return { contentIds, apply, reportDir };
}

function decodeMono16k(mediaPath: string): Int16Array {
  const bytes = execFileSync("ffmpeg", ["-v", "error", "-i", mediaPath, "-vn", "-ac", "1", "-ar", String(SAMPLE_RATE), "-f", "s16le", "-"], { maxBuffer: 1 << 29 });
  return pcmS16leToSamples(bytes);
}

export interface ContentTimingResult {
  contentId: string;
  mediaFile: string;
  durationMs: number;
  details: SegmentRetiming[];
  qa: TimingQaReport;
  correctedFingerprint: string;
  originalFingerprint: string;
  applied: boolean;
  enrichedPresent: boolean;
}

function readJson(file: string): Record<string, unknown> {
  return JSON.parse(fs.readFileSync(file, "utf-8")) as Record<string, unknown>;
}

/** raw JSON'daki segment nesnelerinin YALNIZCA startMs'ini ordinal'e göre günceller (diğer alanlar korunur). */
function withStarts(raw: Record<string, unknown>, corrected: readonly TimedSegment[]): Record<string, unknown> {
  const byOrdinal = new Map(corrected.map((segment) => [segment.ordinal, segment]));
  const segments = (raw.segments as Array<Record<string, unknown>>).map((segment) => {
    const next = byOrdinal.get(segment.ordinal as number);
    if (!next) throw new AlignOnsetsError(`ordinal ${String(segment.ordinal)} düzeltme kümesinde yok`);
    if (segment.text !== next.text || segment.endMs !== next.endMs) throw new AlignOnsetsError(`ordinal ${next.ordinal}: metin/endMs değişmiş görünüyor — durduruldu`);
    return { ...segment, startMs: next.startMs };
  });
  return { ...raw, segments };
}

export function analyzeContent(contentId: string, apply: boolean): ContentTimingResult {
  const draftPath = resolveDraftPath(contentId);
  if (!fs.existsSync(draftPath)) throw new AlignOnsetsError(`Draft yok: ${draftPath}`);
  const rawDraft = readJson(draftPath);
  const draft = sttDraftSchema.parse(rawDraft);
  const mediaFile = path.basename(draft.sourceFile.replace(/\\/g, "/"));
  const mediaPath = path.join(MEDIA_SOURCE_DIR, mediaFile);
  if (!fs.existsSync(mediaPath)) throw new AlignOnsetsError(`Medya yok: ${mediaPath}`);

  const samples = decodeMono16k(mediaPath);
  const primary = detectSpeechFromSamples(samples, SAMPLE_RATE, RELATIVE_PROFILE);
  const verifier = detectSpeechFromSamples(samples, SAMPLE_RATE, ABSOLUTE_PROFILE);
  const { segments: corrected, details } = retimeSegments(draft.segments, primary);
  const qa = evaluateTimingQa(details, verifier);
  const originalFingerprint = segmentTimingFingerprint(draft.segments);
  const correctedFingerprint = segmentTimingFingerprint(corrected);

  // enriched.json (varsa): segment metinleri draft ile birebir aynı olmalı, aksi halde hiçbir şey yazılmaz.
  const enrichedPath = resolveEnrichedOutputPath(contentId);
  const enrichedPresent = fs.existsSync(enrichedPath);
  const rawEnriched = enrichedPresent ? readJson(enrichedPath) : null;
  if (rawEnriched) {
    const enrichedSegments = rawEnriched.segments as Array<{ ordinal: number; text: string }>;
    const mismatch = draft.segments.some((segment) => enrichedSegments.find((e) => e.ordinal === segment.ordinal)?.text !== segment.text) || enrichedSegments.length !== draft.segments.length;
    if (mismatch) throw new AlignOnsetsError(`"${contentId}": enriched.json segmentleri draft ile eşleşmiyor — hizalama yapılmadı.`);
  }

  let applied = false;
  if (apply && qa.status === "pass") {
    const nextDraft = withStarts(rawDraft, corrected);
    const nextEnriched = rawEnriched ? withStarts(rawEnriched, corrected) : null;
    atomicWriteFile(draftPath, JSON.stringify(nextDraft, null, 2));
    if (nextEnriched) atomicWriteFile(enrichedPath, JSON.stringify(nextEnriched, null, 2));
    applied = true;
  }

  const result: ContentTimingResult = {
    contentId,
    mediaFile,
    durationMs: draft.durationMs,
    details,
    qa,
    correctedFingerprint,
    originalFingerprint,
    applied,
    enrichedPresent,
  };
  fs.mkdirSync(path.dirname(timingQaPath(contentId)), { recursive: true });
  atomicWriteFile(
    timingQaPath(contentId),
    JSON.stringify(
      {
        contentId,
        status: qa.status,
        toleranceMs: qa.toleranceMs,
        correctedFingerprint,
        failures: qa.failures,
        correctionDetector: RELATIVE_PROFILE.name,
        verifierDetector: ABSOLUTE_PROFILE.name,
        applied,
        meanPreErrorMs: qa.meanPreErrorMs,
        maxAbsPreErrorMs: qa.maxAbsPreErrorMs,
        maxAbsPostErrorMs: qa.maxAbsPostErrorMs,
        segments: qa.segments,
      },
      null,
      2,
    ),
  );
  return result;
}

export function renderMarkdownReport(results: readonly ContentTimingResult[], generatedFor: string): string {
  const lines: string[] = [];
  lines.push(`# Altyazı / ses onset QA raporu (${generatedFor})`, "");
  lines.push(`Düzeltme dedektörü: \`${RELATIVE_PROFILE.name}\` · Bağımsız doğrulayıcı: \`${ABSOLUTE_PROFILE.name}\` · Hedef: |hata| ≤ 300 ms`, "");
  lines.push("Hata = segment başlangıcı − doğrulayıcının ölçtüğü gerçek konuşma başlangıcı (negatif = altyazı sesten ÖNCE).", "");
  lines.push("| İçerik | Sonuç | Segment | Ort. önceki hata | Maks mutlak önceki | Maks mutlak sonraki | Uygulandı |", "| --- | --- | --- | --- | --- | --- | --- |");
  for (const r of results) {
    lines.push(`| ${r.contentId} | ${r.qa.status === "pass" ? "GEÇTİ" : "**KALDI**"} | ${r.qa.segments.length} | ${r.qa.meanPreErrorMs ?? "-"} ms | ${r.qa.maxAbsPreErrorMs ?? "-"} ms | ${r.qa.maxAbsPostErrorMs ?? "-"} ms | ${r.applied ? "evet" : "hayır"} |`);
  }
  lines.push("");
  for (const r of results.filter((x) => x.qa.status === "fail")) {
    lines.push(`## ${r.contentId} — publish'e KAPALI`, ...r.qa.failures.map((f) => `- ${f}`), "");
  }
  lines.push("## Segment ayrıntıları", "");
  for (const r of results) {
    lines.push(`### ${r.contentId}`, "| # | Whisper başlangıç | Doğrulayıcı onset | Önceki hata | Düzeltilmiş başlangıç | Sonraki hata | Durum |", "| --- | --- | --- | --- | --- | --- | --- |");
    for (const s of r.qa.segments) {
      lines.push(`| ${s.ordinal} | ${s.originalStartMs} | ${s.verifierOnsetMs ?? "-"} | ${s.preErrorMs ?? "-"} | ${s.correctedStartMs} | ${s.postErrorMs ?? "-"} | ${s.ok ? "ok" : s.status} |`);
    }
    lines.push("");
  }
  return lines.join("\n");
}

export function main(argv: readonly string[]): void {
  const options = parseAlignArgs(argv);
  const results = options.contentIds.map((id) => analyzeContent(id, options.apply));
  for (const r of results) {
    console.error(`${r.qa.status === "pass" ? "GEÇTİ " : "KALDI "} ${r.contentId}: önceki ort. ${r.qa.meanPreErrorMs}ms, maks |sonraki| ${r.qa.maxAbsPostErrorMs}ms${r.applied ? " (uygulandı)" : ""}`);
  }
  if (options.reportDir) {
    fs.mkdirSync(options.reportDir, { recursive: true });
    const label = options.apply ? "uygulama sonrası" : "uygulama öncesi (kuru koşu)";
    fs.writeFileSync(path.join(options.reportDir, "subtitle-onset-qa.md"), renderMarkdownReport(results, label), "utf-8");
    fs.writeFileSync(path.join(options.reportDir, "subtitle-onset-qa.json"), JSON.stringify(results.map((r) => ({ contentId: r.contentId, status: r.qa.status, applied: r.applied, meanPreErrorMs: r.qa.meanPreErrorMs, maxAbsPreErrorMs: r.qa.maxAbsPreErrorMs, maxAbsPostErrorMs: r.qa.maxAbsPostErrorMs, failures: r.qa.failures, segments: r.qa.segments })), null, 2), "utf-8");
    console.error(`Rapor yazıldı: ${options.reportDir}`);
  }
}

if (require.main === module) {
  try {
    main(process.argv.slice(2));
  } catch (error: unknown) {
    if (error instanceof AlignOnsetsError) console.error(`\nHATA: ${error.message}`);
    else {
      console.error("\nBEKLENMEYEN HATA:");
      console.error(error);
    }
    process.exit(1);
  }
}
