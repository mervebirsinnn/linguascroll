import { pgTable, primaryKey, text, uuid } from "drizzle-orm/pg-core";
import { videoTranscriptSegmentsTable } from "../videos/transcript-segments.schema";

/**
 * Altyazı kelimelerinin cümle bağlamındaki Türkçe anlamı — offline üretilir
 * (bkz. generate-word-glosses.ts), runtime'da LLM çağrılmaz. `words` tablosundan
 * (kürate vocabulary, kaydedilebilir, global lemma) BİLİNÇLİ OLARAK ayrı: burada
 * anlam SEGMENT'e özgü (homonym'ler cümlede doğru anlamıyla kalır) ve kayıt/
 * review akışına bağlı değil.
 *
 * `word`: `normalizeGlossWord` çıktısı (shared-types) — API ve mobile aynı
 * normalizasyonu kullanıyor. PK (segment_id, word) hem idempotency hem de
 * `WHERE segment_id IN (...)` sorgusunun index'i. Segment silinirse anlamı da
 * gider (transcript'in parçası, tarihsel kayıt değil) → CASCADE.
 */
export const segmentWordGlossesTable = pgTable(
  "segment_word_glosses",
  {
    segmentId: uuid("segment_id")
      .notNull()
      .references(() => videoTranscriptSegmentsTable.id, { onDelete: "cascade" }),
    word: text("word").notNull(),
    gloss: text("gloss").notNull(),
  },
  (table) => [primaryKey({ columns: [table.segmentId, table.word] })],
);
