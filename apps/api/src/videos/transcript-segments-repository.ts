import { Inject, Injectable } from "@nestjs/common";
import { transcriptSegmentSchema, type TranscriptSegment } from "@linguascroll/shared-types";
import { eq, inArray } from "drizzle-orm";
import { DRIZZLE_DB, type Database } from "../database/database.module";
import { transcriptSegmentLearningPointsTable } from "./transcript-segment-learning-points.schema";
import { videoTranscriptSegmentsTable } from "./transcript-segments.schema";

type SegmentLearningPointRow = {
  videoId: string;
  segmentId: string;
  ordinal: number;
  startMs: number;
  endMs: number;
  text: string;
  englishExplanation: string;
  turkishExplanation: string;
  learningPointId: string | null;
  learningPointType: string | null;
  learningPointExpression: string | null;
  learningPointEnglishExplanation: string | null;
  learningPointTurkishExplanation: string | null;
  learningPointExampleEn: string | null;
  learningPointExampleTr: string | null;
  learningPointOrdinal: number | null;
};

/**
 * Persistence katmanı: DB row → domain TranscriptSegment (nested learningPoints
 * dahil) projeksiyonunu bilir — quizzes-repository.ts'teki `groupRowsIntoQuizzes`
 * ile AYNI desen (flat SQL join satırları → nested domain şekli, Zod.parse
 * sınırında doğrulanır). FeedService'i, HTTP'yi, controller'ı BİLMEZ.
 *
 * `TranscriptSegmentsService` YOK (Chunk 10 review kararı) — bu repository
 * zaten tek gerçek transformasyonu (nested projeksiyon + video'ya göre
 * gruplama) yapıyor; `VideosService.getSegmentsForVideos` bunu doğrudan
 * çağırıyor. Ayrı bir Repository→Service→FeedService pass-through katmanı
 * eklemek burada hiçbir gerçek sorumluluk sınırını izole etmezdi.
 */
@Injectable()
export class TranscriptSegmentsRepository {
  constructor(@Inject(DRIZZLE_DB) private readonly db: Database) {}

  /**
   * Chunk 10 — FeedService'in bir sayfadaki video id'leri için TEK bir
   * `WHERE video_id IN (...)` sorgusuyla (LEFT JOIN learning_points) batch
   * resolve eder — id başına ayrı sorgu YOK. `ORDER BY video_id, ordinal,
   * learning_point.ordinal` — segment'in kendi stabil sıra alanına göre
   * (start_ms'e göre DEĞİL, bkz. transcript-segments.schema.ts yorumu).
   */
  async findSegmentsForVideos(videoIds: string[]): Promise<Map<string, TranscriptSegment[]>> {
    if (videoIds.length === 0) {
      return new Map();
    }

    const rows = await this.db
      .select({
        videoId: videoTranscriptSegmentsTable.videoId,
        segmentId: videoTranscriptSegmentsTable.id,
        ordinal: videoTranscriptSegmentsTable.ordinal,
        startMs: videoTranscriptSegmentsTable.startMs,
        endMs: videoTranscriptSegmentsTable.endMs,
        text: videoTranscriptSegmentsTable.text,
        englishExplanation: videoTranscriptSegmentsTable.englishExplanation,
        turkishExplanation: videoTranscriptSegmentsTable.turkishExplanation,
        learningPointId: transcriptSegmentLearningPointsTable.id,
        learningPointType: transcriptSegmentLearningPointsTable.type,
        learningPointExpression: transcriptSegmentLearningPointsTable.expression,
        learningPointEnglishExplanation: transcriptSegmentLearningPointsTable.englishExplanation,
        learningPointTurkishExplanation: transcriptSegmentLearningPointsTable.turkishExplanation,
        learningPointExampleEn: transcriptSegmentLearningPointsTable.exampleEn,
        learningPointExampleTr: transcriptSegmentLearningPointsTable.exampleTr,
        learningPointOrdinal: transcriptSegmentLearningPointsTable.ordinal,
      })
      .from(videoTranscriptSegmentsTable)
      .leftJoin(
        transcriptSegmentLearningPointsTable,
        eq(transcriptSegmentLearningPointsTable.transcriptSegmentId, videoTranscriptSegmentsTable.id),
      )
      .where(inArray(videoTranscriptSegmentsTable.videoId, videoIds))
      .orderBy(
        videoTranscriptSegmentsTable.videoId,
        videoTranscriptSegmentsTable.ordinal,
        transcriptSegmentLearningPointsTable.ordinal,
      );

    return groupRowsIntoSegmentsByVideoId(rows);
  }
}

/**
 * Zod'a parse ETTİRMEDEN önceki ham (henüz doğrulanmamış) şekil — `type` burada
 * BİLEREK `string` (literal union DEĞİL): satırın gerçekten "phrase"/"grammar"
 * olduğu iddiası bu fonksiyonun cast'iyle değil, aşağıdaki `transcriptSegmentSchema.parse`
 * çağrısıyla (videos-repository.ts'teki `toVideo` ile aynı desen) kanıtlanıyor.
 */
type RawGroupedSegment = {
  videoId: string;
  id: string;
  ordinal: number;
  startMs: number;
  endMs: number;
  text: string;
  englishExplanation: string;
  turkishExplanation: string;
  learningPoints: {
    id: string;
    type: string;
    expression: string;
    englishExplanation: string;
    turkishExplanation: string;
    exampleEn: string | null;
    exampleTr: string | null;
  }[];
};

function groupRowsIntoSegmentsByVideoId(rows: SegmentLearningPointRow[]): Map<string, TranscriptSegment[]> {
  const segmentsById = new Map<string, RawGroupedSegment>();

  for (const row of rows) {
    let segment = segmentsById.get(row.segmentId);
    if (!segment) {
      segment = {
        id: row.segmentId,
        videoId: row.videoId,
        ordinal: row.ordinal,
        startMs: row.startMs,
        endMs: row.endMs,
        text: row.text,
        englishExplanation: row.englishExplanation,
        turkishExplanation: row.turkishExplanation,
        learningPoints: [],
      };
      segmentsById.set(row.segmentId, segment);
    }

    // LEFT JOIN: learning point'i olmayan bir segment için bu kolonlar hep null.
    if (row.learningPointId) {
      segment.learningPoints.push({
        id: row.learningPointId,
        type: row.learningPointType!,
        expression: row.learningPointExpression!,
        englishExplanation: row.learningPointEnglishExplanation!,
        turkishExplanation: row.learningPointTurkishExplanation!,
        exampleEn: row.learningPointExampleEn,
        exampleTr: row.learningPointExampleTr,
      });
    }
  }

  const segmentsByVideoId = new Map<string, TranscriptSegment[]>();
  for (const { videoId, ...rest } of segmentsById.values()) {
    const parsed = transcriptSegmentSchema.parse(rest);
    const list = segmentsByVideoId.get(videoId) ?? [];
    list.push(parsed);
    segmentsByVideoId.set(videoId, list);
  }
  return segmentsByVideoId;
}
