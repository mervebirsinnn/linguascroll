import { pgTable, text, timestamp } from "drizzle-orm/pg-core";
/** Eski (henüz süresi dolmamış) token'ın silinen hesabı yeniden yaratmasını engeller.
 * UID/e-posta tutulmaz; yalnızca SHA-256 UID özeti ve silme zamanı saklanır. */
export const deletedAccountsTable = pgTable("deleted_accounts", {
  uidHash: text("uid_hash").primaryKey(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }).notNull().defaultNow(),
});
