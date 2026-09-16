import { eq } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import type { Pool } from "pg";
import { usersTable } from "../users/users.schema";
import { createTestDatabaseConnection, truncateTestTables } from "../videos/test-database";
import { WordReviewEventsRepository } from "./word-review-events-repository";
import { wordReviewEventsTable } from "./word-review-events.schema";
import { wordsTable } from "./words.schema";

describe("WordReviewEventsRepository (integration, gerçek Postgres)", () => {
  let db: NodePgDatabase;
  let pool: Pool;
  let repository: WordReviewEventsRepository;

  beforeAll(() => {
    const connection = createTestDatabaseConnection();
    db = connection.db;
    pool = connection.pool;
    repository = new WordReviewEventsRepository(db);
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

  async function createWord(lemma: string): Promise<string> {
    const [word] = await db.insert(wordsTable).values({ language: "en", lemma, gloss: "test gloss" }).returning();
    if (!word) throw new Error("Beklenen kelime insert edilemedi");
    return word.id;
  }

  describe("record + findEventsForUser", () => {
    it("record edilen event gerçekten kalıcı hale gelir ve findEventsForUser ile geri okunur", async () => {
      const userId = await createUser();
      const wordId = await createWord("journey");

      await repository.record({ userId, wordId, isCorrect: true });

      const eventsByWordId = await repository.findEventsForUser(userId);
      expect(eventsByWordId.get(wordId)).toHaveLength(1);
      expect(eventsByWordId.get(wordId)?.[0]?.isCorrect).toBe(true);
    });

    it("aynı kelime için birden fazla event birikir, wordId'ye göre GRUPLANIR (N+1 yok, tek batch)", async () => {
      const userId = await createUser();
      const journeyId = await createWord("journey");
      const habitId = await createWord("habit");

      await repository.record({ userId, wordId: journeyId, isCorrect: false });
      await repository.record({ userId, wordId: journeyId, isCorrect: true });
      await repository.record({ userId, wordId: habitId, isCorrect: true });

      const eventsByWordId = await repository.findEventsForUser(userId);
      expect(eventsByWordId.get(journeyId)).toHaveLength(2);
      expect(eventsByWordId.get(habitId)).toHaveLength(1);
    });

    it("SADECE verilen userId'nin event'lerini döner, başka kullanıcının event'i karışmaz", async () => {
      const userA = await createUser();
      const userB = await createUser();
      const wordId = await createWord("journey");

      await repository.record({ userId: userA, wordId, isCorrect: true });
      await repository.record({ userId: userB, wordId, isCorrect: false });

      const eventsForA = await repository.findEventsForUser(userA);
      expect(eventsForA.get(wordId)).toHaveLength(1);
      expect(eventsForA.get(wordId)?.[0]?.isCorrect).toBe(true);
    });

    it("hiç event yoksa boş Map döner", async () => {
      const userId = await createUser();

      const eventsByWordId = await repository.findEventsForUser(userId);
      expect(eventsByWordId.size).toBe(0);
    });

    it("kelime silinince word_review_events CASCADE ile silinir", async () => {
      const userId = await createUser();
      const wordId = await createWord("journey");
      await repository.record({ userId, wordId, isCorrect: true });

      await db.delete(wordsTable).where(eq(wordsTable.id, wordId));

      const eventsByWordId = await repository.findEventsForUser(userId);
      expect(eventsByWordId.has(wordId)).toBe(false);
    });
  });

  describe("getReviewCounts", () => {
    it("reviewed/correct: DISTINCT kelime sayısı, event sayısı DEĞİL", async () => {
      const userId = await createUser();
      const wordId = await createWord("journey");
      // Aynı kelime için 3 event, ama distinct kelime sayısı 1 olmalı.
      await repository.record({ userId, wordId, isCorrect: false });
      await repository.record({ userId, wordId, isCorrect: false });
      await repository.record({ userId, wordId, isCorrect: true });

      const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const counts = await repository.getReviewCounts(userId, since);

      expect(counts.reviewed).toBe(1);
      expect(counts.correct).toBe(1);
    });

    it("since penceresi doğru filtreler: eski event'ler reviewedSince/correctSince'e dahil olmaz", async () => {
      const userId = await createUser();
      const oldWordId = await createWord("apple");
      const recentWordId = await createWord("banana");

      // Eski event'i manuel insert ediyoruz (record() defaultNow() kullanıyor,
      // geçmiş bir tarih enjekte edemiyoruz) — bu testin meşru istisnası.
      await db.insert(wordReviewEventsTable).values({
        userId,
        wordId: oldWordId,
        isCorrect: true,
        reviewedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      });
      await repository.record({ userId, wordId: recentWordId, isCorrect: true });

      const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const counts = await repository.getReviewCounts(userId, since);

      expect(counts.reviewed).toBe(2);
      expect(counts.reviewedSince).toBe(1);
      expect(counts.correct).toBe(2);
      expect(counts.correctSince).toBe(1);
    });

    it("hiç event yoksa hepsi 0 döner", async () => {
      const userId = await createUser();
      const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

      const counts = await repository.getReviewCounts(userId, since);

      expect(counts).toEqual({ reviewed: 0, reviewedSince: 0, correct: 0, correctSince: 0 });
    });
  });
});
