import type { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { currentUserSchema } from "@linguascroll/shared-types";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import type { Pool } from "pg";
import request from "supertest";
import { AppModule } from "../app.module";
import { bearerFor, withTestAuth } from "../auth/test-auth";
import { createTestDatabaseConnection, truncateTestTables } from "../videos/test-database";

describe("GET /me + kimlik doğrulama (e2e, gerçek Postgres)", () => {
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

  it("token yoksa 401", async () => {
    expect((await request(app.getHttpServer()).get("/me")).status).toBe(401);
  });

  it("geçersiz token 401", async () => {
    const response = await request(app.getHttpServer()).get("/me").set("Authorization", "Bearer bozuk-token");
    expect(response.status).toBe(401);
  });

  it("ilk girişte backend kullanıcısı yaratılır; aynı hesap her seferinde AYNI sabit id'yi alır", async () => {
    const first = await request(app.getHttpServer()).get("/me").set("Authorization", bearerFor("firebase-uid-1"));
    const second = await request(app.getHttpServer()).get("/me").set("Authorization", bearerFor("firebase-uid-1"));

    expect(first.status).toBe(200);
    expect(currentUserSchema.parse(first.body).userId).toBe(currentUserSchema.parse(second.body).userId);
  });

  it("farklı hesap farklı backend id'si alır (cihaz/oturum değişse de kimlik hesaba bağlı)", async () => {
    const a = await request(app.getHttpServer()).get("/me").set("Authorization", bearerFor("firebase-uid-a"));
    const b = await request(app.getHttpServer()).get("/me").set("Authorization", bearerFor("firebase-uid-b"));
    expect(a.body.userId).not.toBe(b.body.userId);
  });

  it("eski anonim uçlar kaldırıldı: POST /users/anonymous ve GET /users/:id/exists 404", async () => {
    expect((await request(app.getHttpServer()).post("/users/anonymous")).status).toBe(404);
    expect((await request(app.getHttpServer()).get("/users/00000000-0000-4000-8000-000000000001/exists")).status).toBe(404);
  });
});
