import { sql } from "drizzle-orm";
import { check, integer, pgTable, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";

/**
 * Persistence model — shared-types'taki Video (domain contract) ile KASITLI olarak
 * aynı şekilde değil (bkz. VideosRepository'deki mapping):
 * - id: DB-generated (gen_random_uuid() default). Uygulama kodu bir id ÜRETMEZ;
 *   sadece seed script'i, idempotency için kendi sabit id'lerini açıkça verir.
 * - createdAt burada var, domain Video'da yok — audit/operasyonel bir alan, chunk 1
 *   kararı gereği domain contract'ın parçası değil.
 * - muxAssetId burada var ama client'a hiç sızmıyor — VideosRepository bunu Video'ya
 *   map ederken bırakmaz, VideosService resolvePlaybackUrl ile playbackUrl'e çevirir.
 * - cefrLevel/topic ve learningLanguage bilinçli olarak text: uzunluk sınırı
 *   (varchar(n)) Postgres'te depolama/performans avantajı sağlamıyor, cefrLevel/topic'in
 *   şekli zaten aşağıdaki CHECK'lerle, learningLanguage'ın şekli ise application-level
 *   Zod ile garanti ediliyor — aynı kısıtı iki yerde tekrar etmiyoruz.
 *
 * VIDEO IDENTITY/DURATION İMMUTABILITY (Chunk 7 kararı): bir `videos.id` altında
 * playable asset/duration'ın historical anlamı değiştirecek şekilde UPDATE
 * edilmemesi bekleniyor — içerik gerçekten değişiyorsa (örn. yeniden encode,
 * farklı bir kesim) yeni bir video satırı (yeni id) oluşturulmalı, mevcut
 * satırın duration_ms'i değiştirilmemeli. Bu yüzden video_watch_events'te bir
 * `duration_ms_at_watch` snapshot alanı YOK: personalization ranking'i (bkz.
 * PersonalizationRepository) watchedMs/duration_ms oranını HER ZAMAN canlı JOIN
 * ile hesaplıyor, bu invariant kırılırsa (bir id'nin duration'ı gerçekten
 * değişirse) geçmiş event'lerin ratio'su sessizce yanlış yorumlanır — v1'de bu
 * riski bilinçli olarak kabul ediyoruz, snapshot alanı eklemiyoruz.
 */
export const videosTable = pgTable(
  "videos",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    learningLanguage: text("learning_language").notNull(),
    cefrLevel: text("cefr_level").notNull(),
    muxAssetId: text("mux_asset_id").notNull(),
    topic: text("topic").notNull(),
    durationMs: integer("duration_ms").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    check("cefr_level_check", sql`${table.cefrLevel} IN ('A1', 'A2', 'B1', 'B2', 'C1', 'C2')`),
    // content-interest taxonomy — shared-types'taki topicSchema ile birebir aynı
    // değer seti (bkz. packages/shared-types/src/video.ts).
    check("topic_check", sql`${table.topic} IN ('dating', 'travel', 'career', 'lifestyle', 'humor')`),
    // Chunk 7: >= 0 yerine > 0 — "playable" bir video için 0 süre domain olarak
    // imkansız bir durum, ranking'in kolaylığı için değil, bağımsız bir domain
    // düzeltmesi (bkz. shared-types'taki videoSchema.durationMs yorumu).
    check("duration_ms_positive_check", sql`${table.durationMs} > 0`),
    // Chunk 12: content-enrichment publish pipeline'ının idempotency garantisi —
    // aynı muxAssetId iki kez publish edilmeye çalışılırsa (aynı video yanlışlıkla
    // tekrar işlenirse) uygulama katmanındaki ön-kontrole (bkz. publish-content.ts)
    // EK OLARAK burada da, DB seviyesinde, race-condition'a karşı da geçerli bir
    // garanti var. resolve-playback-url.ts artık muxAssetId'den dosya adını
    // deterministik türettiği için (bkz. o dosyadaki Chunk 12 yorumu) iki farklı
    // videonun aynı muxAssetId'yi taşıması zaten aynı medya dosyasını işaret
    // etmesi anlamına gelirdi — bu constraint o durumu da yapısal olarak imkansız
    // kılıyor.
    unique("videos_mux_asset_id_unique").on(table.muxAssetId),
  ],
);
