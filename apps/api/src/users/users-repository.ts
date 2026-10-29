import { Inject, Injectable } from "@nestjs/common";
import { eq } from "drizzle-orm";
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
  async findOrCreateByFirebaseUid(firebaseUid: string): Promise<{ id: string }> {
    const [inserted] = await this.db
      .insert(usersTable)
      .values({ firebaseUid })
      .onConflictDoNothing({ target: usersTable.firebaseUid })
      .returning({ id: usersTable.id });
    if (inserted) {
      return inserted;
    }
    const [existing] = await this.db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.firebaseUid, firebaseUid)).limit(1);
    if (!existing) {
      // Çakışma oldu ama satır okunamadı — sadece arada silinirse mümkün; sessizce yutulmaz.
      throw new Error("Firebase kullanıcısı ne eklenebildi ne de bulunabildi");
    }
    return existing;
  }

  async existsById(userId: string): Promise<boolean> {
    const [row] = await this.db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.id, userId)).limit(1);
    return row !== undefined;
  }
}
