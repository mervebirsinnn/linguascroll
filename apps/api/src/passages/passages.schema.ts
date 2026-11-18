import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  foreignKey,
  index,
  integer,
  pgTable,
  primaryKey,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { wordsTable } from "../words/words.schema";

/**
 * Okuma / Paragraf Pratiği içerik aggregate'i (passages + kelimeler + span'lar + sorular + şıklar).
 * `quizzes` tablosuna BİLİNÇLİ OLARAK dokunulmuyor: orada `source_transcript_segment_id NOT NULL`
 * bir domain invariant'ı (her quiz bir video segmentinden gelir); paragraf soruları ayrı tablolarda
 * yaşıyor ki o invariant gevşemesin.
 *
 * `slug` / `key` alanları (passage, soru, şık) yayın paketindeki KARARLI anahtarlardır: aynı paketi
 * yeniden çalıştırmak aynı satırlara eşlenir, kopya üretmez (bkz. yayın betiği, sonraki PR).
 *
 * `retired_at`: esaslı düzeltmede eski metin silinmez, emekli edilir (cevap satırları FK ile ona bağlı
 * olabilir). Servis yalnız `retired_at IS NULL` olanları gösterir; böylece eski skorla yeni açıklama
 * çelişmez. `sort_order` yayından sonra DEĞİŞMEZ (cursor (sort_order, id) kararlılığı için) — bunu
 * DB değil yayıncı zorlar; değişebilirlik ucuz bir kural olduğu için burada kısıt konmadı.
 *
 * `slug` GLOBAL olarak benzersiz ve emekli edilmiş satırlar da sayılır: esaslı düzeltme eski satırı emekli edip
 * YENİ slug'lı yeni bir satır yayınlar (aynı slug yeniden kullanılamaz). Slug'ı yalnız aktif satırlarda benzersiz
 * yapmak ikinci bir (partial index) kural getirirdi; bugün gerçek bir ihtiyaç olmadığı için basit tutuldu.
 *
 * Cevabın metindeki dayanak aralığı ve editoryal kaynak kaydı (iddia/kaynak/kontrol tarihi) BURADA TUTULMUYOR:
 * ikisi de içerik paketi dosyasında yaşar ve yayın doğrulayıcısı tarafından denetlenir; çalışma zamanında hiçbir
 * davranış tüketmediği için kolon eklenmedi.
 *
 * `level` kontrolü DB'de de var (veri hangi uygulamadan gelirse gelsin B1..C2 dışı imkânsız bir
 * durum): shared-types'taki passageLevelSchema ile aynı küme.
 */
export const passagesTable = pgTable(
  "passages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: text("slug").notNull().unique(),
    level: text("level").notNull(),
    title: text("title").notNull(),
    topic: text("topic").notNull(),
    // Paragrafların düz metni, sıra = paragraph_index. Span offset'leri (passage_word_spans) bu metinlere göre.
    paragraphs: text("paragraphs").array().notNull(),
    sortOrder: integer("sort_order").notNull(),
    isFreeSample: boolean("is_free_sample").notNull().default(false),
    contentRevision: integer("content_revision").notNull().default(1),
    contentHash: text("content_hash").notNull(),
    retiredAt: timestamp("retired_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    check("passages_level_check", sql`${table.level} in ('B1', 'B2', 'C1', 'C2')`),
    check("passages_paragraphs_not_empty_check", sql`cardinality(${table.paragraphs}) > 0`),
    // GET /passages keyset sorgusu: WHERE level = ? AND (sort_order, id) > (?, ?) ORDER BY sort_order, id.
    index("passages_level_sort_order_id_idx").on(table.level, table.sortOrder, table.id),
  ],
);

/**
 * "Bu metinde bu kelime var" + kaydedilecek bağlam cümlesi. Kelime id'leri yayın sırasında `words`'e
 * yazılır (video_words akışıyla aynı); kullanıcı dokunuşunda `words`'e yeni satır AÇILMAZ (yarış ve
 * kopya riski yok). Her iki FK de CASCADE: saf yapısal ilişki, tarihsel kayıt değil.
 */
export const passageWordsTable = pgTable(
  "passage_words",
  {
    passageId: uuid("passage_id")
      .notNull()
      .references(() => passagesTable.id, { onDelete: "cascade" }),
    wordId: uuid("word_id")
      .notNull()
      .references(() => wordsTable.id, { onDelete: "cascade" }),
    // Kelimenin metindeki İLK geçtiği cümle (kaynak cümle tie-break kararı: tekrar eden kelimede de aynı).
    contextSentence: text("context_sentence").notNull(),
  },
  (table) => [primaryKey({ columns: [table.passageId, table.wordId] })],
);

