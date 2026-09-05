import { pgTable, timestamp, uuid } from "drizzle-orm/pg-core";

/**
 * users = auth henüz yoksa da tutulan minimal bir kimlik çapası. Sadece bir id +
 * oluşturulma zamanı — email/passwordHash gibi hiçbir auth alanı YOK (YAGNI:
 * bugün gerçek ihtiyaç anonymous identity'ye bir FK anchor'ı vermek, auth değil).
 * İleride gerçek auth geldiğinde bu satırlar "claim" edilecek — id hiç değişmez,
 * bu yüzden learning-event tablolarındaki user_id FK'leri asla backfill gerektirmez.
 */
export const usersTable = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
