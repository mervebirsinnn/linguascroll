import { eq } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import type { Pool } from "pg";
import { usersTable } from "../users/users.schema";
import { createTestDatabaseConnection, truncateTestTables } from "../videos/test-database";
import { videosTable } from "../videos/videos.schema";
import { userSavedWordsTable } from "./user-saved-words.schema";
import { videoWordsTable } from "./video-words.schema";
import { WordsRepository } from "./words-repository";
import { wordsTable } from "./words.schema";

describe("WordsRepository (integration, gerçek Postgres)", () => {
  let db: NodePgDatabase;
  let pool: Pool;
  let repository: WordsRepository;

  beforeAll(() => {
    const connection = createTestDatabaseConnection();
    db = connection.db;
    pool = connection.pool;
    repository = new WordsRepository(db);
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
      .values({ learningLanguage: "en", cefrLevel: "A1", muxAssetId: "mock-mux-asset-1", topic: "travel", durationMs: 1000 })
      .returning();
    if (!video) throw new Error("Beklenen video insert edilemedi");
    return video.id;
  }

  async function createWord(lemma: string, gloss = "test gloss"): Promise<string> {
    const [word] = await db.insert(wordsTable).values({ language: "en", lemma, gloss }).returning();
    if (!word) throw new Error("Beklenen kelime insert edilemedi");
    return word.id;
  }

  describe("findVocabularyForVideos", () => {
    it("birden fazla video için doğru gruplama yapar, saved SADECE verilen userId için doğru", async () => {
      const userA = await createUser();
      const userB = await createUser();
      const videoX = await createVideo();
      const videoY = await createVideo();
      const journeyId = await createWord("journey");
      const habitId = await createWord("habit");

      await db.insert(videoWordsTable).values([
        { videoId: videoX, wordId: journeyId },
        { videoId: videoY, wordId: habitId },
      ]);
      await db.insert(userSavedWordsTable).values({ userId: userA, wordId: journeyId });

      const rowsForA = await repository.findVocabularyForVideos([videoX, videoY], userA);
      const rowsForB = await repository.findVocabularyForVideos([videoX, videoY], userB);

      const journeyForA = rowsForA.find((r) => r.word.lemma === "journey");
      const journeyForB = rowsForB.find((r) => r.word.lemma === "journey");
      const habitForA = rowsForA.find((r) => r.word.lemma === "habit");

      expect(journeyForA?.videoId).toBe(videoX);
      expect(journeyForA?.saved).toBe(true);
      expect(journeyForB?.saved).toBe(false);
      expect(habitForA?.videoId).toBe(videoY);
      expect(habitForA?.saved).toBe(false);
    });

    it("hiç kelimesi olmayan bir video için sonuçta hiç satır dönmez", async () => {
      const userId = await createUser();
      const video = await createVideo();

      const rows = await repository.findVocabularyForVideos([video], userId);
      expect(rows).toEqual([]);
    });

    it("kelime sırası deterministic: lemma alfabetik", async () => {
      const userId = await createUser();
      const video = await createVideo();
      const zebraId = await createWord("zebra");
      const appleId = await createWord("apple");
      await db.insert(videoWordsTable).values([
        { videoId: video, wordId: zebraId },
        { videoId: video, wordId: appleId },
      ]);

      const rows = await repository.findVocabularyForVideos([video], userId);
      expect(rows.map((r) => r.word.lemma)).toEqual(["apple", "zebra"]);
    });
  });

  describe("saveWord / unsaveWord idempotency", () => {
    it("saveWord iki kez çağrılınca tek satır kalır (ON CONFLICT DO NOTHING)", async () => {
      const userId = await createUser();
      const wordId = await createWord("journey");

      await repository.saveWord(userId, wordId);
      await expect(repository.saveWord(userId, wordId)).resolves.not.toThrow();

      const rows = await db.select().from(userSavedWordsTable).where(eq(userSavedWordsTable.wordId, wordId));
      expect(rows).toHaveLength(1);
    });

    it("unsaveWord var olmayan bir ilişkide no-op — hata fırlatmaz", async () => {
      const userId = await createUser();
      const wordId = await createWord("journey");

      await expect(repository.unsaveWord(userId, wordId)).resolves.not.toThrow();
    });

    it("saveWord sonrası unsaveWord ilgili satırı gerçekten siler", async () => {
      const userId = await createUser();
      const wordId = await createWord("journey");

      await repository.saveWord(userId, wordId);
      await repository.unsaveWord(userId, wordId);

      const rows = await db.select().from(userSavedWordsTable).where(eq(userSavedWordsTable.wordId, wordId));
      expect(rows).toHaveLength(0);
    });
  });

  describe("composite PK / FK cascade", () => {
    it("video_words duplicate (video_id, word_id) insert'i composite PK ihlaliyle reddedilir", async () => {
      const video = await createVideo();
      const wordId = await createWord("journey");
      await db.insert(videoWordsTable).values({ videoId: video, wordId });

      await expect(db.insert(videoWordsTable).values({ videoId: video, wordId })).rejects.toThrow();
    });

    it("kullanıcı silinince user_saved_words CASCADE ile silinir", async () => {
      const userId = await createUser();
      const wordId = await createWord("journey");
      await repository.saveWord(userId, wordId);

      await db.delete(usersTable).where(eq(usersTable.id, userId));

      const rows = await db.select().from(userSavedWordsTable).where(eq(userSavedWordsTable.wordId, wordId));
      expect(rows).toHaveLength(0);
    });

    it("kelime silinince hem video_words hem user_saved_words CASCADE ile silinir", async () => {
      const userId = await createUser();
      const video = await createVideo();
      const wordId = await createWord("journey");
      await db.insert(videoWordsTable).values({ videoId: video, wordId });
      await repository.saveWord(userId, wordId);

      await db.delete(wordsTable).where(eq(wordsTable.id, wordId));

      const videoWordRows = await db.select().from(videoWordsTable).where(eq(videoWordsTable.wordId, wordId));
      const savedWordRows = await db.select().from(userSavedWordsTable).where(eq(userSavedWordsTable.wordId, wordId));
      expect(videoWordRows).toHaveLength(0);
      expect(savedWordRows).toHaveLength(0);
    });
  });
});
