import { eq } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import type { Pool } from "pg";
import { createTestDatabaseConnection, truncateTestTables } from "../videos/test-database";
import { videosTable } from "../videos/videos.schema";
import { backfillVideoCategories } from "./backfill-video-categories";

describe("backfillVideoCategories + videos.category constraint (integration, gerçek Postgres)", () => {
  let db: NodePgDatabase;
  let pool: Pool;

  beforeAll(() => {
    const connection = createTestDatabaseConnection();
    db = connection.db;
    pool = connection.pool;
  });
  beforeEach(async () => {
    await truncateTestTables(db);
  });
  afterAll(async () => {
    await pool.end();
  });

  const attribution = { title: "t", credit: "c", sourceUrl: "https://example.com/s", license: "CC BY 3.0", licenseUrl: "https://example.com/l", changes: "x" };
  async function insertVideo(muxAssetId: string, category: string, cefrLevel = "C1"): Promise<void> {
    await db.insert(videosTable).values({
      learningLanguage: "en",
      cefrLevel,
      muxAssetId,
      topic: "travel",
      durationMs: 10000,
      category,
      attribution: category === "animation" ? attribution : null,
    });
  }
  async function categoryOf(muxAssetId: string): Promise<{ category: string; cefrLevel: string }> {
    const [row] = await db.select({ category: videosTable.category, cefrLevel: videosTable.cefrLevel }).from(videosTable).where(eq(videosTable.muxAssetId, muxAssetId));
    if (!row) throw new Error("satır yok");
    return row;
  }

  it("DB kısıtı 'ielts' kategorisini kabul eder, bilinmeyen kategoriyi reddeder", async () => {
    await expect(insertVideo("local-ok", "ielts")).resolves.toBeUndefined();
    await expect(insertVideo("local-bad", "speaking")).rejects.toThrow();
  });

  it("sadece hâlâ general olan eşleşen satırı taşır; CEFR değerini değiştirmez; başka kategorideki satırın üzerine yazmaz", async () => {
    await insertVideo("local-a", "general", "A2");
    await insertVideo("local-b", "animation");
    await insertVideo("local-c", "general");
    const results = await backfillVideoCategories(
      db,
      [
        { muxAssetId: "local-a", category: "ielts" },
        { muxAssetId: "local-b", category: "ielts" },
        { muxAssetId: "local-yok", category: "ielts" },
      ],
      { dryRun: false },
    );
    expect(results.map((r) => r.status)).toEqual(["updated", "skipped-no-match-or-not-general", "skipped-no-match-or-not-general"]);
    expect(await categoryOf("local-a")).toEqual({ category: "ielts", cefrLevel: "A2" });
    expect((await categoryOf("local-b")).category).toBe("animation");
    expect((await categoryOf("local-c")).category).toBe("general");
  });

  it("dryRun DB'yi değiştirmez, sadece ne olacağını raporlar; ikinci gerçek çalıştırma idempotenttir", async () => {
    await insertVideo("local-a", "general");
    const assignments = [{ muxAssetId: "local-a", category: "ielts" as const }];
    expect((await backfillVideoCategories(db, assignments, { dryRun: true }))[0]!.status).toBe("would-update");
    expect((await categoryOf("local-a")).category).toBe("general");
    expect((await backfillVideoCategories(db, assignments, { dryRun: false }))[0]!.status).toBe("updated");
    expect((await backfillVideoCategories(db, assignments, { dryRun: false }))[0]!.status).toBe("skipped-no-match-or-not-general");
  });
});
