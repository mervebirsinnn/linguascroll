import { sql } from "drizzle-orm";
import { boolean, check, index, integer, pgTable, text, timestamp, unique, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { videoTranscriptSegmentsTable } from "../videos/transcript-segments.schema";

/**
 * Chunk 10: `source_transcript_segment_id` — bu quiz'in HANGİ transcript
 * segment'inden üretildiği. `source_video_id` BİLİNÇLİ OLARAK burada YOK
 * (Chunk 10 review kararı): video_id, segment üzerinden zaten türetilebilir
 * (segment.videoId) — iki FK tutmak duplicate state ve inconsistency riski
 * (segment.videoId ile quiz.sourceVideoId senkron kalmayabilir) yaratırdı.
 * "Bu videonun quiz'leri" gibi bir sorgu gerekirse JOIN transcript_segments
 * ON segment.video_id yeterli.
 *
 * ON DELETE CASCADE: video_words'teki "yapısal ilişki" kararıyla aynı — bir
 * quiz'in var olma sebebi doğrudan o segment, segment (dolayısıyla video)
 * silinirse quiz'in de anlamı kalmaz. quiz_answer_events'teki tarihsel-event
 * NO ACTION kararıyla KARIŞTIRILMAMALI: answer-event zaten kendi isCorrect
 * anlık görüntüsünü taşıyor, quiz silinse bile o kayıt bozulmaz.
 *
 * NOT NULL: Chunk 10'dan itibaren HER quiz gerçek bir transcript segment'inden
 * gelmek ZORUNDA — generic/video-bağımsız quiz artık bir domain invariant'ı
 * olarak imkansız (bkz. seed-quizzes.ts'in yeniden yazılması).
 */
export const quizzesTable = pgTable(
  "quizzes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    question: text("question").notNull(),
    sourceTranscriptSegmentId: uuid("source_transcript_segment_id")
      .notNull()
      .references(() => videoTranscriptSegmentsTable.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    // FeedService'in yeni "son video grubunun source segment'iyle eşleşen quiz"
    // arama query pattern'i (bkz. feed.service.ts) — gerçek, öngörülebilir bir
    // WHERE source_transcript_segment_id IN (...) ihtiyacı.
    index("quizzes_source_transcript_segment_id_idx").on(table.sourceTranscriptSegmentId),
  ],
);

/**
 * quiz_id → quizzes.id FK'si CASCADE ile: bir quiz silinirse sahipsiz option
 * kalması gerçek bir bütünlük bozukluğu olurdu, bunun için meşru bir sebep yok.
 *
 * UNIQUE(quiz_id, position): iki option'ın aynı pozisyonu paylaşması tanımsız
 * bir sıralama demek — "imkansız durum" kategorisinde, DB'nin işi.
 *
 * Partial unique index (quiz_id WHERE is_correct=true): DB seviyesinde "EN FAZLA
 * bir doğru cevap" garantisi. "TAM OLARAK bir" değil — "en az bir" kısmı,
 * geçici olarak sıfır doğru cevaplı bir quiz'in (örn. içerik düzenleme sırasında)
 * meşru bir ara-hal olabilmesi yüzünden bilinçli olarak DB'de zorlanmıyor;
 * "tam olarak bir" invariant'ı apps/api/src/quizzes/quiz.ts'te runtime'da
 * doğrulanıyor.
 */
export const quizOptionsTable = pgTable(
  "quiz_options",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    quizId: uuid("quiz_id")
      .notNull()
      .references(() => quizzesTable.id, { onDelete: "cascade" }),
    text: text("text").notNull(),
    isCorrect: boolean("is_correct").notNull(),
    position: integer("position").notNull(),
  },
  (table) => [
    unique("quiz_options_position_unique").on(table.quizId, table.position),
    check("quiz_options_position_non_negative_check", sql`${table.position} >= 0`),
    uniqueIndex("quiz_options_one_correct_per_quiz").on(table.quizId).where(sql`${table.isCorrect} = true`),
  ],
);