/**
 * Bir kelimenin/ifadenin metindeki HER geçişi ayrı bir satırdır; çok kelimeli ifade ("account for") TEK
 * satırdır. `start`/`end` paragraf metni içinde JS string (UTF-16) indeksi, [start, end) yarı açık.
 * `surface`, `paragraphs[paragraph_index].slice(start, end)` ile birebir eşleşmek zorundadır — bunu
 * yayın doğrulayıcısı kontrol eder (karmaşık, zamanla değişebilir kural → DB'de tekrar edilmedi). DB şu
 * imkânsız durumları engeller: negatif/ters aralık, aynı başlangıçta iki span, passage_words'te olmayan kelime.
 * Kesikli ifadeler ("if … then") MVP'de desteklenmez.
 */
export const passageWordSpansTable = pgTable(
  "passage_word_spans",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    passageId: uuid("passage_id").notNull(),
    paragraphIndex: integer("paragraph_index").notNull(),
    start: integer("start").notNull(),
    end: integer("end").notNull(),
    wordId: uuid("word_id").notNull(),
    surface: text("surface").notNull(),
    // BU geçişin cümlesi (kaydedilen kaynak cümle + kelime penceresinde gösterilen). NULLABLE: yayıncı her span için yazar;
    // null ise (ör. bu alan gelmeden önce yazılmış satır) passage_words.context_sentence (ilk geçişin cümlesi) kullanılır.
    contextSentence: text("context_sentence"),
  },
  (table) => [
    foreignKey({
      name: "passage_word_spans_passage_word_fk",
      columns: [table.passageId, table.wordId],
      foreignColumns: [passageWordsTable.passageId, passageWordsTable.wordId],
    }).onDelete("cascade"),
    check("passage_word_spans_range_check", sql`${table.paragraphIndex} >= 0 and ${table.start} >= 0 and ${table.end} > ${table.start}`),
    unique("passage_word_spans_start_unique").on(table.passageId, table.paragraphIndex, table.start),
  ],
);

export const passageQuestionsTable = pgTable(
  "passage_questions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    passageId: uuid("passage_id")
      .notNull()
      .references(() => passagesTable.id, { onDelete: "cascade" }),
    key: text("key").notNull(),
    position: integer("position").notNull(),
    // Düz metin (enum DEĞİL): C2 yeni bir soru türü getirirse migration/wire kırılması gerekmez.
    type: text("type").notNull(),
    prompt: text("prompt").notNull(),
  },
  (table) => [
    unique("passage_questions_position_unique").on(table.passageId, table.position),
    unique("passage_questions_key_unique").on(table.passageId, table.key),
    check("passage_questions_position_positive_check", sql`${table.position} >= 1`),
  ],
);

/**
 * `UNIQUE(question_id, id)` gereksiz görünür (id zaten PK) ama bileşik FK'nin hedefi olması için şart:
 * passage_answers (question_id, option_id) → buraya bağlanarak "bu şık bu soruya ait" garantisini DB'ye verir.
 * En fazla bir doğru şık: partial unique index (quiz_options ile aynı desen); "tam olarak bir" kuralı runtime'da.
 */
export const passageOptionsTable = pgTable(
  "passage_options",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    questionId: uuid("question_id")
      .notNull()
      .references(() => passageQuestionsTable.id, { onDelete: "cascade" }),
    key: text("key").notNull(),
    position: integer("position").notNull(),
    text: text("text").notNull(),
    isCorrect: boolean("is_correct").notNull(),
    // Düz metin, nullable: doğru şıkta tuzak türü zorunlu değil; yeni tuzak türü migration gerektirmez.
    trapType: text("trap_type"),
    explanation: text("explanation").notNull(),
  },
  (table) => [
    unique("passage_options_question_id_id_unique").on(table.questionId, table.id),
    unique("passage_options_position_unique").on(table.questionId, table.position),
    unique("passage_options_key_unique").on(table.questionId, table.key),
    check("passage_options_position_non_negative_check", sql`${table.position} >= 0`),
    uniqueIndex("passage_options_one_correct_per_question").on(table.questionId).where(sql`${table.isCorrect} = true`),
  ],
);
