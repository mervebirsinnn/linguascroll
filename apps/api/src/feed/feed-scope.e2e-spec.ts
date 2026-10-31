import type { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { feedPageSchema, type FeedPage } from "@linguascroll/shared-types";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import type { Pool } from "pg";
import { createHmac, randomUUID } from "node:crypto";
import request from "supertest";
import { AppModule } from "../app.module";
import { bearerFor, withTestAuth } from "../auth/test-auth";
import { usersTable } from "../users/users.schema";
import { createTestDatabaseConnection, truncateTestTables } from "../videos/test-database";
import { videosTable } from "../videos/videos.schema";

const SEED_A = "0123456789abcdef0123456789abcdef";
const SEED_B = "fedcba9876543210fedcba9876543210";

describe("GET /feed?scope= (e2e, gerçek Postgres → Repository → FeedService → Controller → HTTP)", () => {
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

  const attribution = { title: "t", credit: "c", sourceUrl: "https://example.com/s", license: "CC BY 3.0", licenseUrl: "https://example.com/l", changes: "x" };
  let next = 1;

  async function createUser(): Promise<string> {
    // 2026-10-27 — firebase_uid = id: test token'ı (bearerFor(userId)) bu kullanıcıya çözülür.
    const id = randomUUID();
    const [user] = await db.insert(usersTable).values({ id, firebaseUid: id }).returning();
    if (!user) throw new Error("kullanıcı insert edilemedi");
    return user.id;
  }

  async function createVideo(category: "general" | "animation" | "ielts", cefrLevel = "A1"): Promise<string> {
    const [video] = await db
      .insert(videosTable)
      .values({
        learningLanguage: "en",
        cefrLevel,
        muxAssetId: `local-category-e2e-${next++}`,
        topic: "travel",
        durationMs: 10000,
        category,
        attribution: category === "animation" ? attribution : null,
      })
      .returning();
    if (!video) throw new Error("video insert edilemedi");
    return video.id;
  }

  async function get(userId: string, params: Record<string, string> = {}): Promise<request.Response> {
    // Cursor'suz istek seed ister; cursor'lu istek seed'i imzalı cursor'dan alır (query'de verilirse AYNI olmalı).
    const seedParams: Record<string, string> = params.cursor ? {} : { sessionSeed: SEED_A };
    return request(app.getHttpServer()).get(`/feed?${new URLSearchParams({ ...seedParams, ...params }).toString()}`).set("Authorization", bearerFor(userId));
  }

  function ids(page: FeedPage): string[] {
    return page.items.flatMap((item) => (item.type === "video" ? [item.video.id] : []));
  }

  it("scope yok / all: general + animation + ielts HEPSİ gelir (Akış = bütün kategoriler); category=general artık yalnızca-general anlamına gelmez", async () => {
    const userId = await createUser();
    const general = await createVideo("general");
    const animation = await createVideo("animation");
    const ielts = await createVideo("ielts", "C1");
    const everything = [general, animation, ielts].sort();

    expect(ids(feedPageSchema.parse((await get(userId)).body)).sort()).toEqual(everything);
    expect(ids(feedPageSchema.parse((await get(userId, { scope: "all" })).body)).sort()).toEqual(everything);
    // Yayındaki eski mobile build'in "Akış" isteği (category=general) bilinçli olarak all'a eşlenir.
    expect(ids(feedPageSchema.parse((await get(userId, { category: "general" })).body)).sort()).toEqual(everything);
  });

  it("scope=ielts yalnızca IELTS, scope=animation yalnızca animasyon getirir; eski category=animation/ielts aynı sonucu verir", async () => {
    const userId = await createUser();
    await createVideo("general");
    const animation = await createVideo("animation");
    const ielts = await createVideo("ielts", "C1");

    expect(ids(feedPageSchema.parse((await get(userId, { scope: "ielts" })).body))).toEqual([ielts]);
    expect(ids(feedPageSchema.parse((await get(userId, { scope: "animation" })).body))).toEqual([animation]);
    expect(ids(feedPageSchema.parse((await get(userId, { category: "ielts" })).body))).toEqual([ielts]);
    expect(ids(feedPageSchema.parse((await get(userId, { category: "animation" })).body))).toEqual([animation]);
  });

  it("IELTS içeriği kendi gerçek cefrLevel'ıyla döner (kategori seviyeyi belirlemez); level tercihi filtre değil sıralama sinyalidir", async () => {
    const userId = await createUser();
    await createVideo("general", "B1");
    const c2 = await createVideo("ielts", "C2");
    const a2 = await createVideo("ielts", "A2");

    const response = await get(userId, { scope: "ielts", level: "B1" });
    expect(response.status).toBe(200);
    const page = feedPageSchema.parse(response.body);
    expect(ids(page).sort()).toEqual([c2, a2].sort());
    const levelById = new Map(page.items.flatMap((item) => (item.type === "video" ? [[item.video.id, item.video.cefrLevel] as const] : [])));
    expect(levelById.get(c2)).toBe("C2");
    expect(levelById.get(a2)).toBe("A2");
  });

  it.each([
    { scope: "speaking" },
    { scope: "IELTS" },
    { scope: "general" },
    { scope: "" },
    { category: "all" },
    { category: "anime" },
  ] as Record<string, string>[])("geçersiz parametre %j için 400 döner", async (params) => {
    const userId = await createUser();
    await createVideo("ielts");
    expect((await get(userId, params)).status).toBe(400);
  });

  it("IELTS ikinci sayfası duplicate/skip üretmez, kategori dışı sızdırmaz; response contract geçerli kalır", async () => {
    const userId = await createUser();
    const ieltsIds: string[] = [];
    for (let i = 0; i < 16; i++) ieltsIds.push(await createVideo("ielts", i % 2 === 0 ? "B2" : "C1"));
    await createVideo("general");
    await createVideo("animation");

    const first = feedPageSchema.parse((await get(userId, { scope: "ielts" })).body);
    expect(first.nextCursor).not.toBeNull();
    const secondResponse = await get(userId, { scope: "ielts", cursor: first.nextCursor! });
    expect(secondResponse.status).toBe(200);
    const second = feedPageSchema.parse(secondResponse.body);

    const seen = [...ids(first), ...ids(second)];
    expect(new Set(seen).size).toBe(seen.length);
    expect([...seen].sort()).toEqual([...ieltsIds].sort());
  });

  it("all kapsamında sayfalama duplicate/skip üretmez ve üç kategoriden de içerik içerebilir", async () => {
    const userId = await createUser();
    for (let i = 0; i < 12; i++) await createVideo("general");
    for (let i = 0; i < 12; i++) await createVideo("animation");
    for (let i = 0; i < 12; i++) await createVideo("ielts");

    const first = feedPageSchema.parse((await get(userId, { scope: "all" })).body);
    expect(first.nextCursor).not.toBeNull();
    const second = feedPageSchema.parse((await get(userId, { scope: "all", cursor: first.nextCursor! })).body);
    const seen = [...ids(first), ...ids(second)];
    expect(new Set(seen).size).toBe(seen.length);

    const rows = await db.select({ id: videosTable.id, category: videosTable.category }).from(videosTable);
    const categoryById = new Map(rows.map((row) => [row.id, row.category]));
    expect(new Set(seen.map((id) => categoryById.get(id)))).toEqual(new Set(["general", "animation", "ielts"]));
  });

  it("başka scope'ta üretilmiş signed cursor yeniden kullanılamaz (400); eski v1 cursor da kontrollü 400 verir", async () => {
    const userId = await createUser();
    for (let i = 0; i < 16; i++) await createVideo("ielts");
    for (let i = 0; i < 16; i++) await createVideo("animation");
    for (let i = 0; i < 16; i++) await createVideo("general");

    const cursorOf = async (scope: string): Promise<string> => feedPageSchema.parse((await get(userId, { scope })).body).nextCursor!;
    const [allCursor, ieltsCursor, animationCursor] = [await cursorOf("all"), await cursorOf("ielts"), await cursorOf("animation")];

    expect((await get(userId, { scope: "animation", cursor: allCursor })).status).toBe(400);
    expect((await get(userId, { scope: "ielts", cursor: allCursor })).status).toBe(400);
    expect((await get(userId, { scope: "all", cursor: ieltsCursor })).status).toBe(400);
    expect((await get(userId, { scope: "all", cursor: animationCursor })).status).toBe(400);
    expect((await get(userId, { cursor: ieltsCursor })).status).toBe(400); // scope yok = all
    expect((await get(userId, { scope: "ielts", cursor: ieltsCursor })).status).toBe(200);

    const legacy = Buffer.from(JSON.stringify({ v: 1, userId, category: "ielts", plan: [], position: 0 }), "utf-8").toString("base64url");
    expect((await get(userId, { scope: "ielts", cursor: `${legacy}.bogus-signature` })).status).toBe(400);
  });

  describe("sessionSeed sınırı", () => {
    it.each([
      ["boş", { sessionSeed: "" }],
      ["kısa", { sessionSeed: "abc" }],
      ["büyük harf", { sessionSeed: "ABCDEF0123456789ABCDEF0123456789" }],
      ["hex olmayan", { sessionSeed: "z".repeat(32) }],
      ["33 karakter", { sessionSeed: "a".repeat(33) }],
      ["çok uzun (abuse)", { sessionSeed: "a".repeat(5000) }],
    ] as [string, Record<string, string>][])("%s sessionSeed → kontrollü 400", async (_name, extra) => {
      const userId = await createUser();
      await createVideo("ielts");
      const response = await request(app.getHttpServer()).get(`/feed?${new URLSearchParams({ scope: "all", ...extra }).toString()}`).set("Authorization", bearerFor(userId));
      expect(response.status).toBe(400);
    });

    it("seed'siz cursorsuz ESKİ client isteği 200; cursor v3 + sunucu seed'i (32 hex); eski client cursor ile devam eder, duplicate/skip yok", async () => {
      const userId = await createUser();
      for (let i = 0; i < 20; i++) await createVideo("ielts", "B2");
      const legacyGet = (params: Record<string, string>) => request(app.getHttpServer()).get(`/feed?${new URLSearchParams(params).toString()}`).set("Authorization", bearerFor(userId));

      const firstResponse = await legacyGet({ category: "ielts" }); // eski build: scope/sessionSeed yok
      expect(firstResponse.status).toBe(200);
      const first = feedPageSchema.parse(firstResponse.body);
      const payload = JSON.parse(Buffer.from(first.nextCursor!.split(".")[0] as string, "base64url").toString("utf-8"));
      expect(payload.v).toBe(3);
      expect(payload.sessionSeed).toMatch(/^[0-9a-f]{32}$/);

      const secondResponse = await legacyGet({ category: "ielts", cursor: first.nextCursor! });
      expect(secondResponse.status).toBe(200);
      const seen = [...ids(first), ...ids(feedPageSchema.parse(secondResponse.body))];
      expect(new Set(seen).size).toBe(seen.length);
      expect(seen).toHaveLength(20);
    });

    it("yeni client seed'i cursor'da korunur (v3, gönderilen seed)", async () => {
      const userId = await createUser();
      for (let i = 0; i < 20; i++) await createVideo("ielts");
      const first = feedPageSchema.parse((await get(userId, { scope: "ielts", sessionSeed: SEED_B })).body);
      const payload = JSON.parse(Buffer.from(first.nextCursor!.split(".")[0] as string, "base64url").toString("utf-8"));
      expect(payload).toMatchObject({ v: 3, sessionSeed: SEED_B, scope: "ielts" });
    });

    it("@deprecated v2 cursor (eski API'den kalma) devam eder: aynı frozen plan; sonraki cursor v2; bozuk imza 400", async () => {
      const userId = await createUser();
      for (let i = 0; i < 40; i++) await createVideo("ielts");
      const first = feedPageSchema.parse((await get(userId, { scope: "ielts" })).body);
      const v3 = JSON.parse(Buffer.from(first.nextCursor!.split(".")[0] as string, "base64url").toString("utf-8"));
      const v2payload = { v: 2, userId, scope: "ielts", plan: v3.plan, position: v3.position };
      const b64 = Buffer.from(JSON.stringify(v2payload), "utf-8").toString("base64url");
      const sig = createHmac("sha256", process.env.FEED_CURSOR_SECRET as string).update(b64).digest("base64url");

      const viaV2 = await get(userId, { scope: "ielts", cursor: `${b64}.${sig}` });
      expect(viaV2.status).toBe(200);
      const viaV3 = await get(userId, { scope: "ielts", cursor: first.nextCursor! });
      expect(ids(feedPageSchema.parse(viaV2.body))).toEqual(ids(feedPageSchema.parse(viaV3.body)));
      const nextV2 = feedPageSchema.parse(viaV2.body).nextCursor;
      if (nextV2) {
        expect(JSON.parse(Buffer.from(nextV2.split(".")[0] as string, "base64url").toString("utf-8")).v).toBe(2);
      }
      expect((await get(userId, { scope: "ielts", cursor: `${b64}.${sig.slice(2)}zz` })).status).toBe(400);
    });

    it("tekrarlı sessionSeed param'ı (dizi) 400 verir", async () => {
      const userId = await createUser();
      const response = await request(app.getHttpServer()).get(`/feed?sessionSeed=${SEED_A}&sessionSeed=${SEED_B}`).set("Authorization", bearerFor(userId));
      expect(response.status).toBe(400);
    });

    it("aynı seed → aynı ilk sayfa (retry); farklı seed → farklı sıra; aynı seed ile iki sayfa duplicate/skip üretmez", async () => {
      const userId = await createUser();
      for (let i = 0; i < 20; i++) await createVideo("ielts", "B2");
      const page = async (seed: string) => feedPageSchema.parse((await get(userId, { scope: "ielts", sessionSeed: seed })).body);

      const first = await page(SEED_A);
      expect(ids(await page(SEED_A))).toEqual(ids(first));
      expect(ids(await page(SEED_B))).not.toEqual(ids(first));

      const second = feedPageSchema.parse((await get(userId, { scope: "ielts", cursor: first.nextCursor! })).body);
      const seen = [...ids(first), ...ids(second)];
      expect(new Set(seen).size).toBe(seen.length);
      expect(seen).toHaveLength(20);
    });

    it("cursor + farklı seed → 400; cursor + aynı seed → 200; seed query'de yoksa cursor'daki kullanılır", async () => {
      const userId = await createUser();
      for (let i = 0; i < 20; i++) await createVideo("ielts");
      const first = feedPageSchema.parse((await get(userId, { scope: "ielts" })).body);
      const withCursor = (extra: Record<string, string>) => get(userId, { scope: "ielts", cursor: first.nextCursor!, ...extra });
      expect((await withCursor({ sessionSeed: SEED_B })).status).toBe(400);
      expect((await withCursor({ sessionSeed: SEED_A })).status).toBe(200);
      expect((await withCursor({})).status).toBe(200);
      expect((await withCursor({ sessionSeed: "bad" })).status).toBe(400);
    });
  });
});
