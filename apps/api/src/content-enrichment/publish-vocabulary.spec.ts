import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { resolveExistingMuxAssetId, VocabularyPublishMappingError } from "./publish-vocabulary";

describe("resolveExistingMuxAssetId", () => {
  let tmpRoot: string;
  let mapPath: string;

  beforeEach(() => {
    tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "publish-vocabulary-test-"));
    mapPath = path.join(tmpRoot, "existing-content-mux-asset-map.json");
    fs.writeFileSync(
      mapPath,
      JSON.stringify({
        _readme: "test fixture — bir gerçek contentId değil, hiç lookup edilmemeli",
        a1final1: "local-dog-three-words",
      }),
      "utf-8",
    );
  });

  afterEach(() => {
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  });

  it("bilinen bir content-id için eşlenmiş muxAssetId'yi döndürür", () => {
    expect(resolveExistingMuxAssetId("a1final1", mapPath)).toBe("local-dog-three-words");
  });

  it("eşlemesi olmayan bir content-id için açıkça throw eder", () => {
    expect(() => resolveExistingMuxAssetId("unmapped-content-id", mapPath)).toThrow(VocabularyPublishMappingError);
  });

  it("map dosyası geçersiz JSON şeklindeyse (obje değilse) throw eder", () => {
    fs.writeFileSync(mapPath, JSON.stringify(["not", "an", "object"]), "utf-8");
    expect(() => resolveExistingMuxAssetId("a1final1", mapPath)).toThrow();
  });
});
