import { eq, sql } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import type { Pool } from "pg";
import { usersTable } from "../users/users.schema";
import { createTestDatabaseConnection, truncateTestTables } from "./test-database";
import { VideoWatchEventsRepository } from "./video-watch-events-repository";
import { videoWatchEventsTable } from "./video-watch-events.schema";
import { videosTable } from "./videos.schema";

describe("VideoWatchEventsRepository / video_watch_events FK+index davranışı (integration, gerçek Postgres)", () => {
  let db: NodePgDatabase;
  let pool: Pool;
  let repository: VideoWatchEventsRepository;

  beforeAll(() => {
    const connection = createTestDatabaseConnection();
    db = connection.db;
    pool = connection.pool;
    repository = new VideoWatchEventsRepository(db);
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

  async function createVideo(): Promise<string> {
    const [video] = await db
      .insert(videosTable)
      .values({ learningLanguage: "en", cefrLevel: "A1", muxAssetId: "test-mux-asset", topic: "travel", durationMs: 1000 })
      .returning();
    if (!video) throw new Error("Beklenen video insert edilemedi");
    return video.id;
  }

  it("record(), bir watch-event satırı insert eder", async () => {
    const userId = await createUser();
    const videoId = await createVideo();

    await repository.record({ userId, videoId, watchedMs: 4200 });

    const events = await db.select().from(videoWatchEventsTable).where(eq(videoWatchEventsTable.userId, userId));
    expect(events).toHaveLength(1);
    expect(events[0]?.videoId).toBe(videoId);
    expect(events[0]?.watchedMs).toBe(4200);
  });

  it("bir video'yu, ona ait watch-event varken silmeye çalışmak FK violation ile reddedilir (tarihsel event CASCADE ile kaybolmaz)", async () => {
    const userId = await createUser();
    const videoId = await createVideo();
    await repository.record({ userId, videoId, watchedMs: 1000 });

    await expect(db.delete(videosTable).where(eq(videosTable.id, videoId))).rejects.toThrow();

    // Silme denemesi reddedildiği için event hâlâ yerinde olmalı.
    const events = await db.select().from(videoWatchEventsTable).where(eq(videoWatchEventsTable.videoId, videoId));
    expect(events).toHaveLength(1);
  });

  it("bir user silindiğinde kendi watch-event'leri CASCADE ile silinir", async () => {
    const userId = await createUser();
    const videoId = await createVideo();
    await repository.record({ userId, videoId, watchedMs: 1000 });

    await db.delete(usersTable).where(eq(usersTable.id, userId));

    const events = await db.select().from(videoWatchEventsTable).where(eq(videoWatchEventsTable.userId, userId));
    expect(events).toHaveLength(0);
  });

  it("video_watch_events(user_id) index'i mevcut", async () => {
    const result = await db.execute(
      sql`SELECT indexname FROM pg_indexes WHERE tablename = 'video_watch_events' AND indexname = 'video_watch_events_user_id_idx'`,
    );
    expect(result.rows).toHaveLength(1);
  });
});
