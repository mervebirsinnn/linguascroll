import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

/**
 * users = backend'in kendi kullanıcı kimliği. `id` diğer tüm tablolardaki user_id FK'lerinin
 * çapası ve RevenueCat App User ID'si — hiç değişmez.
 *
 * 2026-10-27 — gerçek hesap: kimlik doğrulama Firebase Authentication'da (ilk aşamada sadece
 * Google ile giriş). `firebase_uid` = doğrulanmış Firebase ID token'ının `sub` alanı; bir
 * Firebase hesabı TAM OLARAK bir backend kullanıcısına bağlanır (UNIQUE — veri hangi koddan
 * gelirse gelsin geçerli olması gereken, değişme ihtimali düşük bir invariant). Parola/e-posta
 * gibi auth alanları burada YOK: onlar Firebase'de.
 *
 * NULL `firebase_uid` = eski anonim kullanıcı satırı. Bunlar bilinçli olarak hiçbir Firebase
 * hesabıyla OTOMATİK birleştirilmiyor: anonim UUID'ye sahip olduğunu kanıtlayan güvenli bir
 * sır yok (UUID istemcinin AsyncStorage'ında duruyordu, başkasına ait olabilir). Postgres'te
 * UNIQUE birden fazla NULL'a izin verdiği için eski satırlar kısıtı ihlal etmez.
 */
export const usersTable = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  firebaseUid: text("firebase_uid").unique(),
});
