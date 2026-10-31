import { randomUUID } from "node:crypto";
import type { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { feedPageSchema, playbackAccessResponseSchema, type FeedItem, topicSchema } from "@linguascroll/shared-types";
import { eq } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import type { Pool } from "pg";
import request from "supertest";
import { bearerFor, createAuthenticatedUser, withTestAuth } from "../auth/test-auth";
import { createTestDatabaseConnection, truncateTestTables } from "../videos/test-database";
import { videosTable } from "../videos/videos.schema";
import { freePreviewVideosTable } from "./free-preview-videos.schema";
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
      .useValue({ readSubscription: async (userId: string) => ({ active: entitlements.get(userId) ?? false, expiresAt: null, renewal: "unknown", period: "unknown", productId: null }), checkEntitlement: (userId: string) => Promise.resolve(entitlements.get(userId) ?? false) })
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
    return rows.map((row) => row.id).sort();
  }

  function access(videoId: string, authorization: string): request.Test {
    return request(app.getHttpServer()).post(`/videos/${videoId}/playback-access`).set("Authorization", authorization);
  }

  async function grantedCount(userId: string): Promise<number> {
    return (await db.select().from(freePreviewVideosTable).where(eq(freePreviewVideosTable.userId, userId))).length;
  }

  function newVideoItems(items: FeedItem[]): Extract<FeedItem, { type: "video" }>[] {
    return items.filter((item): item is Extract<FeedItem, { type: "video" }> => item.type === "video" && item.video.playbackUrl === null);
  }

  it("Premium akış kategori bitince diğer konulardan kesintisiz devam eder", async () => {
    const {userId, authorization} = await createAuthenticatedUser(db);
    await createVideos(4,"ielts"); await createVideos(12,"general"); entitlements.set(userId,true);
    let page = feedPageSchema.parse((await request(app.getHttpServer()).get(`/feed?scope=ielts&continuous=true&sessionSeed=${SEED}`).set("Authorization",authorization).expect(200)).body);
    expect(page.items.filter((i) => i.type === "video")).toHaveLength(4);
    let otherCategory = false;
    for(let n=0;n<8;n++) {
      expect(page.nextCursor).not.toBeNull();
      page = feedPageSchema.parse((await request(app.getHttpServer()).get(`/feed?scope=ielts&cursor=${encodeURIComponent(page.nextCursor!)}`).set("Authorization",authorization).expect(200)).body);
      expect(page.items.length).toBeGreaterThan(0); expect(page.items.some((i) => i.type === "paywall")).toBe(false);
      otherCategory ||= page.items.some((i) => i.type === "video" && i.video.category === "general");
    }
    expect(otherCategory).toBe(true);
    entitlements.set(userId,false);
    await request(app.getHttpServer()).post("/subscriptions/refresh").set("Authorization",authorization).expect(200);
    const stopped = feedPageSchema.parse((await request(app.getHttpServer()).get(`/feed?scope=ielts&cursor=${encodeURIComponent(page.nextCursor!)}`).set("Authorization",authorization).expect(200)).body);
    expect(stopped.nextCursor).toBeNull(); expect(stopped.items.at(-1)).toEqual({type:"paywall"});
  });

  it("ücretsiz kullanıcı continuous=true ile Premium kapısını aşamaz", async () => {
    const {authorization} = await createAuthenticatedUser(db); await createVideos(15);
    const page = feedPageSchema.parse((await request(app.getHttpServer()).get(`/feed?continuous=true&sessionSeed=${SEED}`).set("Authorization",authorization).expect(200)).body);
    expect(page.nextCursor).toBeNull(); expect(page.items.filter((i)=>i.type === "video")).toHaveLength(10);
    expect(page.items.at(-1)).toEqual({type:"paywall"});
  });

  it("yeni konular DB, feed ve tercih sorgusunda geçerlidir", async () => {
    const {userId,authorization} = await createAuthenticatedUser(db); entitlements.set(userId,true);
    await db.insert(videosTable).values(topicSchema.options.map((topic) => ({learningLanguage:"en",cefrLevel:"A1",muxAssetId:`local-topic-${topic}`,topic,durationMs:10000})));
    const seen = new Set<string>(); let cursor: string | null = null;
    do {
      const page = feedPageSchema.parse((await request(app.getHttpServer()).get(`/feed?sessionSeed=${SEED}&topics=science,music,food,cinema${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ""}`).set("Authorization",authorization).expect(200)).body);
      for(const item of page.items) if(item.type === "video") seen.add(item.video.topic);
      cursor = page.nextCursor;
    } while(cursor);
    expect(seen).toEqual(new Set(topicSchema.options));
  });

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

  it("eşzamanlı cihazlar aynı sabit seçkiyi alır, yenileme listeyi azaltmaz", async () => {
    const {userId, authorization} = await createAuthenticatedUser(db);
    const videos = await createVideos(15);
    const [a,b] = await Promise.all([access(videos[0]!, authorization), access(videos[14]!, authorization)]);
    expect(a.body.status).toBe("granted"); expect(b.body.status).toBe("paywall");
    expect(await grantedCount(userId)).toBe(10);
    for(let n=0;n<3;n++) expect((await access(videos[0]!, authorization)).body.status).toBe("granted");
    expect(await grantedCount(userId)).toBe(10);
  });

  it("her sekmede ayrı 10 video ve paywall; önceki tüketim seçkiyi azaltmaz", async () => {
    const {authorization} = await createAuthenticatedUser(db);
    await createVideos(15, "general"); await createVideos(15, "ielts");
    for(const scope of ["all", "ielts"]) {
      const pages: FeedItem[] = [];
      let cursor: string | null = null;
      do {
        const query = `/feed?scope=${scope}&sessionSeed=${SEED}${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ""}`;
        const page = feedPageSchema.parse((await request(app.getHttpServer()).get(query).set("Authorization", authorization).expect(200)).body);
        pages.push(...page.items); cursor = page.nextCursor;
      } while(cursor);
      const offered = pages.filter((i): i is Extract<FeedItem,{type:"video"}> => i.type === "video");
      expect(offered).toHaveLength(10); expect(pages.at(-1)).toEqual({type:"paywall"});
      for(const item of offered) expect((await request(app.getHttpServer()).post(`/videos/${item.video.id}/playback-access?scope=${scope}`).set("Authorization", authorization)).body.status).toBe("granted");
    }
  });

  it("başka kategorinin videosu scope değiştirilerek açılamaz; geçersiz scope reddedilir", async () => {
    const {authorization} = await createAuthenticatedUser(db);
    const [id] = await createVideos(1, "general");
    for(const scope of ["ielts", "invalid"]) await request(app.getHttpServer()).post(`/videos/${id}/playback-access?scope=${scope}`).set("Authorization", authorization).expect(400);
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
