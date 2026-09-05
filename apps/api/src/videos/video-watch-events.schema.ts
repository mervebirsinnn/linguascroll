import { sql } from "drizzle-orm";
import { check, index, integer, pgTable, timestamp, uuid } from "drizzle-orm/pg-core";
import { usersTable } from "../users/users.schema";
import { videosTable } from "./videos.schema";

/**
 * Append-only learning-signal log — video başına "current state" değil, exposure
 * başına bir satır. UNIQUE(user_id, video_id) BİLİNÇLİ OLARAK YOK: aynı kullanıcı
 * aynı videoyu birden fazla kez izleyebilir (scroll-back), her exposure kendi
 * gerçeğini taşıyan ayrı bir satır — bu değerli bir sinyal, "duplicate" değil.
 *
 * watchedMs = mobile'ın bu exposure boyunca player'ın GERÇEKTEN oynattığı süre
 * (bkz. VideoFeedItem — expo-video'nun `playingChange` event'i ile ölçülüyor,
 * buffering/pause dahil edilmiyor). completed/skipped gibi bir yorum burada
 * YOK — o, Chunk 7'nin read-side policy'si (bkz. PersonalizationRepository).
 *
 * user_id → ON DELETE CASCADE: bir kullanıcı silinirse (gelecekte "hesabımı sil"
 * gibi bir özellik) kendi event'lerinin de silinmesi DOĞRU/istenen davranış.
 *
 * video_id → ON DELETE CASCADE DEĞİL (Chunk 7 düzeltmesi, önceki halinde CASCADE'di):
 * bir video içerik-ops tarafından silinirse, o videoya ait tarihsel watch-history
 * (tam olarak bu tablonun var olma sebebi) sessizce yok olmamalı. Varsayılan
 * (NO ACTION) davranış: bir video, ona ait watch-event'i varken silinemez —
 * bu bilinçli bir kısıt, video-silme feature'ı henüz yok zaten.
 */
export const videoWatchEventsTable = pgTable(
  "video_watch_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    videoId: uuid("video_id")
      .notNull()
      .references(() => videosTable.id),
    watchedMs: integer("watched_ms").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    check("video_watch_events_watched_ms_non_negative_check", sql`${table.watchedMs} >= 0`),
    // Chunk 7: artık her GET /feed isteğinde çalışan gerçek bir query pattern var
    // (PersonalizationRepository: WHERE user_id = ? JOIN videos GROUP BY topic) —
    // index'siz bu, platform genelindeki TÜM watch-event satırlarında sequential
    // scan demek. Spekülatif değil, gerçek ihtiyaç.
    index("video_watch_events_user_id_idx").on(table.userId),
  ],
);
