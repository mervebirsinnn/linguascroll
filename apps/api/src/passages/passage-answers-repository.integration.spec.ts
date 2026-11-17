import { passageLevelSchema } from "@linguascroll/shared-types";
import { eq } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import type { Pool } from "pg";
import { usersTable } from "../users/users.schema";
import { createTestDatabaseConnection, truncateTestTables } from "../videos/test-database";
import { wordsTable } from "../words/words.schema";
import { PassageAnswersRepository } from "./passage-answers-repository";
import { passageAnswersTable } from "./passage-answers.schema";
import {
  passageOptionsTable,
  passageQuestionsTable,
  passagesTable,
  passageWordSpansTable,
  passageWordsTable,
} from "./passages.schema";

/** Drizzle sorgu hatasını sarmalar; asıl Postgres hata kodu `cause` zincirinde. */
async function pgErrorCode(promise: Promise<unknown>): Promise<string | undefined> {
  try {
    await promise;
  } catch (error) {
    let current: unknown = error;
    while (current && typeof current === "object") {
      const code = (current as { code?: unknown }).code;
      if (typeof code === "string" && /^[0-9A-Z]{5}$/.test(code)) return code;
      current = (current as { cause?: unknown }).cause;
    }
    throw error;
  }
  return undefined;
}

const UNIQUE_VIOLATION = "23505";
const FK_VIOLATION = "23503";
const CHECK_VIOLATION = "23514";

