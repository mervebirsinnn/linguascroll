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

  async create(): Promise<{ id: string }> {
    const [user] = await this.db.insert(usersTable).values({}).returning({ id: usersTable.id });
    if (!user) {
      // INSERT ... RETURNING boş dönerse bu bir infra/driver anomalisi —
      // sessizce yutup çağırana geçersiz bir sonuç döndürmek yerine patlıyoruz.
      throw new Error("Anonymous user insert edilemedi — beklenmeyen boş returning() sonucu");
    }
    return user;
  }

  async existsById(userId: string): Promise<boolean> {
    const [row] = await this.db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.id, userId)).limit(1);
    return row !== undefined;
  }

  /**
   * 2026-10-01 — ücretsiz gün-1 kuralı (bkz. subscriptions modülü) için:
   * kullanıcının hesabı NE ZAMAN açıldı. Var olmayan bir userId için `null`
   * (çağıran zaten `userExists`/FK ile bu durumu başka yerde ele alıyor,
   * burada ayrıca throw etmiyoruz — `existsById` ile aynı "sessiz not-found" stili).
   */
  async findCreatedAt(userId: string): Promise<Date | null> {
    const [row] = await this.db.select({ createdAt: usersTable.createdAt }).from(usersTable).where(eq(usersTable.id, userId)).limit(1);
    return row?.createdAt ?? null;
  }
}
