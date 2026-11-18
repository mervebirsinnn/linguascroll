import type { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { passagePageSchema } from "@linguascroll/shared-types";
import { eq } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import type { Pool } from "pg";
import request from "supertest";
import { AppModule } from "../app.module";
import { createAuthenticatedUser, withTestAuth } from "../auth/test-auth";
import { createTestDatabaseConnection, truncateTestTables } from "../videos/test-database";
import { wordsTable } from "../words/words.schema";
import { passageAnswersTable } from "./passage-answers.schema";
import { validPack } from "./passage-pack-fixtures";
import { PassagePublishError, publishPassagePacks } from "./passage-publisher";
import { passageOptionsTable, passageQuestionsTable, passagesTable, passageWordSpansTable, passageWordsTable } from "./passages.schema";

/**
 * Yayıncı, GERÇEK Postgres'e karşı (yalnız test DB): idempotentlik, atomiklik, ret kuralları ve — kabul testi —
 * yayınlanan paketin GET /passages'ta 200 + doğru run'larla dönmesi ("bozuk satır 500 üretir" riskinin kapanışı).
 */
describe("publishPassagePacks (e2e, gerçek Postgres)", () => {
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

  async function counts() {
    const [passages, words, passageWords, spans, questions, options] = await Promise.all([
      db.select().from(passagesTable),
      db.select().from(wordsTable),
      db.select().from(passageWordsTable),
      db.select().from(passageWordSpansTable),
      db.select().from(passageQuestionsTable),
      db.select().from(passageOptionsTable),
    ]);
    return { passages: passages.length, words: words.length, passageWords: passageWords.length, spans: spans.length, questions: questions.length, options: options.length };
  }
  const EMPTY = { passages: 0, words: 0, passageWords: 0, spans: 0, questions: 0, options: 0 };

  it("KABUL: yayınlanan paket GET /passages'ta 200 döner; run'lar doğru, kelime anlamı ve 4 soru/16 şık var, doğru cevap sızmaz", async () => {
    await publishPassagePacks(db, [validPack({ isFreeSample: true })]);
    const { authorization } = await createAuthenticatedUser(db);

    const res = await request(app.getHttpServer()).get("/passages").query({ level: "B2" }).set("Authorization", authorization).expect(200);
    const page = passagePageSchema.parse(res.body);

    expect(page.items).toHaveLength(1);
    const item = page.items[0]!;
    if (item.access !== "open") throw new Error("açık metin bekleniyordu");
    expect(item.questions).toHaveLength(4);
    expect(item.questions.every((q) => q.options.length === 4 && q.result === null)).toBe(true);
    const words = item.paragraphs[0]!.filter((run) => run.word).map((run) => [run.text, run.word!.gloss]);
    expect(words).toEqual([
      ["lighthouse", "deniz feneri"],
      ["keeper", "bekçi"],
    ]);
    expect(item.paragraphs[0]!.map((run) => run.text).join("")).toBe(validPack().paragraphs[0]);
    expect(JSON.stringify(res.body)).not.toContain("Gerekçe"); // açıklamalar cevaptan önce gitmez
    expect(await counts()).toEqual({ passages: 1, words: 2, passageWords: 2, spans: 2, questions: 4, options: 16 });
  });

  it("idempotent = NO-OP: aynı paket tekrar yayınlanınca id'ler, satır sayıları ve mevcut cevap aynı kalır", async () => {
    await publishPassagePacks(db, [validPack()]);
    const { userId } = await createAuthenticatedUser(db);
    const [question] = await db.select().from(passageQuestionsTable).where(eq(passageQuestionsTable.position, 1));
    const [option] = await db.select().from(passageOptionsTable).where(eq(passageOptionsTable.questionId, question!.id)).limit(1);
    await db.insert(passageAnswersTable).values({ userId, questionId: question!.id, optionId: option!.id, isCorrect: option!.isCorrect });
    const before = { counts: await counts(), questions: await db.select().from(passageQuestionsTable), options: await db.select().from(passageOptionsTable), passages: await db.select().from(passagesTable) };

    const results = await publishPassagePacks(db, [validPack()]);

    expect(results).toEqual([{ slug: "fixture-lighthouse", status: "unchanged" }]);
    expect(await counts()).toEqual(before.counts);
    expect(await db.select().from(passageQuestionsTable)).toEqual(before.questions);
    expect(await db.select().from(passageOptionsTable)).toEqual(before.options);
    expect(await db.select().from(passagesTable)).toEqual(before.passages);
    const answers = await db.select().from(passageAnswersTable);
    expect(answers).toHaveLength(1);
    expect(answers[0]!.optionId).toBe(option!.id);
  });

  it("aynı slug + herhangi bir fark REDDEDİLİR ve DB'ye dokunulmaz: içerik, sortOrder, isFreeSample, emekli slug", async () => {
    await publishPassagePacks(db, [validPack()]);
    const snapshot = { counts: await counts(), passages: await db.select().from(passagesTable), options: await db.select().from(passageOptionsTable) };

    const changedContent = validPack({ title: "Düzeltilmiş başlık" });
    const changedGloss = validPack();
    changedGloss.words[0]!.gloss = "fener";
    for (const changed of [changedContent, changedGloss, validPack({ sortOrder: 2 }), validPack({ isFreeSample: true })]) {
      await expect(publishPassagePacks(db, [changed])).rejects.toBeInstanceOf(PassagePublishError);
    }
    await db.update(passagesTable).set({ retiredAt: new Date() }).where(eq(passagesTable.slug, "fixture-lighthouse"));
    await expect(publishPassagePacks(db, [validPack()])).rejects.toThrow(/emekli/);

    expect((await counts())).toEqual(snapshot.counts);
    expect(await db.select().from(passageOptionsTable)).toEqual(snapshot.options);
    const [row] = await db.select().from(passagesTable);
    expect(row!.title).toBe(snapshot.passages[0]!.title); // başlık değişmedi
  });

  it("emekli edilen metnin YENİ slug'lı düzeltilmiş hali yayınlanabilir (eski satır ve cevapları kalır)", async () => {
    await publishPassagePacks(db, [validPack()]);
    await db.update(passagesTable).set({ retiredAt: new Date() }).where(eq(passagesTable.slug, "fixture-lighthouse"));

    await publishPassagePacks(db, [validPack({ slug: "fixture-lighthouse-v2", title: "Düzeltilmiş" })]);

    expect((await db.select().from(passagesTable)).map((row) => row.slug).sort()).toEqual(["fixture-lighthouse", "fixture-lighthouse-v2"]);
    // Aynı (lemma, anlam) kelimeleri yeniden kullanıldı: words kopyalanmadı.
    expect((await db.select().from(wordsTable)).length).toBe(2);
  });

  it("ATOMİK: ikinci paket DB durumuyla çakışınca (geç hata) birinci paketin yazımı dahil HİÇBİR tablo değişmez", async () => {
    await publishPassagePacks(db, [validPack({ slug: "existing-free", level: "B1", sortOrder: 1, isFreeSample: true })]);
    const before = await counts();

    const first = validPack({ slug: "new-one", level: "C1", sortOrder: 5 });
    const second = validPack({ slug: "new-two", level: "B1", sortOrder: 2, isFreeSample: true }); // B1 ücretsiz örnek zaten var
    await expect(publishPassagePacks(db, [first, second])).rejects.toThrow(/ücretsiz örnek zaten var/);

    expect(await counts()).toEqual(before);
    expect((await db.select().from(passagesTable)).map((row) => row.slug)).toEqual(["existing-free"]);
  });

  it("(seviye, sortOrder) DB'de başka aktif metinde doluysa reddedilir; emekli metnin sırası serbesttir", async () => {
    await publishPassagePacks(db, [validPack()]);
    await expect(publishPassagePacks(db, [validPack({ slug: "clash" })])).rejects.toThrow(/sortOrder 1/);
    await db.update(passagesTable).set({ retiredAt: new Date() }).where(eq(passagesTable.slug, "fixture-lighthouse"));
    await expect(publishPassagePacks(db, [validPack({ slug: "clash" })])).resolves.toEqual([{ slug: "clash", status: "created" }]);
  });

  it("geçersiz paket DB'ye ulaşmaz (yayıncı kendi kapısını da çalıştırır) ve hiçbir tablo değişmez", async () => {
    const bad = validPack();
    bad.questions[0]!.options[1]!.isCorrect = true; // iki doğru şık
    await expect(publishPassagePacks(db, [validPack({ slug: "good", sortOrder: 9 }), bad])).rejects.toBeInstanceOf(PassagePublishError);
    expect(await counts()).toEqual(EMPTY);
  });

  it("aynı çalıştırmada tekrar eden slug veya (seviye, sıra) hiçbir şey yazmadan reddedilir", async () => {
    await expect(publishPassagePacks(db, [validPack(), validPack()])).rejects.toBeInstanceOf(PassagePublishError);
    await expect(publishPassagePacks(db, [validPack(), validPack({ slug: "other" })])).rejects.toBeInstanceOf(PassagePublishError);
    expect(await counts()).toEqual(EMPTY);
  });

  it("homonym: aynı lemma farklı anlamla ayrı word satırı; aynı (lemma, anlam) yeniden kullanılır", async () => {
    await db.insert(wordsTable).values({ language: "en", lemma: "keeper", gloss: "kaleci" }); // başka anlam, mevcut
    await db.insert(wordsTable).values({ language: "en", lemma: "lighthouse", gloss: "deniz feneri" }); // aynı anlam, mevcut

    await publishPassagePacks(db, [validPack()]);

    const rows = await db.select().from(wordsTable);
    expect(rows.map((row) => `${row.lemma}:${row.gloss}`).sort()).toEqual(["keeper:bekçi", "keeper:kaleci", "lighthouse:deniz feneri"]);
  });
});
