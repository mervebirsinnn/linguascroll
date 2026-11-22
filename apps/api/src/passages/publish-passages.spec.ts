import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { validPack } from "./passage-pack-fixtures";
import { validatePacks } from "./passage-publisher";
import { describeTarget, readPackFiles } from "./publish-passages";

describe("publish-passages yardımcıları (DB'ye bağlanmaz)", () => {
  it("describeTarget parolayı ASLA yazdırmaz", () => {
    const target = describeTarget("postgres://user:s3cret@db.example.com:6543/linguascroll");
    expect(target).toBe("db.example.com:6543/linguascroll");
    expect(target).not.toContain("s3cret");
    expect(describeTarget("garbage")).toBe("(çözümlenemeyen DATABASE_URL)");
  });

  it("klasörden yalnız .json dosyalarını sıralı okur; bozuk JSON dosya adıyla patlar", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "passage-packs-"));
    try {
      fs.writeFileSync(path.join(dir, "b.json"), JSON.stringify(validPack({ slug: "b", sortOrder: 2 })));
      fs.writeFileSync(path.join(dir, "a.json"), JSON.stringify(validPack({ slug: "a" })));
      fs.writeFileSync(path.join(dir, "notes.txt"), "yok sayılır");
      const inputs = readPackFiles(dir);
      expect(inputs.map((input) => input.source)).toEqual(["a.json", "b.json"]);
      expect(validatePacks(inputs).issues).toEqual([]);

      fs.writeFileSync(path.join(dir, "c.json"), "{bozuk");
      expect(() => readPackFiles(dir)).toThrow(/c\.json: geçerli JSON değil/);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it("doğrulama sorunları hangi dosyadan geldiğini söyler ve küme kuralı dosyalar arasında çalışır", () => {
    const bad = validPack({ slug: "bad" });
    bad.editorial = { original: true, sources: [] };
    const { issues } = validatePacks([
      { source: "bad.json", json: bad },
      { source: "dup.json", json: validPack({ slug: "x" }) },
      { source: "dup2.json", json: validPack({ slug: "y" }) }, // aynı (B2, 1)
    ]);
    expect(issues.some((issue) => issue.path.startsWith("bad.json:") && issue.code === "editorial-sources-missing")).toBe(true);
    expect(issues.map((issue) => issue.code)).toContain("set-sort-order-duplicate");
  });
});
