import { randomUUID } from "node:crypto";
import { Test } from "@nestjs/testing";
import type { INestApplication } from "@nestjs/common";
import request from "supertest";
import { eq } from "drizzle-orm";
import { withTestAuth, createAuthenticatedUser } from "../auth/test-auth";
import { createTestDatabaseConnection, truncateTestTables } from "../videos/test-database";
import { videosTable } from "../videos/videos.schema";
import { videoTranscriptSegmentsTable } from "../videos/transcript-segments.schema";
import { segmentWordGlossesTable } from "../words/segment-word-glosses.schema";
import { UsersRepository } from "../users/users-repository";
import { RevenueCatClient } from "./revenue-cat-client";
import { NO_SUBSCRIPTION } from "./revenue-cat-client";
import { videoFeedbackTable } from "../feedback/video-feedback.schema";
import { usersTable } from "../users/users.schema";
import { AppModule } from "../app.module";

describe("Hesap ve öğrenme (gerçek PostgreSQL)", () => {
  const connection = createTestDatabaseConnection();
  let app: INestApplication;
  let users: UsersRepository;
  beforeAll(async () => {
    const module = await withTestAuth(Test.createTestingModule({ imports: [AppModule] }))
      .overrideProvider(RevenueCatClient).useValue({ readSubscription: async () => NO_SUBSCRIPTION, checkEntitlement: async () => false }).compile();
    app = module.createNestApplication(); await app.init(); users = module.get(UsersRepository);
  });
  beforeEach(async () => truncateTestTables(connection.db));
  afterAll(async () => { await app?.close(); await connection.pool.end(); });
  async function content() {
    const [video] = await connection.db.insert(videosTable).values({ learningLanguage: "en", cefrLevel: "A1", muxAssetId: `local-test-${randomUUID()}`, topic: "travel", durationMs: 10000 }).returning();
    const [segment] = await connection.db.insert(videoTranscriptSegmentsTable).values({ videoId: video!.id, ordinal: 1, startMs: 0, endMs: 1000, text: "A bank by the river.", englishExplanation: "A river bank.", turkishExplanation: "Nehir kıyısı." }).returning();
    await connection.db.insert(segmentWordGlossesTable).values({ segmentId: segment!.id, word: "bank", gloss: "nehir kıyısı" });
    return { video: video!, segment: segment! };
  }
  it("altyazı anlamı idempotent kaydedilir, kaynak cümlesi ve tekrar oturumu korunur", async () => {
    const { authorization } = await createAuthenticatedUser(connection.db);
    const { segment } = await content();
    const save = () => request(app.getHttpServer()).post("/words/saved-glosses").set("Authorization", authorization).send({ segmentId: segment.id, word: "BANK", gloss: "forged" }).expect(200);
    const [a, b] = await Promise.all([save(), save()]);
    expect(a.body.word.id).toBe(b.body.word.id);
    expect(a.body.word.gloss).toBe("nehir kıyısı");
    const saved = await request(app.getHttpServer()).get("/words/saved").set("Authorization", authorization).expect(200);
    expect(saved.body).toHaveLength(1); expect(saved.body[0].sourceSentence).toBe(segment.text);
    const review = await request(app.getHttpServer()).get("/words/review").set("Authorization", authorization).expect(200);
    expect(review.body).toHaveLength(1);
    await request(app.getHttpServer()).post("/words/saved-glosses").set("Authorization", authorization).send({ segmentId: segment.id, word: "absent" }).expect(404);
  });
  it("içerik bildirimi token kullanıcısına kaydedilir, aynı bildirim satırı güncellenir", async () => {
    const { userId, authorization } = await createAuthenticatedUser(connection.db);
    const { video } = await content();
    const url = `/videos/${video.id}/feedback`;
    await request(app.getHttpServer()).post(url).send({ reason: "subtitle" }).expect(401);
    await request(app.getHttpServer()).post(url).set("Authorization", authorization).send({ reason: "subtitle", comment: "ilk" }).expect(200);
    await request(app.getHttpServer()).post(url).set("Authorization", authorization).send({ reason: "subtitle", comment: "son", userId: randomUUID() }).expect(200);
    const rows = await connection.db.select().from(videoFeedbackTable);
    expect(rows).toHaveLength(1); expect(rows[0]).toMatchObject({ userId, comment: "son" });
    await request(app.getHttpServer()).post(url).set("Authorization", authorization).send({ reason: "unknown" }).expect(400);
  });
  it("durum endpoint'i ücretsiz hakkı ve doğrulanmış aboneliği döner", async () => {
    const { authorization } = await createAuthenticatedUser(connection.db);
    const result = await request(app.getHttpServer()).get("/subscriptions/status").set("Authorization", authorization).expect(200);
    expect(result.body).toMatchObject({ freeVideoLimit: 10, remainingFreeVideos: 10, verification: "verified", subscription: { active: false } });
  });
  it("silinen hesabın eski token'ı yeni hak açmaz ve kişisel kayıtlar temizlenir", async () => {
    const { userId, authorization } = await createAuthenticatedUser(connection.db);
    const [user] = await connection.db.select().from(usersTable).where(eq(usersTable.id, userId));
    await users.beginDeletion(user!.firebaseUid!);
    await request(app.getHttpServer()).get("/me").set("Authorization", authorization).expect(403);
    await users.finishDeletion(userId);
    await request(app.getHttpServer()).get("/me").set("Authorization", authorization).expect(403);
    expect(await connection.db.select().from(usersTable)).toHaveLength(0);
  });
});