describe("PassageAnswersRepository ve passages şema invariant'ları (integration, gerçek Postgres)", () => {
  let db: NodePgDatabase;
  let pool: Pool;
  let repository: PassageAnswersRepository;

  beforeAll(() => {
    const connection = createTestDatabaseConnection();
    db = connection.db;
    pool = connection.pool;
    repository = new PassageAnswersRepository(db);
  });

  beforeEach(async () => {
    await truncateTestTables(db);
  });

  afterAll(async () => {
    await pool.end();
  });

  async function createUser(): Promise<string> {
    const [user] = await db.insert(usersTable).values({}).returning();
    if (!user) throw new Error("Kullanıcı eklenemedi");
    return user.id;
  }

  async function createPassage(slug = "p1", level = "B2") {
    const [passage] = await db
      .insert(passagesTable)
      .values({ slug, level, title: "T", topic: "Konu", paragraphs: ["The cat sat on the mat."], sortOrder: 1, contentHash: "h" })
      .returning();
    if (!passage) throw new Error("Passage eklenemedi");
    return passage;
  }

  /** 1 soru, 4 şık; `correctPosition` şıkkı doğru. */
  async function createQuestion(passageId: string, position = 1, correctPosition = 1) {
    const [question] = await db
      .insert(passageQuestionsTable)
      .values({ passageId, key: `q${position}`, position, type: "main-idea", prompt: "What is the main idea?" })
      .returning();
    if (!question) throw new Error("Soru eklenemedi");
    const options = await db
      .insert(passageOptionsTable)
      .values([0, 1, 2, 3].map((index) => ({
        questionId: question.id,
        key: `o${index}`,
        position: index,
        text: `Option ${index}`,
        isCorrect: index === correctPosition,
        trapType: index === correctPosition ? null : "copy",
        explanation: `Gerekçe ${index}`,
      })))
      .returning();
    return { question, options };
  }

  describe("record", () => {
    it("is_correct anlık görüntüsünü şıktan okur: doğru şık → true, yanlış şık → false", async () => {
      const userId = await createUser();
      const passage = await createPassage();
      const { question, options } = await createQuestion(passage.id, 1, 2);
      const correct = options.find((option) => option.isCorrect)!;

      const first = await repository.record({ userId, questionId: question.id, optionId: correct.id });
      expect(first).toMatchObject({ status: "recorded", answer: { optionId: correct.id, isCorrect: true } });

      const otherQuestion = await createQuestion(passage.id, 2, 0);
      const wrongOption = otherQuestion.options.find((option) => !option.isCorrect)!;
      const second = await repository.record({ userId, questionId: otherQuestion.question.id, optionId: wrongOption.id });
      expect(second).toMatchObject({ status: "recorded", answer: { isCorrect: false } });
    });

    it("aynı isteğin tekrarı (ağ hatası) yeni cevap sayılmaz: aynı satır döner, tek satır kalır", async () => {
      const userId = await createUser();
      const passage = await createPassage();
      const { question, options } = await createQuestion(passage.id);

      const first = await repository.record({ userId, questionId: question.id, optionId: options[0]!.id });
      const replay = await repository.record({ userId, questionId: question.id, optionId: options[0]!.id });

      expect(first.status).toBe("recorded");
      expect(replay.status).toBe("existing");
      expect(replay).toMatchObject({ answer: { optionId: options[0]!.id } });
      if (first.status !== "invalid-option" && replay.status !== "invalid-option") {
        expect(replay.answer.answeredAt).toEqual(first.answer.answeredAt);
      }
      expect(await db.select().from(passageAnswersTable)).toHaveLength(1);
    });

    it("farklı şıkla tekrar gönderim hata değildir: İLK cevap döner ve kalır", async () => {
      const userId = await createUser();
      const passage = await createPassage();
      const { question, options } = await createQuestion(passage.id, 1, 1);

      await repository.record({ userId, questionId: question.id, optionId: options[0]!.id });
      const second = await repository.record({ userId, questionId: question.id, optionId: options[1]!.id });

      expect(second).toMatchObject({ status: "existing", answer: { optionId: options[0]!.id, isCorrect: false } });
      const rows = await db.select().from(passageAnswersTable);
      expect(rows).toHaveLength(1);
      expect(rows[0]!.optionId).toBe(options[0]!.id);
    });

    it("eşzamanlı iki gönderim (farklı şıklar) tek satırla sonuçlanır; ikisi de AYNI saklanan cevabı görür", async () => {
      const userId = await createUser();
      const passage = await createPassage();
      const { question, options } = await createQuestion(passage.id);

      const [a, b] = await Promise.all([
        repository.record({ userId, questionId: question.id, optionId: options[0]!.id }),
        repository.record({ userId, questionId: question.id, optionId: options[1]!.id }),
      ]);

      const statuses = [a.status, b.status].sort();
      expect(statuses).toEqual(["existing", "recorded"]);
      expect(await db.select().from(passageAnswersTable)).toHaveLength(1);
      if (a.status === "invalid-option" || b.status === "invalid-option") throw new Error("beklenmeyen invalid-option");
      expect(a.answer.optionId).toBe(b.answer.optionId);
    });

    it("başka bir sorunun şıkkı 'invalid-option' döner ve satır yazılmaz", async () => {
      const userId = await createUser();
      const passage = await createPassage();
      const first = await createQuestion(passage.id, 1);
      const second = await createQuestion(passage.id, 2);

      const result = await repository.record({ userId, questionId: first.question.id, optionId: second.options[0]!.id });

      expect(result).toEqual({ status: "invalid-option" });
      expect(await db.select().from(passageAnswersTable)).toHaveLength(0);
    });

    it("iki farklı kullanıcı aynı soruyu bağımsız cevaplar", async () => {
      const userA = await createUser();
      const userB = await createUser();
      const passage = await createPassage();
      const { question, options } = await createQuestion(passage.id);

      const a = await repository.record({ userId: userA, questionId: question.id, optionId: options[0]!.id });
      const b = await repository.record({ userId: userB, questionId: question.id, optionId: options[1]!.id });

      expect(a.status).toBe("recorded");
      expect(b.status).toBe("recorded");
      expect(await db.select().from(passageAnswersTable)).toHaveLength(2);
    });
  });

  describe("DB invariant'ları", () => {
    it("bileşik FK: (question_id, option_id) başka bir sorunun şıkkıyla eşleşirse reddedilir", async () => {
      const userId = await createUser();
      const passage = await createPassage();
      const first = await createQuestion(passage.id, 1);
      const second = await createQuestion(passage.id, 2);

      const code = await pgErrorCode(
        db.insert(passageAnswersTable).values({ userId, questionId: first.question.id, optionId: second.options[0]!.id, isCorrect: false }),
      );
      expect(code).toBe(FK_VIOLATION);
    });

    it("UNIQUE(user_id, question_id): aynı kullanıcı+soru için ikinci satır doğrudan insert ile de reddedilir", async () => {
      const userId = await createUser();
      const passage = await createPassage();
      const { question, options } = await createQuestion(passage.id);
      await db.insert(passageAnswersTable).values({ userId, questionId: question.id, optionId: options[0]!.id, isCorrect: false });

      const code = await pgErrorCode(
        db.insert(passageAnswersTable).values({ userId, questionId: question.id, optionId: options[1]!.id, isCorrect: true }),
      );
      expect(code).toBe(UNIQUE_VIOLATION);
    });

    it("bir soruda en fazla bir doğru şık (partial unique index)", async () => {
      const passage = await createPassage();
      const { question } = await createQuestion(passage.id, 1, 1);

      const code = await pgErrorCode(
        db.insert(passageOptionsTable).values({ questionId: question.id, key: "extra", position: 9, text: "x", isCorrect: true, explanation: "e" }),
      );
      expect(code).toBe(UNIQUE_VIOLATION);
    });

    it.each(passageLevelSchema.options)("%s seviyesi DB check'inden geçer", async (level) => {
      await expect(createPassage(`ok-${level}`, level)).resolves.toMatchObject({ level });
    });

    it.each(["A1", "A2", "b1", ""])("seviye %p DB check'inde reddedilir", async (level) => {
      expect(await pgErrorCode(createPassage(`bad-${level}`, level))).toBe(CHECK_VIOLATION);
    });

    it("span: passage_words'te olmayan kelime bileşik FK ile reddedilir; ters aralık check ile reddedilir", async () => {
      const passage = await createPassage();
      const [word] = await db.insert(wordsTable).values({ language: "en", lemma: "cat", gloss: "kedi" }).returning();

      const noPassageWord = await pgErrorCode(
        db.insert(passageWordSpansTable).values({ passageId: passage.id, paragraphIndex: 0, start: 4, end: 7, wordId: word!.id, surface: "cat" }),
      );
      expect(noPassageWord).toBe(FK_VIOLATION);

      await db.insert(passageWordsTable).values({ passageId: passage.id, wordId: word!.id, contextSentence: "The cat sat on the mat." });
      const reversed = await pgErrorCode(
        db.insert(passageWordSpansTable).values({ passageId: passage.id, paragraphIndex: 0, start: 7, end: 4, wordId: word!.id, surface: "cat" }),
      );
      expect(reversed).toBe(CHECK_VIOLATION);

      await db.insert(passageWordSpansTable).values({ passageId: passage.id, paragraphIndex: 0, start: 4, end: 7, wordId: word!.id, surface: "cat" });
      const sameStart = await pgErrorCode(
        db.insert(passageWordSpansTable).values({ passageId: passage.id, paragraphIndex: 0, start: 4, end: 8, wordId: word!.id, surface: "cats" }),
      );
      expect(sameStart).toBe(UNIQUE_VIOLATION);
    });

    it("kullanıcı silinince cevapları CASCADE ile silinir", async () => {
      const userId = await createUser();
      const passage = await createPassage();
      const { question, options } = await createQuestion(passage.id);
      await repository.record({ userId, questionId: question.id, optionId: options[0]!.id });

      await db.delete(usersTable).where(eq(usersTable.id, userId));

      expect(await db.select().from(passageAnswersTable)).toHaveLength(0);
      expect(await db.select().from(passageOptionsTable)).toHaveLength(4);
    });

    it("cevaplanmış şık silinemez; cevaplanmış metin silinemez (emeklilik kuralı)", async () => {
      const userId = await createUser();
      const passage = await createPassage();
      const { question, options } = await createQuestion(passage.id);
      await repository.record({ userId, questionId: question.id, optionId: options[0]!.id });

      expect(await pgErrorCode(db.delete(passageOptionsTable).where(eq(passageOptionsTable.id, options[0]!.id)))).toBe(FK_VIOLATION);
      expect(await pgErrorCode(db.delete(passagesTable).where(eq(passagesTable.id, passage.id)))).toBe(FK_VIOLATION);
    });

    it("cevapsız metin silinince soruları, şıkları, kelimeleri ve span'ları CASCADE ile gider", async () => {
      const passage = await createPassage();
      await createQuestion(passage.id);
      const [word] = await db.insert(wordsTable).values({ language: "en", lemma: "cat", gloss: "kedi" }).returning();
      await db.insert(passageWordsTable).values({ passageId: passage.id, wordId: word!.id, contextSentence: "s" });
      await db.insert(passageWordSpansTable).values({ passageId: passage.id, paragraphIndex: 0, start: 4, end: 7, wordId: word!.id, surface: "cat" });

      await db.delete(passagesTable).where(eq(passagesTable.id, passage.id));

      expect(await db.select().from(passageQuestionsTable)).toHaveLength(0);
      expect(await db.select().from(passageOptionsTable)).toHaveLength(0);
      expect(await db.select().from(passageWordsTable)).toHaveLength(0);
      expect(await db.select().from(passageWordSpansTable)).toHaveLength(0);
      expect(await db.select().from(wordsTable)).toHaveLength(1);
    });
  });
});
