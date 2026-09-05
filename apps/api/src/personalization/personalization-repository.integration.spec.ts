import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import type { Pool } from "pg";
import { usersTable } from "../users/users.schema";
import { createTestDatabaseConnection, truncateTestTables } from "../videos/test-database";
import { videoWatchEventsTable } from "../videos/video-watch-events.schema";
import { videosTable } from "../videos/videos.schema";
import { PersonalizationRepository } from "./personalization-repository";

describe("PersonalizationRepository (integration, gerçek Postgres)", () => {
  let db: NodePgDatabase;
  let pool: Pool;
  let repository: PersonalizationRepository;

  beforeAll(() => {
    const connection = createTestDatabaseConnection();
    db = connection.db;
    pool = connection.pool;
    repository = new PersonalizationRepository(db);
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

  async function createVideo(topic: string, durationMs: number): Promise<string> {
    const [video] = await db
      .insert(videosTable)
      .values({ learningLanguage: "en", cefrLevel: "A1", muxAssetId: "test-mux-asset", topic, durationMs })
      .returning();
    if (!video) throw new Error("Beklenen video insert edilemedi");
    return video.id;
  }

  it("kullanıcının watch-event'lerini topic bazında gerçek bir Postgres aggregate ile toplar", async () => {
    const userId = await createUser();
    const travelVideoId = await createVideo("travel", 10000);
    const careerVideoId = await createVideo("career", 10000);

    await db.insert(videoWatchEventsTable).values([
      { userId, videoId: travelVideoId, watchedMs: 10000 }, // ratio 1.0
      { userId, videoId: careerVideoId, watchedMs: 2000 }, // ratio 0.2
    ]);

    const affinity = await repository.getTopicAffinity(userId);

    expect(affinity.get("travel")).toBeCloseTo(1.0);
    expect(affinity.get("career")).toBeCloseTo(0.2);
  });

  it("ratio üst sınırda clamp edilir: watchedMs > durationMs, skoru 1.0'ı geçirmez", async () => {
    const userId = await createUser();
    const videoId = await createVideo("travel", 1000);

    // Loop artefaktı gibi durationMs'i aşan bir watchedMs — clamp olmasaydı 5.0 katkı verirdi.
    await db.insert(videoWatchEventsTable).values({ userId, videoId, watchedMs: 5000 });

    const affinity = await repository.getTopicAffinity(userId);

    expect(affinity.get("travel")).toBeCloseTo(1.0);
  });

  it("ratio alt sınırda 0: watchedMs = 0 olan bir event skora negatif katkı vermez", async () => {
    const userId = await createUser();
    const videoId = await createVideo("travel", 1000);

    await db.insert(videoWatchEventsTable).values({ userId, videoId, watchedMs: 0 });

    const affinity = await repository.getTopicAffinity(userId);

    expect(affinity.get("travel")).toBeCloseTo(0);
  });

  it("tekrarlanan exposure'lar SUM ile skoru artırır (AVG değil)", async () => {
    const userId = await createUser();
    const videoId = await createVideo("travel", 1000);

    // İki ayrı exposure, her biri ratio 0.5 — SUM olsaydı 1.0, AVG olsaydı 0.5 olurdu.
    await db.insert(videoWatchEventsTable).values([
      { userId, videoId, watchedMs: 500 },
      { userId, videoId, watchedMs: 500 },
    ]);

    const affinity = await repository.getTopicAffinity(userId);

    expect(affinity.get("travel")).toBeCloseTo(1.0);
  });

  it("hiç izlenmemiş bir topic, sonuç map'inde HİÇ bulunmaz (0 değeriyle değil, tamamen absent)", async () => {
    const userId = await createUser();
    const videoId = await createVideo("travel", 1000);
    await db.insert(videoWatchEventsTable).values({ userId, videoId, watchedMs: 500 });

    const affinity = await repository.getTopicAffinity(userId);

    expect(affinity.has("travel")).toBe(true);
    expect(affinity.has("career")).toBe(false);
  });

  it("watch-history'si olmayan bir kullanıcı için boş map döner", async () => {
    const userId = await createUser();

    const affinity = await repository.getTopicAffinity(userId);

    expect(affinity.size).toBe(0);
  });
});
