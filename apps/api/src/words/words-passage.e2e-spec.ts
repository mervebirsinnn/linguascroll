import type { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { savedWordSchema } from "@linguascroll/shared-types";
import { eq } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import type { Pool } from "pg";
import request from "supertest";
import { createAuthenticatedUser, withTestAuth } from "../auth/test-auth";
import { passagesTable } from "../passages/passages.schema";
import { createPassageFixture } from "../passages/passage-test-fixtures";
import { RevenueCatClient } from "../subscriptions/revenue-cat-client";
import { createTestDatabaseConnection, truncateTestTables } from "../videos/test-database";
import { videoTranscriptSegmentsTable } from "../videos/transcript-segments.schema";
import { videosTable } from "../videos/videos.schema";
import { userSavedWordsTable } from "./user-saved-words.schema";
import { wordsTable } from "./words.schema";

/**
 * Paragraftan kelime kaydı (PUT /words/:id/saved + sourcePassageId), kapı AÇIK. Env, AppModule import edilmeden önce
 * ayarlanır (passages-gate.e2e-spec ile aynı desen); yalnız Firebase ve RevenueCat taklit.
 */
describe("Paragraftan kelime kaydı (e2e, gerçek Postgres, kapı açık)", () => {
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

  const save = (authorization: string, wordId: string, body: Record<string, unknown>) =>
    request(app.getHttpServer()).put(`/words/${wordId}/saved`).set("Authorization", authorization).send(body);
  const saved = (authorization: string) => request(app.getHttpServer()).get("/words/saved").set("Authorization", authorization);

  it("ücretsiz örnek: abone olmayan kaydeder; Memory'de kaynak cümle metindeki bağlam cümlesidir", async () => {
    const { authorization } = await createAuthenticatedUser(db);
    const free = await createPassageFixture(db, { slug: "free", isFreeSample: true });

    const res = await save(authorization, free.wordId, { sourcePassageId: free.passageId }).expect(200);
    expect(res.body).toEqual({ created: true });

    const list = (await saved(authorization).expect(200)).body.map((item: unknown) => savedWordSchema.parse(item));
    expect(list).toHaveLength(1);
    expect(list[0].sourceSentence).toBe("A cat sat.");
    const [row] = await db.select().from(userSavedWordsTable);
    expect(row?.sourcePassageId).toBe(free.passageId);
    expect(row?.sourceSegmentId).toBeNull();
  });

  it("kilitli metin: abone değilken 403 ve satır yazılmaz; abone olunca (refresh sonrası) kaydedilir", async () => {
    const { authorization, userId } = await createAuthenticatedUser(db);
    const paid = await createPassageFixture(db, { slug: "paid" });

    await save(authorization, paid.wordId, { sourcePassageId: paid.passageId }).expect(403);
    expect(await db.select().from(userSavedWordsTable)).toHaveLength(0);

    entitlements.set(userId, true);
    await request(app.getHttpServer()).post("/subscriptions/refresh").set("Authorization", authorization).expect(200);
    await save(authorization, paid.wordId, { sourcePassageId: paid.passageId }).expect(200);
    expect(await db.select().from(userSavedWordsTable)).toHaveLength(1);
  });

  it("kelime o metne ait değilse 400; olmayan ve emekli metin 400; segmentle birlikte 400 — hiçbirinde satır yazılmaz", async () => {
    const { authorization, userId } = await createAuthenticatedUser(db);
    entitlements.set(userId, true);
    const passage = await createPassageFixture(db, { slug: "a", isFreeSample: true });
    const retired = await createPassageFixture(db, { slug: "retired", isFreeSample: true, retired: true });
    const [other] = await db.insert(wordsTable).values({ language: "en", lemma: "dog", gloss: "köpek" }).returning();

    await save(authorization, other!.id, { sourcePassageId: passage.passageId }).expect(400);
    await save(authorization, passage.wordId, { sourcePassageId: "00000000-0000-4000-8000-0000000000ff" }).expect(400);
    await save(authorization, retired.wordId, { sourcePassageId: retired.passageId }).expect(400);
    await save(authorization, passage.wordId, { sourcePassageId: passage.passageId, sourceSegmentId: "00000000-0000-4000-8000-0000000000fe" }).expect(400);
    await save(authorization, passage.wordId, { sourcePassageId: "not-a-uuid" }).expect(400);
    expect(await db.select().from(userSavedWordsTable)).toHaveLength(0);
  });

  it("ilk kayıt kazanır: aynı kelimeyi tekrar kaydetmek created:false döner ve kaynağı ezmez", async () => {
    const { authorization } = await createAuthenticatedUser(db);
    const first = await createPassageFixture(db, { slug: "first", isFreeSample: true });

    await save(authorization, first.wordId, { sourcePassageId: first.passageId }).expect(200);
    const again = await save(authorization, first.wordId, {}).expect(200);

    expect(again.body).toEqual({ created: false });
    const [row] = await db.select().from(userSavedWordsTable);
    expect(row?.sourcePassageId).toBe(first.passageId);
  });

  it("metin silinirse kelime kalır, kaynak cümle null olur (ON DELETE SET NULL)", async () => {
    const { authorization } = await createAuthenticatedUser(db);
    const free = await createPassageFixture(db, { slug: "free", isFreeSample: true });
    await save(authorization, free.wordId, { sourcePassageId: free.passageId }).expect(200);

    await db.delete(passagesTable).where(eq(passagesTable.id, free.passageId));

    const list = (await saved(authorization).expect(200)).body;
    expect(list).toHaveLength(1);
    expect(list[0].sourceSentence).toBeNull();
  });

  it("DB tek kaynak kuralını da zorlar: gerçek segment + gerçek metin aynı satırda yazılamaz (CHECK, FK değil)", async () => {
    const { userId } = await createAuthenticatedUser(db);
    const free = await createPassageFixture(db, { slug: "free", isFreeSample: true });
    const [video] = await db.insert(videosTable).values({ learningLanguage: "en", cefrLevel: "A1", muxAssetId: "check-asset", topic: "travel", durationMs: 1000 }).returning();
    const [segment] = await db
      .insert(videoTranscriptSegmentsTable)
      .values({ videoId: video!.id, ordinal: 1, startMs: 0, endMs: 1000, text: "x", englishExplanation: "e", turkishExplanation: "t" })
      .returning();

    const failure = await db
      .insert(userSavedWordsTable)
      .values({ userId, wordId: free.wordId, sourcePassageId: free.passageId, sourceSegmentId: segment!.id })
      .then(() => null, (error: unknown) => error as { cause?: { message?: string }; message: string });

    expect(failure).not.toBeNull();
    expect(`${failure?.message} ${failure?.cause?.message ?? ""}`).toContain("user_saved_words_single_source_check");
  });
});
