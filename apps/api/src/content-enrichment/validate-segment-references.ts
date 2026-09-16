import type { EnrichmentOutput } from "./enrichment-output.schema";
import type { SttDraftSegment } from "./stt-draft.schema";

/**
 * Chunk 12, madde 14 — "segment referansı olmayan learning point/quiz"
 * senaryosunu engeller. Zod, enrichmentOutputSchema seviyesinde `segmentOrdinal`'in
 * bir SAYI olduğunu garanti eder ama DRAFT'IN GERÇEK ordinal kümesiyle eşleştiğini
 * garanti EDEMEZ (statik bir şema, hangi draft'ın işlendiğini bilmiyor) — bu
 * kontrol o yüzden AYRI, saf bir fonksiyon olarak burada.
 *
 * DB/HTTP/LLM SDK bilmiyor — `enrich-transcript.ts` LLM çağrısından
 * hemen sonra, `publish-content.ts` da (defense-in-depth, elle düzenlenmiş
 * bir enriched.json okurken) çağırıyor.
 */
export class SegmentReferenceError extends Error {}

export function assertValidSegmentReferences(
  output: Pick<EnrichmentOutput, "segments" | "learningPoints" | "quiz">,
  draftSegments: readonly SttDraftSegment[],
): void {
  const validOrdinals = new Set(draftSegments.map((segment) => segment.ordinal));

  const outputOrdinals = output.segments.map((segment) => segment.ordinal);
  const outputOrdinalSet = new Set(outputOrdinals);
  if (outputOrdinalSet.size !== validOrdinals.size || [...validOrdinals].some((ordinal) => !outputOrdinalSet.has(ordinal))) {
    throw new SegmentReferenceError(
      "LLM çıktısındaki segment ordinal kümesi, draft transcript'in gerçek segment'leriyle birebir eşleşmiyor " +
        `(draft: [${[...validOrdinals].join(", ")}], çıktı: [${outputOrdinals.join(", ")}]).`,
    );
  }

  for (const learningPoint of output.learningPoints) {
    if (!validOrdinals.has(learningPoint.segmentOrdinal)) {
      throw new SegmentReferenceError(
        `Learning point ("${learningPoint.expression}") var olmayan bir segment ordinal'ına (${learningPoint.segmentOrdinal}) referans veriyor.`,
      );
    }
  }

  if (!validOrdinals.has(output.quiz.segmentOrdinal)) {
    throw new SegmentReferenceError(`Quiz var olmayan bir segment ordinal'ına (${output.quiz.segmentOrdinal}) referans veriyor.`);
  }
}
