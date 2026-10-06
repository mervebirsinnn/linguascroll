import { eq } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import type { Pool } from "pg";
import { createTestDatabaseConnection, truncateTestTables } from "../videos/test-database";
import { applyGlossFixes, loadGlossFixes } from "./fix-english-glosses";
import { wordsTable } from "./words.schema";

describe("applyGlossFixes (integration, gerçek Postgres)", () => {
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

  async function insertWord(lemma: string, gloss: string): Promise<string> {
    const [row] = await db.insert(wordsTable).values({ language: "en", lemma, gloss }).returning({ id: wordsTable.id });
    if (!row) throw new Error("Beklenen kelime insert edilemedi");
    return row.id;
  }

  async function glossOf(id: string): Promise<string | undefined> {
    const [row] = await db.select({ gloss: wordsTable.gloss }).from(wordsTable).where(eq(wordsTable.id, id));
    return row?.gloss;
  }

  it("gloss HÂLÂ tam olarak eski İngilizce metinse Türkçesiyle değiştirir", async () => {
    const id = await insertWord("clarify", "to make something clear or easier to understand");

    const results = await applyGlossFixes(db, [{ lemma: "clarify", from: "to make something clear or easier to understand", to: "açıklığa kavuşturmak" }]);

    expect(results).toEqual([{ lemma: "clarify", rowsUpdated: 1 }]);
    expect(await glossOf(id)).toBe("açıklığa kavuşturmak");
  });

  it("elle düzeltilmiş (artık eski metin olmayan) bir satıra ve başka bir kelimeye DOKUNMAZ", async () => {
    const alreadyTurkish = await insertWord("clarify", "netleştirmek");
    const otherWord = await insertWord("guess", "to try to form an opinion or give an answer without clear facts");

    const results = await applyGlossFixes(db, [{ lemma: "clarify", from: "to make something clear or easier to understand", to: "açıklığa kavuşturmak" }]);

    expect(results).toEqual([{ lemma: "clarify", rowsUpdated: 0 }]);
    expect(await glossOf(alreadyTurkish)).toBe("netleştirmek");
    expect(await glossOf(otherWord)).toBe("to try to form an opinion or give an answer without clear facts");
  });

  it("tekrar çalıştırmak güvenli (idempotent): ikinci çalıştırma hiçbir satırı değiştirmez", async () => {
    await insertWord("insist", "to demand something forcefully, not accepting refusal");
    const fixes = [{ lemma: "insist", from: "to demand something forcefully, not accepting refusal", to: "ısrar etmek" }];

    const first = await applyGlossFixes(db, fixes);
    const second = await applyGlossFixes(db, fixes);

    expect(first[0]?.rowsUpdated).toBe(1);
    expect(second[0]?.rowsUpdated).toBe(0);
  });
});

describe("turkish-gloss-fixes.json (veri bütünlüğü)", () => {
  const fixes = loadGlossFixes();

  it("şemaya uyuyor ve boş değil", () => {
    expect(fixes.length).toBeGreaterThan(0);
  });

  it("her düzeltmenin hedefi (to) İngilizce görünmüyor: Türkçe karakter içeriyor ya da İngilizce stop-word içermiyor", () => {
    const english = /\b(the|to|of|a|an|or|who|that|is|being|someone|something|with|for|in|not|and|by|from|which)\b/i;
    const offenders = fixes.filter((f) => english.test(f.to.replace(/\([^)]*\)/g, "")) && !/[çğıöşüÇĞİÖŞÜ]/.test(f.to));
    expect(offenders).toEqual([]);
  });

  it("aynı (lemma, from) çifti iki kez bulunmuyor", () => {
    const keys = fixes.map((f) => `${f.lemma}||${f.from}`);
    expect(new Set(keys).size).toBe(keys.length);
  });
});
