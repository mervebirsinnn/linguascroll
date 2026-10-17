import * as fs from "node:fs";
import * as path from "node:path";
import { z } from "zod";
import { ENRICHMENT_OUTPUT_DIR } from "./enrich-transcript";
import { segmentTimingFingerprint, type TimedSegment } from "./segment-retiming";

/**
 * Altyazı zamanlama QA sonucunun (`output/<id>/timing-qa.json`) terfi/publish KAPISI.
 *
 *  - Dosya YOKSA kapı geçer: QA'dan geçmemiş eski içerik davranışı değişmez (geriye uyum).
 *  - status "fail" ise terfi (dolayısıyla publish; publish yalnızca approved kabul eder) REDDEDİLİR.
 *  - status "pass" ise yalnızca QA'nın doğruladığı zamanlama diskteki segmentlerle BİREBİR aynıysa geçer
 *    (parmak izi): QA'dan sonra zamanlar elle/başka araçla değiştirildiyse ya da düzeltme uygulanmadıysa reddedilir.
 */
export class TimingQaGateError extends Error {}

export const timingQaFileSchema = z.object({
  contentId: z.string().min(1),
  status: z.enum(["pass", "fail"]),
  toleranceMs: z.number().positive(),
  correctedFingerprint: z.string().length(64),
  failures: z.array(z.string()),
});
export type TimingQaFile = z.infer<typeof timingQaFileSchema>;

export function timingQaPath(contentId: string, outputDir: string = ENRICHMENT_OUTPUT_DIR): string {
  return path.join(outputDir, contentId, "timing-qa.json");
}

export function assertTimingQaAllowsPromotion(contentId: string, segments: readonly TimedSegment[], outputDir: string = ENRICHMENT_OUTPUT_DIR): void {
  const file = timingQaPath(contentId, outputDir);
  if (!fs.existsSync(file)) return;
  const parsed = timingQaFileSchema.safeParse(JSON.parse(fs.readFileSync(file, "utf-8")));
  if (!parsed.success) {
    throw new TimingQaGateError(`"${file}" geçerli bir timing-qa kaydı değil — terfi durduruldu.`);
  }
  const qa = parsed.data;
  if (qa.status !== "pass") {
    throw new TimingQaGateError(
      `"${contentId}" altyazı zamanlama QA'sından GEÇMEDİ (±${qa.toleranceMs} ms) — terfi/publish kapalı:\n${qa.failures.map((failure) => `  - ${failure}`).join("\n")}`,
    );
  }
  if (segmentTimingFingerprint(segments) !== qa.correctedFingerprint) {
    throw new TimingQaGateError(
      `"${contentId}" için QA geçti ancak diskteki segment zamanları QA'nın doğruladığıyla aynı değil (düzeltme uygulanmadı ya da sonradan değişti). ` +
        `Önce: node dist/content-enrichment/align-onsets.js --content-id ${contentId} --apply`,
    );
  }
}
