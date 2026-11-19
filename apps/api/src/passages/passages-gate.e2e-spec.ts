import type { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { passagePageSchema } from "@linguascroll/shared-types";
import { eq } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import type { Pool } from "pg";
import request from "supertest";
import { createAuthenticatedUser, withTestAuth } from "../auth/test-auth";
import { freePreviewVideosTable } from "../subscriptions/free-preview-videos.schema";
import { freeVideoGrantsTable } from "../subscriptions/free-video-grants.schema";
import { RevenueCatClient } from "../subscriptions/revenue-cat-client";
import { createTestDatabaseConnection, truncateTestTables } from "../videos/test-database";
import { passageAnswersTable } from "./passage-answers.schema";
import { createPassageFixture, EXPLANATION_PREFIX, FIXTURE_GLOSS, FIXTURE_PARAGRAPH } from "./passage-test-fixtures";

/**
 * Okuma pratiği erişim matrisi, kapı AÇIK (SUBSCRIPTION_GATE_ENABLED=true). Env, AppModule import edilmeden ÖNCE
 * ayarlanmalı (ConfigModule.forRoot import anında doğruluyor) → AppModule dinamik import (subscriptions.e2e-spec ile aynı desen).
 * Yalnız iki dış bağımlılık taklit: Firebase token doğrulaması ve RevenueCat (entitlement'ı test belirliyor).
 */
describe("Okuma pratiği erişimi (e2e, gerçek Postgres, kapı açık)", () => {
  let app: INestApplication;
  let db: NodePgDatabase;
  let pool: Pool;
  const entitlements = new Map<string, boolean>();

  beforeAll(async () => {
    process.env.SUBSCRIPTION_GATE_ENABLED = "true";
    process.env.REVENUECAT_SECRET_API_KEY = "sk_test_not_real";
    process.env.MEDIA_URL_SIGNING_SECRET = "e2e-media-signing-secret-at-least-32-chars";
    const { AppModule } = await import("../app.module");

    const moduleRef = await withTestAuth(Test.createTestingModule({ imports: [AppModule] }))
      .overrideProvider(RevenueCatClient)
      .useValue({
        readSubscription: async (userId: string) => ({ active: entitlements.get(userId) ?? false, expiresAt: null, renewal: "unknown", period: "unknown", productId: null }),
        checkEntitlement: (userId: string) => Promise.resolve(entitlements.get(userId) ?? false),
      })
      .compile();
    app = moduleRef.createNestApplication();
    await app.init();
    const connection = createTestDatabaseConnection();
    db = connection.db;
    pool = connection.pool;
  });

  beforeEach(async () => {
    entitlements.clear();
    await truncateTestTables(db);
  });

  afterAll(async () => {
    await pool.end();
    await app.close();
    delete process.env.SUBSCRIPTION_GATE_ENABLED;
    delete process.env.REVENUECAT_SECRET_API_KEY;
    delete process.env.MEDIA_URL_SIGNING_SECRET;
  });

  const list = (authorization: string, level: string) => request(app.getHttpServer()).get("/passages").query({ level }).set("Authorization", authorization);
  const answer = (authorization: string, questionId: string, optionId: string) =>
    request(app.getHttpServer()).post(`/passages/questions/${questionId}/answer`).set("Authorization", authorization).send({ optionId });

  async function seedCatalog() {
    const freeB2 = await createPassageFixture(db, { slug: "free-b2", level: "B2", sortOrder: 1, isFreeSample: true });
    const paidB2 = await createPassageFixture(db, { slug: "paid-b2", level: "B2", sortOrder: 2 });
    const paidC1 = await createPassageFixture(db, { slug: "paid-c1", level: "C1", sortOrder: 1 });
    return { freeB2, paidB2, paidC1 };
  }

  it("abone olmayan: ücretsiz örnek açık, diğeri kilitli kart; kilitli kart YALNIZ sözleşme alanlarını taşır (ham gövde)", async () => {
    const { authorization } = await createAuthenticatedUser(db);
    const { freeB2, paidB2 } = await seedCatalog();

    const res = await list(authorization, "B2").expect(200);
    const page = passagePageSchema.parse(res.body);

    expect(page.items.map((item) => [item.id, item.access])).toEqual([
      [freeB2.passageId, "open"],
      [paidB2.passageId, "locked"],
    ]);
    const lockedRaw = res.body.items[1] as Record<string, unknown>;
    expect(Object.keys(lockedRaw).sort()).toEqual(["access", "id", "level", "title", "topic"]);
    // Kilitli metnin gövdesi, kelime anlamı, soruları veya açıklamaları gövdenin HİÇBİR yerinde olmamalı (açık metin dışında).
    const lockedOnly = JSON.stringify(lockedRaw);
    expect(lockedOnly).not.toContain(FIXTURE_PARAGRAPH);
    expect(lockedOnly).not.toContain(FIXTURE_GLOSS);
    expect(lockedOnly).not.toContain(EXPLANATION_PREFIX);
    expect(lockedOnly).not.toContain("questions");
    expect(lockedOnly).not.toContain(paidB2.wordId);
    expect(lockedOnly).not.toContain(paidB2.questions[0]!.questionId);
  });

  it("C1/C2 sorgusu (ücretsiz örnek yok): hepsi düzgün kilitli kart", async () => {
    const { authorization } = await createAuthenticatedUser(db);
    const { paidC1 } = await seedCatalog();

    const res = await list(authorization, "C1").expect(200);

    expect(passagePageSchema.parse(res.body).items.map((item) => [item.id, item.access])).toEqual([[paidC1.passageId, "locked"]]);
    expect(Object.keys(res.body.items[0]).sort()).toEqual(["access", "id", "level", "title", "topic"]);
    await list(authorization, "C2").expect(200).expect((r) => expect(r.body).toEqual({ items: [], nextCursor: null }));
  });

  it("abone: tüm metinler açık", async () => {
    const { authorization, userId } = await createAuthenticatedUser(db);
    entitlements.set(userId, true);
    await seedCatalog();

    const b2 = passagePageSchema.parse((await list(authorization, "B2").expect(200)).body);
    const c1 = passagePageSchema.parse((await list(authorization, "C1").expect(200)).body);

    expect([...b2.items, ...c1.items].every((item) => item.access === "open")).toBe(true);
  });

  it("kilitli metinde answer 403 ve DB'ye yazım olmaz; abone olunca aynı soru cevaplanır", async () => {
    const { authorization, userId } = await createAuthenticatedUser(db);
    const { paidB2 } = await seedCatalog();
    const q = paidB2.questions[0]!;

    await answer(authorization, q.questionId, q.correctOptionId).expect(403);
    expect(await db.select().from(passageAnswersTable)).toHaveLength(0);

    // Satın alma sonrası gerçek akış: "abone değil" sonucu kısa süre önbellekte; mobil POST /subscriptions/refresh ile
    // önbelleği atlatıp yeniden doğrulatıyor (bkz. SubscriptionsService.refreshSubscription).
    entitlements.set(userId, true);
    await request(app.getHttpServer()).post("/subscriptions/refresh").set("Authorization", authorization).expect(200);
    await answer(authorization, q.questionId, q.correctOptionId).expect(200);
    expect(await db.select().from(passageAnswersTable)).toHaveLength(1);
  });

  it("ücretsiz örnek abone olmayan için cevaplanabilir ve ücretsiz video hak defterine HİÇ yazılmaz", async () => {
    const { authorization, userId } = await createAuthenticatedUser(db);
    const { freeB2 } = await seedCatalog();

    await list(authorization, "B2").expect(200);
    for (const question of freeB2.questions) {
      await answer(authorization, question.questionId, question.correctOptionId).expect(200);
    }

    expect(await db.select().from(freeVideoGrantsTable).where(eq(freeVideoGrantsTable.userId, userId))).toHaveLength(0);
    expect(await db.select().from(freePreviewVideosTable).where(eq(freePreviewVideosTable.userId, userId))).toHaveLength(0);
  });

  it("abonelikten düşmüş kullanıcıda (eski cevap satırı var) kilitli kart eski cevabı ve açıklamayı SIZDIRMAZ", async () => {
    const { authorization, userId } = await createAuthenticatedUser(db);
    const { paidB2 } = await seedCatalog();
    const q = paidB2.questions[0]!;
    // Kullanıcı eskiden abone iken cevaplamış (satır doğrudan yazıldı); şimdi abone değil.
    await db.insert(passageAnswersTable).values({ userId, questionId: q.questionId, optionId: q.wrongOptionId, isCorrect: false });

    const res = await list(authorization, "B2").expect(200);

    const locked = res.body.items.find((item: { id: string }) => item.id === paidB2.passageId) as Record<string, unknown>;
    expect(locked.access).toBe("locked");
    const lockedRaw = JSON.stringify(locked);
    expect(lockedRaw).not.toContain(EXPLANATION_PREFIX);
    expect(lockedRaw).not.toContain(q.wrongOptionId);
    expect(lockedRaw).not.toContain("result");
  });
});
