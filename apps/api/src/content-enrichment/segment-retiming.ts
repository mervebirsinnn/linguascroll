import { createHash } from "node:crypto";
import type { SpeechRegion } from "./audio-onset";

/**
 * Segment başlangıçlarını ölçülmüş audio onset'ine snap eden DETERMİNİSTİK düzeltme + bağımsız doğrulama.
 *
 * Sözleşme:
 *  - Metin ve `endMs` ASLA değişmez; yalnızca `startMs` ve yalnızca ses dalga biçiminden ölçülen onset'e göre.
 *    Elle girilmiş zaman yoktur; aynı girdi (segmentler + bölgeler) her zaman aynı çıktıyı verir.
 *  - Onset bulunamazsa ya da düzeltme geçersiz bir segment üretecekse (çakışma/çok kısa) segment OLDUĞU GİBİ
 *    bırakılır ve QA'da başarısız sayılır: tahminle zaman uydurulmaz.
 *  - Doğrulama, düzeltmede kullanılandan FARKLI bir dedektör profilinin bölgeleriyle yapılır (bkz. audio-onset.ts).
 */

export interface TimedSegment {
  readonly ordinal: number;
  readonly startMs: number;
  readonly endMs: number;
  readonly text: string;
}

export interface RetimeOptions {
  /** Whisper başlangıcından ÖNCE aranacak azami mesafe (Whisper geç kalmışsa). */
  readonly maxLookBackMs: number;
  /** Whisper başlangıcından SONRA aranacak azami mesafe (Whisper erken vermişse; baştaki sessizlik dahil). */
  readonly maxLookAheadMs: number;
  /** Düzeltilmiş segmentin en az bu kadar sürmesi gerekir. */
  readonly minDurationMs: number;
}

export const DEFAULT_RETIME_OPTIONS: RetimeOptions = { maxLookBackMs: 1000, maxLookAheadMs: 1500, minDurationMs: 300 };

export type RetimeStatus = "snapped" | "aligned" | "no-onset" | "conflict";

export interface SegmentRetiming {
  readonly ordinal: number;
  readonly originalStartMs: number;
  readonly onsetMs: number | null;
  readonly correctedStartMs: number;
  readonly deltaMs: number;
  readonly status: RetimeStatus;
}

export function retimeSegments(
  segments: readonly TimedSegment[],
  regions: readonly SpeechRegion[],
  options: RetimeOptions = DEFAULT_RETIME_OPTIONS,
): { segments: TimedSegment[]; details: SegmentRetiming[] } {
  const ordered = [...segments].sort((a, b) => a.ordinal - b.ordinal);
  const onsets = [...regions].map((region) => region.startMs).sort((a, b) => a - b);
  const result: TimedSegment[] = [];
  const details: SegmentRetiming[] = [];
  let previousOnset = -1;
  let previousEnd = 0;

  ordered.forEach((segment, index) => {
    const next = ordered[index + 1];
    const lowerBound = Math.max(segment.startMs - options.maxLookBackMs, previousOnset + 1);
    // Sonraki segmentin ORİJİNAL başlangıcı üst sınırdır: onun konuşmasının onset'ini bu segmente atamayız.
    const upperBound = Math.min(segment.startMs + options.maxLookAheadMs, next ? next.startMs : Number.POSITIVE_INFINITY);
    const candidates = onsets.filter((onset) => onset >= lowerBound && onset <= upperBound && onset < segment.endMs - options.minDurationMs);
    // En yakın onset; eşitlikte erken olan (sıralı dizide ilk görülen) kazanır.
    let onset: number | null = null;
    for (const candidate of candidates) {
      if (onset === null || Math.abs(candidate - segment.startMs) < Math.abs(onset - segment.startMs)) onset = candidate;
    }

    let status: RetimeStatus;
    let corrected = segment.startMs;
    if (onset === null) {
      status = "no-onset";
    } else {
      // Altyazılar çakışmaz: onset önceki segmentin sonundan erkense, başlangıç önceki bitişe sabitlenir.
      const candidateStart = Math.max(onset, previousEnd);
      if (candidateStart >= segment.endMs - options.minDurationMs) {
        status = "conflict";
      } else {
        corrected = candidateStart;
        status = corrected === segment.startMs ? "aligned" : "snapped";
        previousOnset = onset;
      }
    }
    result.push({ ordinal: segment.ordinal, startMs: corrected, endMs: segment.endMs, text: segment.text });
    details.push({ ordinal: segment.ordinal, originalStartMs: segment.startMs, onsetMs: onset, correctedStartMs: corrected, deltaMs: corrected - segment.startMs, status });
    previousEnd = segment.endMs;
  });
  return { segments: result, details };
}

