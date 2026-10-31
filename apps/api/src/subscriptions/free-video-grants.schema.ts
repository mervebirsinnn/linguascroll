import { pgTable, primaryKey, timestamp, uuid } from "drizzle-orm/pg-core";
import { usersTable } from "../users/users.schema";
import { videosTable } from "../videos/videos.schema";

/**
 * 2026-10-27 — ücretsiz hak defteri: hesap başına toplam 10 farklı video (günlük
 * YENİLENMEZ). Bir satır = "bu kullanıcıya bu video için ücretsiz oynatma erişimi
 * verildi". Sayaç bu tablonun satır sayısı.
 *
 * Neden `video_watch_events`'ten sayılmıyor: o tablo mobile'ın exposure SONUNDA gönderdiği
 * analitik bir log — gecikebilir, hiç gelmeyebilir, hızlı kaydırmada eşik altında kalır.
 * Sınırın kesin olması için hak, erişim VERİLİRKEN (playback-access) tüketiliyor.
 *
 * PK(user_id, video_id) = idempotency'nin DB garantisi: aynı videoya tekrar erişim yeni
 * satır/hak üretemez — veri hangi koddan gelirse gelsin geçerli, değişme ihtimali düşük
 * bir invariant (DB constraint için doğru aday). "En fazla 10" kuralı ise DB constraint
 * DEĞİL: ürün kararı, değişebilir — repository'de, kullanıcı satırı kilitlenerek atomik
 * uygulanıyor (bkz. free-video-grants-repository.ts).
 *
 * Yalnızca ÜCRETSİZ erişimler yazılır — abonenin izlediği videolar deftere girmez. Abonelik
 * bitince defter olduğu gibi kalır: tüketilmiş haklar sıfırlanmaz, abonelik sırasında
 * izlenenler de hak yakmamış olur.
 *
 * user_id → CASCADE (video_watch_events ile aynı gerekçe); video_id → NO ACTION
 * (watch-events ile aynı: geçmişi olan video sessizce silinemez).
 */
export const freeVideoGrantsTable = pgTable(
  "free_video_grants",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    videoId: uuid("video_id")
      .notNull()
      .references(() => videosTable.id),
    grantedAt: timestamp("granted_at", { withTimezone: true }).notNull().defaultNow(),
  },
  // PK (user_id, video_id) bugünkü TÜM sorguları (COUNT WHERE user_id, WHERE user_id AND
  // video_id IN) karşılıyor — ayrı index yok. video_id tek başına sorgulanmıyor (video
  // silme özelliği yok); öyle bir desen doğarsa o zaman eklenir.
  (table) => [primaryKey({ columns: [table.userId, table.videoId] })],
);
