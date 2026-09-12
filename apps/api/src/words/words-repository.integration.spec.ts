import { eq } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import type { Pool } from "pg";
import { usersTable } from "../users/users.schema";
import { createTestDatabaseConnection, truncateTestTables } from "../videos/test-database";
import { videoTranscriptSegmentsTable } from "../videos/transcript-segments.schema";
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

  let nextMuxAssetId = 1;
  // Chunk 12: videos.mux_asset_id artık UNIQUE (bkz. videos.schema.ts) — bu
  // testte createVideo() birden fazla kez çağrıldığı için sabit bir literal
  // artık çakışır, her çağrı kendi benzersiz id'sini üretmeli.
  async function createVideo(): Promise<string> {
    const [video] = await db
      .insert(videosTable)
      .values({ learningLanguage: "en", cefrLevel: "A1", muxAssetId: `mock-mux-asset-${nextMuxAssetId++}`, topic: "travel", durationMs: 1000 })
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

  // Chunk 16 — video_transcript_segments satırı oluşturmak için minimal helper.
  // englishExplanation/turkishExplanation testin amacıyla ilgisiz, sadece
  // NOT NULL kolonlar oldukları için dolduruluyor. ordinal video başına unique
  // olduğundan (bkz. transcript-segments.schema.ts) her video kendi sayacını tutar.
  const nextOrdinalByVideo = new Map<string, number>();
  async function createSegment(videoId: string, text = "This is a test sentence."): Promise<string> {
    const ordinal = (nextOrdinalByVideo.get(videoId) ?? 0) + 1;
    nextOrdinalByVideo.set(videoId, ordinal);
    const [segment] = await db
      .insert(videoTranscriptSegmentsTable)
      .values({
        videoId,
        ordinal,
        startMs: 0,
        endMs: 1000,
        text,
        englishExplanation: "test explanation",
        turkishExplanation: "test açıklama",
      })
      .returning();
    if (!segment) throw new Error("Beklenen transcript segment insert edilemedi");
    return segment.id;
  }

  describe("isSegmentConsistentWithWord", () => {
    it("segment'in video'su kelimeyi video_words'te barındırıyorsa true döner", async () => {
      const video = await createVideo();
      const wordId = await createWord("journey");
      const segmentId = await createSegment(video);
      await db.insert(videoWordsTable).values({ videoId: video, wordId });

      const consistent = await repository.isSegmentConsistentWithWord(segmentId, wordId);
      expect(consistent).toBe(true);
    });

    it("segment'in video'su kelimeyi video_words'te barındırmıyorsa false döner", async () => {
      const videoX = await createVideo();
      const videoY = await createVideo();
      const wordId = await createWord("journey");
      const segmentOnVideoX = await createSegment(videoX);
      // wordId sadece videoY'nin sözlüğünde — videoX'in segmenti için tutarsız.
      await db.insert(videoWordsTable).values({ videoId: videoY, wordId });

      const consistent = await repository.isSegmentConsistentWithWord(segmentOnVideoX, wordId);
      expect(consistent).toBe(false);
    });

    it("var olmayan bir segmentId için false döner", async () => {
      const video = await createVideo();
      const wordId = await createWord("journey");
      await db.insert(videoWordsTable).values({ videoId: video, wordId });

      const consistent = await repository.isSegmentConsistentWithWord("00000000-0000-0000-0000-000000000000", wordId);
      expect(consistent).toBe(false);
    });
  });

  describe("saveWord sourceSegmentId persistence", () => {
    it("sourceSegmentId verildiğinde gerçekten kalıcı hale gelir", async () => {
      const userId = await createUser();
      const video = await createVideo();
      const wordId = await createWord("journey");
      const segmentId = await createSegment(video);
      await db.insert(videoWordsTable).values({ videoId: video, wordId });

      await repository.saveWord(userId, wordId, segmentId);

      const [row] = await db.select().from(userSavedWordsTable).where(eq(userSavedWordsTable.wordId, wordId));
      expect(row?.sourceSegmentId).toBe(segmentId);
    });

    it("sourceSegmentId verilmediğinde null olarak kalır (panel-chip save senaryosu)", async () => {
      const userId = await createUser();
      const wordId = await createWord("journey");

      await repository.saveWord(userId, wordId);

      const [row] = await db.select().from(userSavedWordsTable).where(eq(userSavedWordsTable.wordId, wordId));
      expect(row?.sourceSegmentId).toBeNull();
    });
  });

  describe("findSavedWordsForUser", () => {
    it("sourceSegmentId verilmişse sourceSentence gerçek segment içeriğini döner", async () => {
      const userId = await createUser();
      const video = await createVideo();
      const wordId = await createWord("journey", "a long trip");
      const segmentId = await createSegment(video, "We went on a long journey together.");
      await db.insert(videoWordsTable).values({ videoId: video, wordId });

      await repository.saveWord(userId, wordId, segmentId);

      const rows = await repository.findSavedWordsForUser(userId);
      expect(rows).toHaveLength(1);
      expect(rows[0]?.word.lemma).toBe("journey");
      expect(rows[0]?.sourceSentence).toBe("We went on a long journey together.");
    });

    it("sourceSegmentId verilmemişse sourceSentence null döner", async () => {
      const userId = await createUser();
      const wordId = await createWord("journey");

      await repository.saveWord(userId, wordId);

      const rows = await repository.findSavedWordsForUser(userId);
      expect(rows).toHaveLength(1);
      expect(rows[0]?.sourceSentence).toBeNull();
    });

    it("referans verilen segment silinince kayıtlı kelime hayatta kalır, context null'a düşer (ON DELETE SET NULL)", async () => {
      const userId = await createUser();
      const video = await createVideo();
      const wordId = await createWord("journey");
      const segmentId = await createSegment(video, "We went on a long journey together.");
      await db.insert(videoWordsTable).values({ videoId: video, wordId });
      await repository.saveWord(userId, wordId, segmentId);

      await db.delete(videoTranscriptSegmentsTable).where(eq(videoTranscriptSegmentsTable.id, segmentId));

      const rows = await repository.findSavedWordsForUser(userId);
      expect(rows).toHaveLength(1);
      expect(rows[0]?.word.lemma).toBe("journey");
      expect(rows[0]?.sourceSentence).toBeNull();
    });

    it("savedAt descending sırada döner (en yeni ilk)", async () => {
      const userId = await createUser();
      const firstWordId = await createWord("apple");
      await repository.saveWord(userId, firstWordId);
      // savedAt farklılaşsın diye ölçülebilir bir gecikme yerine ikinci kaydı
      // ayrı bir insert olarak, defaultNow() sırası deterministik kalacak şekilde ekliyoruz.
      const secondWordId = await createWord("banana");
      await repository.saveWord(userId, secondWordId);

      const rows = await repository.findSavedWordsForUser(userId);
      expect(rows.map((r) => r.word.lemma)).toEqual(["banana", "apple"]);
    });
  });

  describe("getSavedWordCounts", () => {
    it("total tüm zamanların sayısını, sinceCount sadece since'den sonrakini döner", async () => {
      const userId = await createUser();
      const oldWordId = await createWord("apple");
      const recentWordId = await createWord("banana");

      // oldWordId'yi geçmişte kaydedilmiş gibi simüle etmek için doğrudan insert
      // kullanıyoruz (repository.saveWord defaultNow() kullanıyor, geçmiş bir
      // tarih enjekte edemiyoruz) — bu testin ihtiyacı için meşru bir istisna.
      await db.insert(userSavedWordsTable).values({
        userId,
        wordId: oldWordId,
        savedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      });
      await repository.saveWord(userId, recentWordId);

      const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const counts = await repository.getSavedWordCounts(userId, since);

      expect(counts.total).toBe(2);
      expect(counts.sinceCount).toBe(1);
    });

    it("hiç kayıtlı kelime yoksa ikisi de 0 döner", async () => {
      const userId = await createUser();
      const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

      const counts = await repository.getSavedWordCounts(userId, since);

      expect(counts.total).toBe(0);
      expect(counts.sinceCount).toBe(0);
    });
  });
});