export const TIMING_TOLERANCE_MS = 300;

export interface TimingQaSegment {
  readonly ordinal: number;
  readonly originalStartMs: number;
  readonly correctedStartMs: number;
  readonly verifierOnsetMs: number | null;
  /** original - verifier (negatif = Whisper sesten ERKEN). */
  readonly preErrorMs: number | null;
  /** corrected - verifier. */
  readonly postErrorMs: number | null;
  readonly status: RetimeStatus;
  readonly ok: boolean;
}

export interface TimingQaReport {
  readonly status: "pass" | "fail";
  readonly toleranceMs: number;
  readonly segments: TimingQaSegment[];
  readonly meanPreErrorMs: number | null;
  readonly maxAbsPreErrorMs: number | null;
  readonly maxAbsPostErrorMs: number | null;
  readonly failures: string[];
}

function mean(values: readonly number[]): number | null {
  return values.length === 0 ? null : Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

/** Düzeltilmiş başlangıçları, BAĞIMSIZ dedektörün onset'leriyle karşılaştırır. */
export function evaluateTimingQa(
  details: readonly SegmentRetiming[],
  verifierRegions: readonly SpeechRegion[],
  options: { toleranceMs?: number; searchWindowMs?: number } = {},
): TimingQaReport {
  const toleranceMs = options.toleranceMs ?? TIMING_TOLERANCE_MS;
  const searchWindowMs = options.searchWindowMs ?? 1000;
  const verifierOnsets = verifierRegions.map((region) => region.startMs).sort((a, b) => a - b);
  const failures: string[] = [];

  const segments = details.map((detail): TimingQaSegment => {
    let verifier: number | null = null;
    for (const onset of verifierOnsets) {
      if (Math.abs(onset - detail.correctedStartMs) > searchWindowMs) continue;
      if (verifier === null || Math.abs(onset - detail.correctedStartMs) < Math.abs(verifier - detail.correctedStartMs)) verifier = onset;
    }
    const preErrorMs = verifier === null ? null : detail.originalStartMs - verifier;
    const postErrorMs = verifier === null ? null : detail.correctedStartMs - verifier;
    const retimed = detail.status === "snapped" || detail.status === "aligned";
    const withinTolerance = postErrorMs !== null && Math.abs(postErrorMs) <= toleranceMs;
    const ok = retimed && withinTolerance;
    if (!ok) {
      const reason = !retimed ? `düzeltilemedi (${detail.status})` : verifier === null ? "bağımsız dedektör onset bulamadı" : `hata ${postErrorMs}ms > ±${toleranceMs}ms`;
      failures.push(`#${detail.ordinal}: ${reason}`);
    }
    return { ordinal: detail.ordinal, originalStartMs: detail.originalStartMs, correctedStartMs: detail.correctedStartMs, verifierOnsetMs: verifier, preErrorMs, postErrorMs, status: detail.status, ok };
  });

  const pre = segments.flatMap((segment) => (segment.preErrorMs === null ? [] : [segment.preErrorMs]));
  const post = segments.flatMap((segment) => (segment.postErrorMs === null ? [] : [segment.postErrorMs]));
  return {
    status: failures.length === 0 ? "pass" : "fail",
    toleranceMs,
    segments,
    meanPreErrorMs: mean(pre),
    maxAbsPreErrorMs: pre.length === 0 ? null : Math.max(...pre.map(Math.abs)),
    maxAbsPostErrorMs: post.length === 0 ? null : Math.max(...post.map(Math.abs)),
    failures,
  };
}

/** Düzeltilmiş (ordinal, startMs, endMs, text) kümesinin parmak izi: QA sonucunun HANGİ zamanlama için geçerli olduğunu bağlar. */
export function segmentTimingFingerprint(segments: readonly Pick<TimedSegment, "ordinal" | "startMs" | "endMs" | "text">[]): string {
  const canonical = [...segments].sort((a, b) => a.ordinal - b.ordinal).map((segment) => `${segment.ordinal}|${segment.startMs}|${segment.endMs}|${segment.text}`).join("\n");
  return createHash("sha256").update(canonical).digest("hex");
}
