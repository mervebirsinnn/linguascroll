import { Inject, Injectable } from "@nestjs/common";
import { createHash } from "node:crypto";
import { deletedAccountsTable } from "./deleted-accounts.schema";
import { eq, sql } from "drizzle-orm";
import { DRIZZLE_DB, type Database } from "../database/database.module";
import { usersTable } from "./users.schema";

/**
 * Persistence katmanı: sadece users tablosuna erişim. HTTP/DTO bilmez —
 * bunlar UsersService'in işi.
 */
@Injectable()
export class UsersRepository {
  constructor(@Inject(DRIZZLE_DB) private readonly db: Database) {}

  /**
   * 2026-10-27 — doğrulanmış Firebase UID'nin backend kullanıcısı; yoksa yaratır. Eşzamanlı
   * ilk istekler (aynı hesap iki cihazdan / iki paralel istek) için güvenli: INSERT ... ON
   * CONFLICT DO NOTHING + UNIQUE(firebase_uid) tek satırı garanti ediyor; kaybeden taraf
   * mevcut satırı okuyor. (Eski anonim `create()` KALDIRILDI — anonim kullanıcı yaratılmıyor.)
   */
  async findOrCreateByFirebaseUid(firebaseUid: string): Promise<{ id: string; deletedAt: Date | null }> {
    return this.db.transaction(async (tx) => {
      await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${firebaseUid}))`);
      const hash = createHash("sha256").update(firebaseUid).digest("hex");
      const [deleted] = await tx.select().from(deletedAccountsTable).where(eq(deletedAccountsTable.uidHash, hash));
      if (deleted) return { id: "", deletedAt: deleted.deletedAt };
      const [inserted] = await tx.insert(usersTable).values({ firebaseUid }).onConflictDoNothing({ target: usersTable.firebaseUid }).returning({ id: usersTable.id, deletedAt: usersTable.deletedAt });
      if (inserted) return inserted;
      const [existing] = await tx.select({ id: usersTable.id, deletedAt: usersTable.deletedAt }).from(usersTable).where(eq(usersTable.firebaseUid, firebaseUid)).limit(1);
      if (!existing) throw new Error("Firebase kullanıcısı çözülemedi");
      return existing;
    });
  }

  async beginDeletion(firebaseUid: string): Promise<string | null> {
    const [user] = await this.db.update(usersTable).set({ deletedAt: new Date() }).where(eq(usersTable.firebaseUid, firebaseUid)).returning({ id: usersTable.id });
    return user?.id ?? null;
  }
  async finishDeletion(userId: string): Promise<void> {
    await this.db.transaction(async (tx) => {
      const [user] = await tx.select().from(usersTable).where(eq(usersTable.id, userId));
      if (!user?.firebaseUid) return;
      await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${user.firebaseUid}))`);
      const hash = createHash("sha256").update(user.firebaseUid).digest("hex");
      await tx.insert(deletedAccountsTable).values({ uidHash: hash }).onConflictDoNothing();
      await tx.delete(usersTable).where(eq(usersTable.id, userId));
    });
  }

  async existsById(userId: string): Promise<boolean> {
    const [row] = await this.db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.id, userId)).limit(1);
    return row !== undefined;
  }
}
