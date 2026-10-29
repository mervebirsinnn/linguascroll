import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import type { Pool } from "pg";
import { usersTable } from "../users/users.schema";
import { createTestDatabaseConnection, truncateTestTables } from "../videos/test-database";
import { videosTable } from "../videos/videos.schema";
import { FreeVideoGrantsRepository } from "./free-video-grants-repository";
import { freeVideoGrantsTable } from "./free-video-grants.schema";

const CAP = 10;

describe("FreeVideoGrantsRepository (integration, gerçek Postgres)", () => {
  let db: NodePgDatabase;
  let pool: Pool;
  let repository: FreeVideoGrantsRepository;

  beforeAll(() => {
    const connection = createTestDatabaseConnection();
    db = connection.db;
    pool = connection.pool;
    repository = new FreeVideoGrantsRepository(db);
  });

  beforeEach(async () => {
    await truncateTestTables(db);
  });

  afterAll(async () => {
    await pool.end();
  });

  async function createUser(): Promise<string> {
    const [user] = await db.insert(usersTable).values({}).returning();
    if (!user) throw new Error("Beklenen kullanıcı insert edilemedi");
    return user.id;
  }

  async function createVideos(count: number): Promise<string[]> {
    const rows = await db
      .insert(videosTable)
      .values(
        Array.from({ length: count }, () => ({
          learningLanguage: "en",
          cefrLevel: "A1" as const,
          muxAssetId: `test-mux-asset-${randomUUID()}`,
          topic: "travel" as const,
          durationMs: 1000,
        })),
      )
      .returning({ id: videosTable.id });
    return rows.map((row) => row.id);
  }

  async function grantedCount(userId: string): Promise<number> {
    return (await db.select().from(freeVideoGrantsTable).where(eq(freeVideoGrantsTable.userId, userId))).length;
  }

  it("ilk 10 farklı video açılır, 11. 'exhausted' döner ve deftere yazılmaz", async () => {
    const userId = await createUser();
    const videos = await createVideos(11);
    for (const videoId of videos.slice(0, 10)) {
      expect(await repository.tryGrant(userId, videoId, CAP)).toBe("granted");
    }
    expect(await repository.tryGrant(userId, videos[10] as string, CAP)).toBe("exhausted");
    expect(await grantedCount(userId)).toBe(10);
  });

  it("aynı video tekrar istenirse hak tüketmez (idempotent), hak bitmiş olsa bile 'already-granted'", async () => {
    const userId = await createUser();
    const videos = await createVideos(10);
    for (const videoId of videos) {
      await repository.tryGrant(userId, videoId, CAP);
    }
    expect(await repository.tryGrant(userId, videos[0] as string, CAP)).toBe("already-granted");
    expect(await grantedCount(userId)).toBe(10);
  });

  it("9 hak kullanılmışken iki EŞZAMANLI farklı video isteğinden yalnızca biri açılır", async () => {
    const userId = await createUser();
    const videos = await createVideos(11);
    for (const videoId of videos.slice(0, 9)) {
      await repository.tryGrant(userId, videoId, CAP);
    }

    // İki ayrı pool bağlantısı üzerinden gerçekten paralel transaction'lar (iki cihaz gibi).
    const results = await Promise.all([
      repository.tryGrant(userId, videos[9] as string, CAP),
      repository.tryGrant(userId, videos[10] as string, CAP),
    ]);

    expect([...results].sort()).toEqual(["exhausted", "granted"]);
    expect(await grantedCount(userId)).toBe(10);
  });

  it("aynı videoya eşzamanlı iki istek tek satır üretir (PK + kilit)", async () => {
    const userId = await createUser();
    const [videoId] = await createVideos(1);
    const results = await Promise.all([repository.tryGrant(userId, videoId as string, CAP), repository.tryGrant(userId, videoId as string, CAP)]);
    expect([...results].sort()).toEqual(["already-granted", "granted"]);
    expect(await grantedCount(userId)).toBe(1);
  });

  it("bir kullanıcının hakları başka kullanıcıyı etkilemez", async () => {
    const userA = await createUser();
    const userB = await createUser();
    const videos = await createVideos(10);
    for (const videoId of videos) {
      await repository.tryGrant(userA, videoId, CAP);
    }
    expect(await repository.tryGrant(userB, videos[0] as string, CAP)).toBe("granted");
  });

  it("var olmayan kullanıcı için 'unknown-user' döner, satır yazılmaz", async () => {
    const [videoId] = await createVideos(1);
    expect(await repository.tryGrant(randomUUID(), videoId as string, CAP)).toBe("unknown-user");
    expect(await db.select().from(freeVideoGrantsTable)).toHaveLength(0);
  });

  it("getUsage: toplam tüketimi ve adaylardan açılmış olanları döner", async () => {
    const userId = await createUser();
    const videos = await createVideos(4);
    await repository.tryGrant(userId, videos[0] as string, CAP);
    await repository.tryGrant(userId, videos[1] as string, CAP);

    const usage = await repository.getUsage(userId, [videos[1] as string, videos[2] as string]);
    expect(usage.consumed).toBe(2);
    expect([...usage.grantedVideoIds]).toEqual([videos[1]]);
    expect((await repository.getUsage(userId, [])).grantedVideoIds.size).toBe(0);
  });
});
