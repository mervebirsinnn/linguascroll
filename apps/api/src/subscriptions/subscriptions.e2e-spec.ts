import { randomUUID } from "node:crypto";
import type { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { feedPageSchema, playbackAccessResponseSchema, type FeedItem } from "@linguascroll/shared-types";
import { eq } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import type { Pool } from "pg";
import request from "supertest";
import { bearerFor, createAuthenticatedUser, withTestAuth } from "../auth/test-auth";
import { createTestDatabaseConnection, truncateTestTables } from "../videos/test-database";
import { videosTable } from "../videos/videos.schema";
import { freeVideoGrantsTable } from "./free-video-grants.schema";
import { RevenueCatClient } from "./revenue-cat-client";

const SEED = "fedcba9876543210fedcba9876543210";

/**
 * 2026-10-27 — ücretsiz hak + abonelik akışının uçtan uca doğrulaması (gerçek HTTP → guard →
 * service → Postgres). Sadece iki dış bağımlılık taklit ediliyor: Firebase token doğrulaması
 * (test-auth.ts) ve RevenueCat REST (entitlement'ı test kontrol ediyor).
 *
 * Kapı AÇIK çalışıyor: env, AppModule import edilmeden ÖNCE ayarlanmalı (ConfigModule.forRoot
 * import anında doğruluyor) — bu yüzden AppModule beforeAll içinde dinamik import ediliyor.
 * Jest her test dosyasına ayrı modül kaydı verdiği için diğer suite'leri etkilemez.
 */
describe("Ücretsiz hak + abonelik (e2e, gerçek Postgres, kapı açık)", () => {
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
      .useValue({ checkEntitlement: (userId: string) => Promise.resolve(entitlements.get(userId) ?? false) })
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

  async function createVideos(count: number, category: "general" | "ielts" = "general"): Promise<string[]> {
    const rows = await db
      .insert(videosTable)
      .values(
        Array.from({ length: count }, () => ({
          learningLanguage: "en",
          cefrLevel: "A1" as const,
          // resolvePlaybackUrl'ün tanıdığı `local-<slug>` deseni (dosyanın var olması gerekmiyor).
          muxAssetId: `local-e2e-${randomUUID()}`,
          topic: "travel" as const,
          durationMs: 10000,
          category,
        })),
      )
      .returning({ id: videosTable.id });
    return rows.map((row) => row.id);
  }

  function access(videoId: string, authorization: string): request.Test {
    return request(app.getHttpServer()).post(`/videos/${videoId}/playback-access`).set("Authorization", authorization);
  }

  async function grantedCount(userId: string): Promise<number> {
    return (await db.select().from(freeVideoGrantsTable).where(eq(freeVideoGrantsTable.userId, userId))).length;
  }

  function newVideoItems(items: FeedItem[]): Extract<FeedItem, { type: "video" }>[] {
    return items.filter((item): item is Extract<FeedItem, { type: "video" }> => item.type === "video" && item.video.playbackUrl === null);
  }

  it("token yoksa playback-access ve refresh 401", async () => {
    const [videoId] = await createVideos(1);
    expect((await request(app.getHttpServer()).post(`/videos/${videoId}/playback-access`)).status).toBe(401);
    expect((await request(app.getHttpServer()).post("/subscriptions/refresh")).status).toBe(401);
  });

  it("ilk 10 farklı video açılır (kısa ömürlü imzalı URL), 11. paywall döner", async () => {
    const { userId, authorization } = await createAuthenticatedUser(db);
    const videos = await createVideos(11);

    for (const videoId of videos.slice(0, 10)) {
      const body = playbackAccessResponseSchema.parse((await access(videoId, authorization).expect(200)).body);
      expect(body.status).toBe("granted");
      if (body.status === "granted") {
        const url = new URL(body.playbackUrl);
        expect(url.searchParams.get("exp")).toMatch(/^\d+$/);
        expect(url.searchParams.get("sig")).toBeTruthy();
      }
    }
    expect((await access(videos[10] as string, authorization)).body).toEqual({ status: "paywall" });
    expect(await grantedCount(userId)).toBe(10);
  });

  it("aynı video tekrar istenince hak tüketmez; hak bitmişken de daha önce açılan video açılır", async () => {
    const { userId, authorization } = await createAuthenticatedUser(db);
    const videos = await createVideos(10);
    for (const videoId of videos) await access(videoId, authorization).expect(200);

    expect((await access(videos[0] as string, authorization)).body.status).toBe("granted");
    expect(await grantedCount(userId)).toBe(10);
  });

  it("9 hak kullanılmışken iki eşzamanlı farklı video isteğinden yalnızca biri açılır", async () => {
    const { userId, authorization } = await createAuthenticatedUser(db);
    const videos = await createVideos(11);
    for (const videoId of videos.slice(0, 9)) await access(videoId, authorization).expect(200);

    const [a, b] = await Promise.all([access(videos[9] as string, authorization), access(videos[10] as string, authorization)]);
    expect([a.body.status, b.body.status].sort()).toEqual(["granted", "paywall"]);
    expect(await grantedCount(userId)).toBe(10);
  });

  it("cihaz değişimi sınırı sıfırlamaz: aynı hesap (aynı Firebase UID) aynı sayacı paylaşır", async () => {
    const videos = await createVideos(11);
    const deviceA = bearerFor("same-firebase-account");
    const deviceB = bearerFor("same-firebase-account");
    for (const videoId of videos.slice(0, 5)) await access(videoId, deviceA).expect(200);
    for (const videoId of videos.slice(5, 10)) await access(videoId, deviceB).expect(200);
    expect((await access(videos[10] as string, deviceB)).body).toEqual({ status: "paywall" });
  });

  it("feed kalan hak kadar yeni video gösterir, sonra paywall; kategori değiştirmek ve prefetch sınırı aşmaz", async () => {
    const { authorization } = await createAuthenticatedUser(db);
    const general = await createVideos(12, "general");
    await createVideos(6, "ielts");
    for (const videoId of general.slice(0, 7)) await access(videoId, authorization).expect(200);

    // Prefetch: feed'i çekmek hak tüketmez — 3 hak kaldı, feed en fazla 3 yeni (URL'siz) video gösterir.
    const page = feedPageSchema.parse((await request(app.getHttpServer()).get(`/feed?sessionSeed=${SEED}`).set("Authorization", authorization).expect(200)).body);
    expect(newVideoItems(page.items).length).toBeLessThanOrEqual(3);
    expect(page.items.at(-1)?.type).toBe("paywall");
    expect(page.nextCursor).toBeNull();

    // Kategori değişse de feed sınırı aşmaz; asıl kontrol playback-access'te.
    const animation = feedPageSchema.parse(
      (await request(app.getHttpServer()).get(`/feed?scope=ielts&sessionSeed=${SEED}`).set("Authorization", authorization).expect(200)).body,
    );
    const offered = newVideoItems(animation.items).map((item) => item.video.id);
    expect(offered.length).toBeLessThanOrEqual(3);
    const results = [];
    for (const videoId of offered) results.push((await access(videoId, authorization)).body.status);
    expect(results.every((status) => status === "granted")).toBe(true);
    // Hak bitti: herhangi bir başka yeni video artık açılmaz.
    const [extra] = await createVideos(1);
    expect((await access(extra as string, authorization)).body).toEqual({ status: "paywall" });
  });

  it("satın alma sonrası refresh doğrulanmış aboneliği hemen görür ve erişimi açar (15 sn önbellek beklenmez)", async () => {
    const { userId, authorization } = await createAuthenticatedUser(db);
    const videos = await createVideos(11);
    for (const videoId of videos.slice(0, 10)) await access(videoId, authorization).expect(200);
    expect((await access(videos[10] as string, authorization)).body.status).toBe("paywall"); // "abone değil" önbelleğe girdi

    entitlements.set(userId, true); // RevenueCat satın almayı kaydetti
    expect((await request(app.getHttpServer()).post("/subscriptions/refresh").set("Authorization", authorization).expect(200)).body).toEqual({ active: true });
    expect((await access(videos[10] as string, authorization)).body.status).toBe("granted");
    expect(await grantedCount(userId)).toBe(10); // abonenin izlediği deftere yazılmaz
  });

  it("başarısız/iptal edilen satın alma (RevenueCat'te entitlement yok) erişim açmaz", async () => {
    const { authorization } = await createAuthenticatedUser(db);
    const videos = await createVideos(11);
    for (const videoId of videos.slice(0, 10)) await access(videoId, authorization).expect(200);

    expect((await request(app.getHttpServer()).post("/subscriptions/refresh").set("Authorization", authorization).expect(200)).body).toEqual({ active: false });
    expect((await access(videos[10] as string, authorization)).body).toEqual({ status: "paywall" });
  });

  it("abonelik bitişi ücretsiz hakları yenilemez", async () => {
    const { userId, authorization } = await createAuthenticatedUser(db);
    const videos = await createVideos(13);
    for (const videoId of videos.slice(0, 10)) await access(videoId, authorization).expect(200);

    entitlements.set(userId, true);
    await request(app.getHttpServer()).post("/subscriptions/refresh").set("Authorization", authorization).expect(200);
    expect((await access(videos[10] as string, authorization)).body.status).toBe("granted");

    entitlements.set(userId, false); // abonelik bitti
    await request(app.getHttpServer()).post("/subscriptions/refresh").set("Authorization", authorization).expect(200);
    expect((await access(videos[11] as string, authorization)).body).toEqual({ status: "paywall" });
  });

  it("başka hesabın aboneliği bu hesaba erişim açmaz (entitlement backend kullanıcı id'sine bağlı)", async () => {
    const subscriber = await createAuthenticatedUser(db);
    const other = await createAuthenticatedUser(db);
    entitlements.set(subscriber.userId, true);
    const videos = await createVideos(11);
    for (const videoId of videos.slice(0, 10)) await access(videoId, other.authorization).expect(200);

    expect((await request(app.getHttpServer()).post("/subscriptions/refresh").set("Authorization", other.authorization)).body).toEqual({ active: false });
    expect((await access(videos[10] as string, other.authorization)).body).toEqual({ status: "paywall" });
  });
});
