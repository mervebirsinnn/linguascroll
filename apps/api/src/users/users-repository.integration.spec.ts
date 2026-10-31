import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import type { Pool } from "pg";
import { createTestDatabaseConnection, truncateTestTables } from "../videos/test-database";
import { UsersRepository } from "./users-repository";
import { usersTable } from "./users.schema";

describe("UsersRepository (integration, gerçek Postgres)", () => {
  let db: NodePgDatabase;
  let pool: Pool;
  let repository: UsersRepository;

  beforeAll(() => {
    const connection = createTestDatabaseConnection();
    db = connection.db;
    pool = connection.pool;
    repository = new UsersRepository(db);
  });

  beforeEach(async () => {
    await truncateTestTables(db);
  });

  afterAll(async () => {
    await pool.end();
  });

  it("findOrCreateByFirebaseUid: ilk çağrıda kullanıcı yaratır, sonraki çağrılarda AYNI id'yi döner", async () => {
    const first = await repository.findOrCreateByFirebaseUid("uid-a");
    const second = await repository.findOrCreateByFirebaseUid("uid-a");

    expect(first.id).toMatch(/^[0-9a-f-]{36}$/i);
    expect(second.id).toBe(first.id);
    expect(await db.select().from(usersTable)).toHaveLength(1);
  });

  it("farklı Firebase hesapları farklı backend kullanıcılarına bağlanır", async () => {
    const a = await repository.findOrCreateByFirebaseUid("uid-a");
    const b = await repository.findOrCreateByFirebaseUid("uid-b");
    expect(a.id).not.toBe(b.id);
  });

  it("aynı hesabın EŞZAMANLI ilk istekleri tek kullanıcı satırı üretir (UNIQUE + ON CONFLICT)", async () => {
    const results = await Promise.all(Array.from({ length: 5 }, () => repository.findOrCreateByFirebaseUid("uid-race")));
    expect(new Set(results.map((r) => r.id)).size).toBe(1);
    expect(await db.select().from(usersTable)).toHaveLength(1);
  });

  it("eski anonim (firebase_uid NULL) satırlar birden fazla olabilir ve hiçbir hesaba otomatik bağlanmaz", async () => {
    await db.insert(usersTable).values([{}, {}]);
    const signedIn = await repository.findOrCreateByFirebaseUid("uid-new");
    const rows = await db.select().from(usersTable);
    expect(rows).toHaveLength(3);
    expect(rows.filter((r) => r.firebaseUid === null).map((r) => r.id)).not.toContain(signedIn.id);
  });

  it("existsById, var olan kullanıcı için true, olmayan için false döner", async () => {
    const user = await repository.findOrCreateByFirebaseUid("uid-a");
    await expect(repository.existsById(user.id)).resolves.toBe(true);
    await expect(repository.existsById("00000000-0000-4000-8000-000000000099")).resolves.toBe(false);
  });
});
