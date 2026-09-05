import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import type { Pool } from "pg";
import { createTestDatabaseConnection, truncateTestTables } from "../videos/test-database";
import { UsersRepository } from "./users-repository";

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

  it("create(), DB-generated uuid id ile yeni bir kullanıcı satırı yaratır", async () => {
    const user = await repository.create();

    expect(typeof user.id).toBe("string");
    expect(user.id).toMatch(/^[0-9a-f-]{36}$/i);
  });

  it("her create() çağrısı ayrı bir id üretir", async () => {
    const first = await repository.create();
    const second = await repository.create();

    expect(first.id).not.toBe(second.id);
  });

  it("existsById, var olan bir kullanıcı için true döner", async () => {
    const user = await repository.create();

    await expect(repository.existsById(user.id)).resolves.toBe(true);
  });

  it("existsById, var olmayan (ama geçerli UUID biçimli) bir id için false döner", async () => {
    await expect(repository.existsById("00000000-0000-4000-8000-000000000099")).resolves.toBe(false);
  });
});
