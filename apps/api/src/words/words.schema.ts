import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

/**
 * Persistence model — shared-types'taki Word (domain contract) ile KASITLI
 * olarak aynı şekilde değil: `createdAt` burada var, domain Word'de yok (audit/
 * operasyonel bir alan, videos.schema.ts'teki aynı kararla tutarlı).
 *
 * `UNIQUE(language, lemma)` BİLİNÇLİ OLARAK YOK: aynı lemma'nın birden fazla
 * anlamı (homonym, örn. "bank" — nehir kıyısı / finans kurumu) farklı `gloss`'larla
 * ayrı satırlar olarak var olabilmeli — bunu zorlamak yanlış bir kısıt olurdu.
 *
 * `frequencyRank` YOK (Chunk 9 kararı) — hiçbir behavior tarafından tüketilmiyor,
 * gerçek bir ihtiyaç doğmadan geri getirilmiyor.
 */
export const wordsTable = pgTable("words", {
  id: uuid("id").primaryKey().defaultRandom(),
  language: text("language").notNull(),
  lemma: text("lemma").notNull(),
  gloss: text("gloss").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
