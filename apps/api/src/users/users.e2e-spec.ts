import type { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { anonymousUserSchema } from "@linguascroll/shared-types";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import type { Pool } from "pg";
import request from "supertest";
import { AppModule } from "../app.module";
import { createTestDatabaseConnection, truncateTestTables } from "../videos/test-database";

describe("POST /users/anonymous (e2e, gerçek Postgres)", () => {
  let app: INestApplication;
  let db: NodePgDatabase;
  let pool: Pool;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
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

  it("201 ve gerçek anonymousUserSchema ile uyumlu bir uuid id döner", async () => {
    const response = await request(app.getHttpServer()).post("/users/anonymous");

    expect(response.status).toBe(201);
    const parsed = anonymousUserSchema.parse(response.body);
    expect(parsed.id).toEqual(expect.any(String));
  });

  it("her çağrı farklı bir id üretir (idempotent bir 'get-or-create' DEĞİL)", async () => {
    const first = await request(app.getHttpServer()).post("/users/anonymous");
    const second = await request(app.getHttpServer()).post("/users/anonymous");

    expect(first.body.id).not.toBe(second.body.id);
  });
});

describe("GET /users/:userId/exists (e2e, gerçek Postgres)", () => {
  let app: INestApplication;
  let db: NodePgDatabase;
  let pool: Pool;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
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

  it("gerçekten var olan bir userId için { exists: true } döner", async () => {
    const created = await request(app.getHttpServer()).post("/users/anonymous");
    const userId = created.body.id as string;

    const response = await request(app.getHttpServer()).get(`/users/${userId}/exists`);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ exists: true });
  });

  it("var olmayan (ama geçerli UUID biçimli) bir userId için { exists: false } döner — 404/500 DEĞİL", async () => {
    const response = await request(app.getHttpServer()).get("/users/00000000-0000-4000-8000-000000000099/exists");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ exists: false });
  });

  it("malformed userId (geçersiz UUID) için 400 döner", async () => {
    const response = await request(app.getHttpServer()).get("/users/not-a-uuid/exists");

    expect(response.status).toBe(400);
  });
});
