import type { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { passageAnswerResultSchema, passagePageSchema, type Passage } from "@linguascroll/shared-types";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import type { Pool } from "pg";
import request from "supertest";
import { AppModule } from "../app.module";
import { createAuthenticatedUser, withTestAuth } from "../auth/test-auth";
import { createTestDatabaseConnection, truncateTestTables } from "../videos/test-database";
import { userSavedWordsTable } from "../words/user-saved-words.schema";
import { passageAnswersTable } from "./passage-answers.schema";
import { encodePassageCursor } from "./passage-cursor";
import { createPassageFixture, EXPLANATION_PREFIX, FIXTURE_GLOSS, FIXTURE_PARAGRAPH } from "./passage-test-fixtures";

/**
 * Okuma pratiği HTTP e2e'si (gerçek Postgres, kapı KAPALI = varsayılan: herkes tam erişimli).
 * Abonelik/kilit matrisi ayrı dosyada (passages-gate.e2e-spec.ts): kapı env'i AppModule import edilmeden önce ayarlanmalı.
 * "Sızmaz" testleri ham HTTP gövdesi üzerinde (Zod parse'ı değil): şema bilinmeyen alanı düşürür, bu yüzden
 * şema doğrulaması sunucunun GÖNDERMEDİĞİNİN kanıtı olamaz.
 */
describe("GET /passages ve POST /passages/questions/:id/answer (e2e, gerçek Postgres, kapı kapalı)", () => {
  let app: INestApplication;
  let db: NodePgDatabase;
  let pool: Pool;

  beforeAll(async () => {
    const moduleRef = await withTestAuth(Test.createTestingModule({ imports: [AppModule] })).compile();
    app = moduleRef.createNestApplication();
    await app.init();
    const connection = createTestDatabaseConnection();
    db = connection.db;
    pool = connection.pool;
  });

  beforeEach(async () => {
    await truncateTestTables(db);
  });

  afterAll(async () => {
    await pool.end();
    await app.close();
  });

  const getPassages = (authorization: string | undefined, query: Record<string, string> = { level: "B2" }) => {
    const call = request(app.getHttpServer()).get("/passages").query(query);
    return authorization ? call.set("Authorization", authorization) : call;
  };
  const answer = (authorization: string | undefined, questionId: string, body: unknown) => {
    const call = request(app.getHttpServer()).post(`/passages/questions/${questionId}/answer`).send(body as object);
    return authorization ? call.set("Authorization", authorization) : call;
  };

  describe("kimlik", () => {
    it("token olmadan GET ve POST 401", async () => {
      await getPassages(undefined).expect(401);
      await answer(undefined, "00000000-0000-4000-8000-000000000001", { optionId: "00000000-0000-4000-8000-000000000002" }).expect(401);
    });
  });

  describe("seviye ve sorgu doğrulaması", () => {
    it.each(["B1", "B2", "C1", "C2"])("%s kabul edilir (boş katalog → boş sayfa)", async (level) => {
      const { authorization } = await createAuthenticatedUser(db);
      const res = await getPassages(authorization, { level }).expect(200);
      expect(res.body).toEqual({ items: [], nextCursor: null });
    });

    it.each(["A1", "A2", "X9", "b2", ""])("seviye %p → 400", async (level) => {
      const { authorization } = await createAuthenticatedUser(db);
      await getPassages(authorization, { level }).expect(400);
    });

    it("seviye eksik → 400", async () => {
      const { authorization } = await createAuthenticatedUser(db);
      await getPassages(authorization, {}).expect(400);
    });
  });

  describe("cursor", () => {
    it("aynı sort_order'lı metinlerde sayfalar arasında atlama veya tekrar olmaz", async () => {
      const { authorization } = await createAuthenticatedUser(db);
      const ids: string[] = [];
      for (let i = 0; i < 7; i += 1) {
        ids.push((await createPassageFixture(db, { slug: `tie-${i}`, sortOrder: 5 })).passageId);
      }

      const seen: string[] = [];
      let cursor: string | null = null;
      let pages = 0;
      do {
        const res: request.Response = await getPassages(authorization, cursor ? { level: "B2", cursor } : { level: "B2" }).expect(200);
        const page = passagePageSchema.parse(res.body);
        seen.push(...page.items.map((item) => item.id));
        cursor = page.nextCursor;
        pages += 1;
      } while (cursor && pages < 10);

      expect(pages).toBe(3);
      expect(seen).toHaveLength(7);
      expect(new Set(seen).size).toBe(7);
      expect([...seen].sort()).toEqual([...ids].sort());
      expect(seen).toEqual([...seen].sort());
    });

    it("sıralama (sort_order, id); seviye yalnız kendi metinlerini döndürür", async () => {
      const { authorization } = await createAuthenticatedUser(db);
      const late = await createPassageFixture(db, { slug: "late", sortOrder: 9 });
      const early = await createPassageFixture(db, { slug: "early", sortOrder: 1 });
      await createPassageFixture(db, { slug: "other-level", level: "C1", sortOrder: 0 });

      const res = await getPassages(authorization).expect(200);
      const ids = passagePageSchema.parse(res.body).items.map((item) => item.id);

      expect(ids).toEqual([early.passageId, late.passageId]);
    });

    it("seviyeyle uyumsuz cursor 400", async () => {
      const { authorization } = await createAuthenticatedUser(db);
      const cursor = encodePassageCursor({ level: "B1", sortOrder: 1, id: "00000000-0000-4000-8000-000000000001" });
      await getPassages(authorization, { level: "B2", cursor }).expect(400);
    });

    it.each(["###", "bm90LWpzb24", Buffer.from(JSON.stringify({ v: 1 })).toString("base64url")])("bozuk cursor %s → 400", async (cursor) => {
      const { authorization } = await createAuthenticatedUser(db);
      await getPassages(authorization, { level: "B2", cursor }).expect(400);
    });

    it("emekli metin listelenmez", async () => {
      const { authorization } = await createAuthenticatedUser(db);
      await createPassageFixture(db, { slug: "retired", retired: true });
      const active = await createPassageFixture(db, { slug: "active", sortOrder: 2 });

      const res = await getPassages(authorization).expect(200);

      expect(passagePageSchema.parse(res.body).items.map((item) => item.id)).toEqual([active.passageId]);
    });
  });

  describe("cevap anahtarı sızıntısı (ham HTTP gövdesi)", () => {
    it("cevaplanmamış soruda doğru şık, doğruluk bayrağı, tuzak türü ve açıklama GÖNDERİLMEZ; result null", async () => {
      const { authorization } = await createAuthenticatedUser(db);
      const fixture = await createPassageFixture(db, { slug: "p" });

      const res = await getPassages(authorization).expect(200);
      const raw = JSON.stringify(res.body);

      expect(raw).not.toContain(EXPLANATION_PREFIX);
      expect(raw).not.toContain("isCorrect");
      expect(raw).not.toContain("trapType");
      expect(raw).not.toContain("correctOptionId");
      const passage = res.body.items[0] as { questions: Array<{ result: unknown; options: Array<Record<string, unknown>> }> };
      expect(passage.questions).toHaveLength(4);
      for (const question of passage.questions) {
        expect(question.result).toBeNull();
        for (const option of question.options) {
          expect(Object.keys(option).sort()).toEqual(["id", "text"]);
        }
      }
      expect(fixture.questions).toHaveLength(4);
    });

    it("kelime anlamları açıktır: tekrar eden kelime iki run, gloss ve saved bayrağıyla", async () => {
      const { authorization, userId } = await createAuthenticatedUser(db);
      const fixture = await createPassageFixture(db, { slug: "words" });
      await db.insert(userSavedWordsTable).values({ userId, wordId: fixture.wordId });

      const res = await getPassages(authorization).expect(200);
      const passage = passagePageSchema.parse(res.body).items[0];
      if (!passage || passage.access !== "open") throw new Error("açık metin bekleniyordu");

      const runs = passage.paragraphs[0]!;
      expect(runs.map((run) => run.text).join("")).toBe(FIXTURE_PARAGRAPH);
      const wordRuns = runs.filter((run) => run.word);
      expect(wordRuns).toHaveLength(2);
      expect(wordRuns.every((run) => run.word?.gloss === FIXTURE_GLOSS && run.word.saved && run.word.wordId === fixture.wordId)).toBe(true);
    });
  });

  describe("cevap verme", () => {
    it("doğru ve yanlış cevap sunucuda değerlendirilir; yanıt ortak şemayla uyumlu", async () => {
      const { authorization } = await createAuthenticatedUser(db);
      const fixture = await createPassageFixture(db, { slug: "p" });
      const [q1, q2] = fixture.questions;

      const right = await answer(authorization, q1!.questionId, { optionId: q1!.correctOptionId }).expect(200);
      const wrong = await answer(authorization, q2!.questionId, { optionId: q2!.wrongOptionId }).expect(200);

      expect(passageAnswerResultSchema.parse(right.body)).toMatchObject({ correct: true, selectedOptionId: q1!.correctOptionId, correctOptionId: q1!.correctOptionId });
      expect(passageAnswerResultSchema.parse(wrong.body)).toMatchObject({ correct: false, selectedOptionId: q2!.wrongOptionId, correctOptionId: q2!.correctOptionId });
      expect(right.body.options).toHaveLength(4);
      expect(JSON.stringify(right.body)).toContain(EXPLANATION_PREFIX);
    });

    it("istemci isCorrect gönderse bile yok sayılır (doğruluk sunucuda hesaplanır)", async () => {
      const { authorization } = await createAuthenticatedUser(db);
      const fixture = await createPassageFixture(db, { slug: "p" });
      const q = fixture.questions[0]!;

      const res = await answer(authorization, q.questionId, { optionId: q.wrongOptionId, isCorrect: true }).expect(200);

      expect(res.body.correct).toBe(false);
    });

    it("sonraki GET'te ilk cevap ve açıklamalar geri gelir; başka kullanıcının sonucu SIZMAZ", async () => {
      const a = await createAuthenticatedUser(db);
      const b = await createAuthenticatedUser(db);
      const fixture = await createPassageFixture(db, { slug: "p" });
      const q = fixture.questions[0]!;
      await answer(a.authorization, q.questionId, { optionId: q.wrongOptionId }).expect(200);

      const forA = passagePageSchema.parse((await getPassages(a.authorization).expect(200)).body).items[0] as Extract<Passage, { access: "open" }>;
      const forB = passagePageSchema.parse((await getPassages(b.authorization).expect(200)).body).items[0] as Extract<Passage, { access: "open" }>;

      expect(forA.questions[0]!.result).toMatchObject({ selectedOptionId: q.wrongOptionId, correct: false, correctOptionId: q.correctOptionId });
      expect(forA.questions.slice(1).every((question) => question.result === null)).toBe(true);
      expect(forB.questions.every((question) => question.result === null)).toBe(true);
      expect(JSON.stringify(forB)).not.toContain(EXPLANATION_PREFIX);
    });

    it("aynı veya farklı şıkla tekrar gönderimde İLK cevap döner, tek satır kalır", async () => {
      const { authorization } = await createAuthenticatedUser(db);
      const fixture = await createPassageFixture(db, { slug: "p" });
      const q = fixture.questions[0]!;

      const first = await answer(authorization, q.questionId, { optionId: q.wrongOptionId }).expect(200);
      const same = await answer(authorization, q.questionId, { optionId: q.wrongOptionId }).expect(200);
      const other = await answer(authorization, q.questionId, { optionId: q.correctOptionId }).expect(200);

      expect(same.body).toEqual(first.body);
      expect(other.body).toEqual(first.body);
      expect(other.body.correct).toBe(false);
      expect(await db.select().from(passageAnswersTable)).toHaveLength(1);
    });

    it("eşzamanlı iki gönderim tek kayıt ve tutarlı yanıt üretir", async () => {
      const { authorization } = await createAuthenticatedUser(db);
      const fixture = await createPassageFixture(db, { slug: "p" });
      const q = fixture.questions[0]!;

      const [a, b] = await Promise.all([
        answer(authorization, q.questionId, { optionId: q.correctOptionId }),
        answer(authorization, q.questionId, { optionId: q.wrongOptionId }),
      ]);

      expect(a.status).toBe(200);
      expect(b.status).toBe(200);
      expect(a.body.selectedOptionId).toBe(b.body.selectedOptionId);
      expect(a.body.correct).toBe(b.body.correct);
      expect(await db.select().from(passageAnswersTable)).toHaveLength(1);
    });

    it("başka sorunun şıkkı 400 ve satır yazılmaz", async () => {
      const { authorization } = await createAuthenticatedUser(db);
      const fixture = await createPassageFixture(db, { slug: "p" });

      await answer(authorization, fixture.questions[0]!.questionId, { optionId: fixture.questions[1]!.correctOptionId }).expect(400);

      expect(await db.select().from(passageAnswersTable)).toHaveLength(0);
    });

    it("bilinmeyen soru 404; emekli metnin sorusu 404; bozuk uuid ve gövde 400", async () => {
      const { authorization } = await createAuthenticatedUser(db);
      const retired = await createPassageFixture(db, { slug: "retired", retired: true });

      await answer(authorization, "00000000-0000-4000-8000-0000000000ff", { optionId: "00000000-0000-4000-8000-000000000001" }).expect(404);
      await answer(authorization, retired.questions[0]!.questionId, { optionId: retired.questions[0]!.correctOptionId }).expect(404);
      await answer(authorization, "not-a-uuid", { optionId: "00000000-0000-4000-8000-000000000001" }).expect(400);
      await answer(authorization, retired.questions[0]!.questionId, { optionId: "x" }).expect(400);
      await answer(authorization, retired.questions[0]!.questionId, {}).expect(400);

      expect(await db.select().from(passageAnswersTable)).toHaveLength(0);
    });
  });
});
