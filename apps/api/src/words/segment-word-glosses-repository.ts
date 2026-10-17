import { Inject, Injectable } from "@nestjs/common";
import { videoWordGlossesSchema, type VideoWordGlosses } from "@linguascroll/shared-types";
import { eq } from "drizzle-orm";
import { DRIZZLE_DB, type Database } from "../database/database.module";
import { videoTranscriptSegmentsTable } from "../videos/transcript-segments.schema";
import { segmentWordGlossesTable } from "./segment-word-glosses.schema";

export type SegmentWordGlossInput = { segmentId: string; word: string; gloss: string };

@Injectable()
export class SegmentWordGlossesRepository {
  constructor(@Inject(DRIZZLE_DB) private readonly db: Database) {}

  /** Tek JOIN sorgusu: videonun tüm segment'lerinin anlamları, `segmentId -> word -> gloss`. */
  async findForVideo(videoId: string): Promise<VideoWordGlosses> {
    const rows = await this.db
      .select({
        segmentId: segmentWordGlossesTable.segmentId,
        word: segmentWordGlossesTable.word,
        gloss: segmentWordGlossesTable.gloss,
      })
      .from(segmentWordGlossesTable)
      .innerJoin(videoTranscriptSegmentsTable, eq(videoTranscriptSegmentsTable.id, segmentWordGlossesTable.segmentId))
      .where(eq(videoTranscriptSegmentsTable.videoId, videoId));

    const bySegment: Record<string, Record<string, string>> = {};
    for (const row of rows) {
      (bySegment[row.segmentId] ??= {})[row.word] = row.gloss;
    }
    return videoWordGlossesSchema.parse(bySegment);
  }

  /** Üretim CLI'ı için: videonun herhangi bir kelime anlamı var mı (idempotency kontrolü). */
  async hasAnyForVideo(videoId: string): Promise<boolean> {
    const rows = await this.db
      .select({ segmentId: segmentWordGlossesTable.segmentId })
      .from(segmentWordGlossesTable)
      .innerJoin(videoTranscriptSegmentsTable, eq(videoTranscriptSegmentsTable.id, segmentWordGlossesTable.segmentId))
      .where(eq(videoTranscriptSegmentsTable.videoId, videoId))
      .limit(1);
    return rows.length > 0;
  }

  /** Tek INSERT (batch) — aynı (segment, kelime) tekrar gelirse sessizce atlanır. */
  async insertMany(glosses: readonly SegmentWordGlossInput[]): Promise<void> {
    if (glosses.length === 0) {
      return;
    }
    await this.db.insert(segmentWordGlossesTable).values([...glosses]).onConflictDoNothing();
  }
}
