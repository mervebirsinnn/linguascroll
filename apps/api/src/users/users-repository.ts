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
}
