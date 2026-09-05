import { pgTable, primaryKey, uuid } from "drizzle-orm/pg-core";
import { videosTable } from "../videos/videos.schema";
import { wordsTable } from "./words.schema";

/**
 * Curated association: "bu video bu kelimeyi öğretmeyi hedefliyor." Transcript
 * occurrence DEĞİL — timestamp, occurrence count, position YOK (Chunk 9 kararı,
 * transcript/altyazı sistemi henüz yok). Composite PK zaten "aynı video+kelime
 * çifti birden fazla satır olamaz" invariant'ını garanti ediyor — occurrence
 * sayısı bu tabloda anlamlı değil.
 *
 * Her iki FK de CASCADE: bu saf bir yapısal ilişki, tarihsel bir kayıt değil —
 * video ya da kelime silinirse aralarındaki ilişkinin de anlamsızlaşması doğru
 * (video_watch_events/quiz_answer_events'teki historical-event NO ACTION kararıyla
 * KARIŞTIRILMAMALI, bkz. user_saved_words'teki aynı ayrım).
 */
export const videoWordsTable = pgTable(
  "video_words",
  {
    videoId: uuid("video_id")
      .notNull()
      .references(() => videosTable.id, { onDelete: "cascade" }),
    wordId: uuid("word_id")
      .notNull()
      .references(() => wordsTable.id, { onDelete: "cascade" }),
  },
  (table) => [primaryKey({ columns: [table.videoId, table.wordId] })],
);
