import { sql } from "drizzle-orm";
import { check, integer, pgTable, text, unique, uuid } from "drizzle-orm/pg-core";
import { videoTranscriptSegmentsTable } from "./transcript-segments.schema";

/**
 * Bir segment'in öğretmek istediği phrase/grammar structure — segment başına
 * 0, 1 veya 2 olabilen GERÇEK bir çoğulluk (bkz. "ended up + V-ing" + ayrı bir
 * grammar noktası aynı cümlede olabilir). Bu yüzden video_transcript_segments'e
 * nullable "phrase"/"grammar" kolonları olarak EKLENMİYOR — video_words'teki
 * "ayrı curated ilişki tablosu" kararıyla aynı gerekçe.
 *
 * `type` MVP'de sadece iki değer taşıyor — generic bir taxonomy tablosu değil,
 * cefr_level/topic'teki gibi bilinçli olarak sabit bir enum (yeni bir tip
 * eklemek code+migration gerektirir).
 */
export const transcriptSegmentLearningPointsTable = pgTable(
  "transcript_segment_learning_points",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    transcriptSegmentId: uuid("transcript_segment_id")
      .notNull()
      .references(() => videoTranscriptSegmentsTable.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    expression: text("expression").notNull(),
    englishExplanation: text("english_explanation").notNull(),
    turkishExplanation: text("turkish_explanation").notNull(),
    exampleEn: text("example_en"),
    exampleTr: text("example_tr"),
    ordinal: integer("ordinal").notNull(),
  },
  (table) => [
    unique("transcript_segment_learning_points_segment_id_ordinal_unique").on(
      table.transcriptSegmentId,
      table.ordinal,
    ),
    check("transcript_segment_learning_points_type_check", sql`${table.type} IN ('phrase', 'grammar')`),
  ],
);
