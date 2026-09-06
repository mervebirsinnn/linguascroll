import { sql } from "drizzle-orm";
import { check, index, integer, pgTable, text, unique, uuid } from "drizzle-orm/pg-core";
import { videosTable } from "./videos.schema";

/**
 * Bir videonun zaman-damgalı transcript satırı — altyazı + tıklanınca açılan
 * EN/TR açıklama BİRLİKTE (Chunk 10). Ayrı bir "subtitle" ve "explanation"
 * tablosuna BÖLÜNMÜYOR: ikisi de aynı segment'in aynı anda var olan iki
 * projeksiyonu, bağımsız bir yaşam döngüleri yok — gereksiz JOIN'den kaçınmak
 * için tek tabloda.
 *
 * `ordinal` (1'den başlayan, video içinde sıra numarası) — sıralama/authoring
 * için `start_ms`'ten DAHA STABİL bir referans: bir segment'in zamanlaması
 * içerik düzenlemesiyle küçük ölçüde kayabilir (örn. seslendirme yeniden
 * render edilirse), ama "bu videonun 3. cümlesi" kimliği değişmez. `ORDER BY
 * video_id, ordinal` — start_ms'e göre değil.
 *
 * Her iki FK de CASCADE: video_words'teki "yapısal ilişki" kararıyla aynı —
 * bir video silinirse transcript'inin de anlamı kalmaz (video_watch_events'teki
 * tarihsel-event NO ACTION kararıyla KARIŞTIRILMAMALI, transcript bir geçmiş
 * kaydı değil, videonun kendisinin bir parçası).
 */
export const videoTranscriptSegmentsTable = pgTable(
  "video_transcript_segments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    videoId: uuid("video_id")
      .notNull()
      .references(() => videosTable.id, { onDelete: "cascade" }),
    ordinal: integer("ordinal").notNull(),
    startMs: integer("start_ms").notNull(),
    endMs: integer("end_ms").notNull(),
    text: text("text").notNull(),
    englishExplanation: text("english_explanation").notNull(),
    turkishExplanation: text("turkish_explanation").notNull(),
  },
  (table) => [
    unique("video_transcript_segments_video_id_ordinal_unique").on(table.videoId, table.ordinal),
    check("video_transcript_segments_start_ms_non_negative_check", sql`${table.startMs} >= 0`),
    check("video_transcript_segments_end_after_start_check", sql`${table.endMs} > ${table.startMs}`),
    // Chunk 10: FeedService'in gerçek query pattern'i — WHERE video_id IN (...)
    // ORDER BY video_id, ordinal (bkz. transcript-segments-repository.ts).
    index("video_transcript_segments_video_id_ordinal_idx").on(table.videoId, table.ordinal),
  ],
);
