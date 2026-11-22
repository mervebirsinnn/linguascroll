import { randomUUID } from "node:crypto";
import type { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { CLIENT_PLATFORM_HEADER, feedPageSchema, playbackAccessResponseSchema, subscriptionOverviewSchema } from "@linguascroll/shared-types";
import { eq } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import type { Pool } from "pg";
import request from "supertest";
import { createAuthenticatedUser, withTestAuth } from "../auth/test-auth";
import { createTestDatabaseConnection, truncateTestTables } from "../videos/test-database";
import { videosTable } from "../videos/videos.schema";
import { freePreviewVideosTable } from "./free-preview-videos.schema";
import { RevenueCatClient } from "./revenue-cat-client";

const SEED = "0123456789abcdef0123456789abcdef";

/**
 * 2026-11-22 — iOS yayını: kapı YALNIZ iOS'a uygulanır (SUBSCRIPTION_GATE_ENABLED=false + SUBSCRIPTION_GATE_PLATFORMS=ios).
 * Gerçek HTTP → guard → @RequestPlatform → service → Postgres. Android, başlıksız (yayındaki eski sürümler) ve geçersiz başlık
 * bugünkü gibi sınırsız kalmalı; iOS 10 ücretsiz video + paywall, Premium (backend doğrulaması) sınırsız.
 * Env, AppModule import edilmeden ÖNCE ayarlanır (bkz. subscriptions.e2e-spec.ts aynı gerekçe).
 */
describe("Platforma göre abonelik kapısı (e2e, yalnız iOS kapılı)", () => {
  let app: INestApplication;
  let db: NodePgDatabase;
  let pool: Pool;
  const entitlements = new Map<string, boolean>();

  beforeAll(async () => {
    process.env.SUBSCRIPTION_GATE_ENABLED = "false";
    process.env.SUBSCRIPTION_GATE_PLATFORMS = "ios";
    process.env.REVENUECAT_SECRET_API_KEY = "sk_test_not_real";
    process.env.MEDIA_URL_SIGNING_SECRET = "e2e-media-signing-secret-at-least-32-chars";
    const { AppModule } = await import("../app.module");

    const moduleRef = await withTestAuth(Test.createTestingModule({ imports: [AppModule] }))
      .overrideProvider(RevenueCatClient)
      .useValue({
        readSubscription: async (userId: string) => ({ active: entitlements.get(userId) ?? false, expiresAt: null, renewal: "unknown", period: "unknown", productId: null }),
        checkEntitlement: async (userId: string) => entitlements.get(userId) ?? false,
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
    delete process.env.SUBSCRIPTION_GATE_PLATFORMS;
    delete process.env.REVENUECAT_SECRET_API_KEY;
    delete process.env.MEDIA_URL_SIGNING_SECRET;
  });

  async function createVideos(count: number): Promise<string[]> {
    const rows = await db
      .insert(videosTable)
      .values(
        Array.from({ length: count }, () => ({
          learningLanguage: "en",
          cefrLevel: "A1" as const,
          muxAssetId: `local-e2e-${randomUUID()}`,
          topic: "travel" as const,
          durationMs: 10000,
          category: "general" as const,
        })),
      )
      .returning({ id: videosTable.id });
    return rows.map((row) => row.id).sort();
  }

  function withPlatform(test: request.Test, platform: string | undefined): request.Test {
    return platform === undefined ? test : test.set(CLIENT_PLATFORM_HEADER, platform);
  }

  async function accessStatus(videoId: string, authorization: string, platform: string | undefined): Promise<string> {
    const response = await withPlatform(request(app.getHttpServer()).post(`/videos/${videoId}/playback-access`).set("Authorization", authorization), platform).expect(200);
    return playbackAccessResponseSchema.parse(response.body).status;
  }

  async function grantedCount(userId: string): Promise<number> {
    return (await db.select().from(freePreviewVideosTable).where(eq(freePreviewVideosTable.userId, userId))).length;
  }

  it("iOS: ilk 10 video açılır, 11. paywall", async () => {
    const { userId, authorization } = await createAuthenticatedUser(db);
    const videos = await createVideos(11);
    for (const videoId of videos.slice(0, 10)) expect(await accessStatus(videoId, authorization, "ios")).toBe("granted");
    expect(await accessStatus(videos[10] as string, authorization, "ios")).toBe("paywall");
    expect(await grantedCount(userId)).toBe(10);
  });

  it.each([
    ["android", "android"],
    ["başlıksız (yayındaki eski sürümler)", undefined],
    ["geçersiz başlık", "web"],
  ])("%s: kapı yok, tüm videolar açılır ve ücretsiz hak defterine yazılmaz", async (_label, platform) => {
    const { userId, authorization } = await createAuthenticatedUser(db);
    const videos = await createVideos(11);
    for (const videoId of videos) expect(await accessStatus(videoId, authorization, platform)).toBe("granted");
    expect(await grantedCount(userId)).toBe(0);
  });

  it("iOS'ta Premium (RevenueCat doğrulaması) 11. videoyu da açar", async () => {
    const { userId, authorization } = await createAuthenticatedUser(db);
    const videos = await createVideos(11);
    entitlements.set(userId, true);
    expect(await accessStatus(videos[10] as string, authorization, "ios")).toBe("granted");
  });

  it("feed: iOS'ta 10 ücretsiz videodan sonra paywall kartı; Android'de kesinti yok", async () => {
    const { authorization } = await createAuthenticatedUser(db);
    await createVideos(15);

    const ios = feedPageSchema.parse(
      (await request(app.getHttpServer()).get(`/feed?sessionSeed=${SEED}`).set("Authorization", authorization).set(CLIENT_PLATFORM_HEADER, "ios").expect(200)).body,
    );
    expect(ios.items.filter((item) => item.type === "video")).toHaveLength(10);
    expect(ios.items.at(-1)).toEqual({ type: "paywall" });
    expect(ios.nextCursor).toBeNull();

    const android = feedPageSchema.parse(
      (await request(app.getHttpServer()).get(`/feed?sessionSeed=${SEED}`).set("Authorization", authorization).set(CLIENT_PLATFORM_HEADER, "android").expect(200)).body,
    );
    expect(android.items.some((item) => item.type === "paywall")).toBe(false);
    expect(android.nextCursor).not.toBeNull();
  });

  it("Hesabım durumu: gateEnabled iOS'ta true, Android ve başlıksız istekte false", async () => {
    const { authorization } = await createAuthenticatedUser(db);
    const status = async (platform: string | undefined) =>
      subscriptionOverviewSchema.parse((await withPlatform(request(app.getHttpServer()).get("/subscriptions/status").set("Authorization", authorization), platform).expect(200)).body).gateEnabled;
    expect(await status("ios")).toBe(true);
    expect(await status("android")).toBe(false);
    expect(await status(undefined)).toBe(false);
  });
});
