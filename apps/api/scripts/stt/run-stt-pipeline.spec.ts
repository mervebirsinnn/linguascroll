import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import {
  assertAllowedExtension,
  assertOutputDirAvailable,
  parseArgs,
  PipelineError,
  removeDirSafe,
  resolveInputPath,
  resolveOutputDir,
  slugify,
} from "./run-stt-pipeline";

describe("parseArgs", () => {
  it("--input değerini okur", () => {
    expect(parseArgs(["--input", "video.mp4"]).input).toBe("video.mp4");
  });

  it("--keep-temp bayrağını true yapar, verilmezse false", () => {
    expect(parseArgs(["--keep-temp"]).keepTemp).toBe(true);
    expect(parseArgs([]).keepTemp).toBe(false);
  });

  it("--content-id değerini okur", () => {
    expect(parseArgs(["--content-id", "my-video"]).contentId).toBe("my-video");
  });

  it("bilinmeyen bir argüman için PipelineError fırlatır", () => {
    expect(() => parseArgs(["--unknown"])).toThrow(PipelineError);
  });
});

describe("slugify", () => {
  it("uzantıyı kaldırır ve küçük harfe çevirir", () => {
    expect(slugify("My Real Video.MP4")).toBe("my-real-video");
  });

  it("özel karakterleri tire ile değiştirir, baştaki/sondaki tireleri temizler", () => {
    expect(slugify("__weird!!name__.mov")).toBe("weird-name");
  });

  it("boş/anlamsız isimler için fallback 'content' döner", () => {
    expect(slugify("....mp4")).toBe("content");
  });
});

describe("resolveInputPath", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "stt-input-test-"));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("--input verilmişse ve dosya varsa onu döner", () => {
    const filePath = path.join(tmpDir, "video.mp4");
    fs.writeFileSync(filePath, "");
    expect(resolveInputPath(filePath, tmpDir)).toBe(filePath);
  });

  it("--input verilmiş ama dosya yoksa PipelineError fırlatır", () => {
    expect(() => resolveInputPath(path.join(tmpDir, "missing.mp4"), tmpDir)).toThrow(PipelineError);
  });

  it("--input verilmemiş, klasörde TAM OLARAK bir dosya varsa onu otomatik seçer", () => {
    const filePath = path.join(tmpDir, "only-one.mp4");
    fs.writeFileSync(filePath, "");
    expect(resolveInputPath(undefined, tmpDir)).toBe(filePath);
  });

  it(".gitkeep dosyasını aday olarak SAYMAZ", () => {
    fs.writeFileSync(path.join(tmpDir, ".gitkeep"), "");
    expect(() => resolveInputPath(undefined, tmpDir)).toThrow(PipelineError);
  });

  it("klasör boşsa (video yok) PipelineError fırlatır", () => {
    expect(() => resolveInputPath(undefined, tmpDir)).toThrow(PipelineError);
  });

  it("klasörde birden fazla dosya varsa PipelineError fırlatır", () => {
    fs.writeFileSync(path.join(tmpDir, "a.mp4"), "");
    fs.writeFileSync(path.join(tmpDir, "b.mp4"), "");
    expect(() => resolveInputPath(undefined, tmpDir)).toThrow(PipelineError);
  });

  it("madde 2 — --input verilmiş ama uzantı allowlist dışıysa (örn. .exe) PipelineError fırlatır", () => {
    const filePath = path.join(tmpDir, "not-a-video.exe");
    fs.writeFileSync(filePath, "");
    expect(() => resolveInputPath(filePath, tmpDir)).toThrow(PipelineError);
  });

  it("madde 2 — auto-detect, allowlist dışı bir dosyayı (örn. bir .txt notu) YOK SAYAR, tek gerçek videoyu seçer", () => {
    fs.writeFileSync(path.join(tmpDir, "notes.txt"), "bu bir video değil");
    const videoPath = path.join(tmpDir, "real.mp4");
    fs.writeFileSync(videoPath, "");
    expect(resolveInputPath(undefined, tmpDir)).toBe(videoPath);
  });

  it("madde 2 — input bir dizinse (normal dosya değilse) PipelineError fırlatır", () => {
    const dirPath = path.join(tmpDir, "a-directory.mp4");
    fs.mkdirSync(dirPath);
    expect(() => resolveInputPath(dirPath, tmpDir)).toThrow(PipelineError);
  });
});

describe("assertAllowedExtension — madde 2: allowlist", () => {
  it("izin verilen uzantıları (mp4/mov/mkv/webm/m4v) kabul eder", () => {
    for (const ext of [".mp4", ".mov", ".mkv", ".webm", ".m4v", ".MP4"]) {
      expect(() => assertAllowedExtension(`video${ext}`)).not.toThrow();
    }
  });

  it("izin verilmeyen bir uzantıyı (.exe, .txt, uzantısız) reddeder", () => {
    for (const name of ["video.exe", "video.txt", "video"]) {
      expect(() => assertAllowedExtension(name)).toThrow(PipelineError);
    }
  });
});

describe("resolveOutputDir — madde 2: content-id path injection koruması", () => {
  const outputRoot = path.join(os.tmpdir(), "stt-output-root-fixture");

  it("geçerli bir content-id için output-root altında bir path döner", () => {
    expect(resolveOutputDir("my-video-1", outputRoot)).toBe(path.join(outputRoot, "my-video-1"));
  });

  it.each([
    ["../escape", "üst dizine çıkış (..)"],
    ["a/b", "path separator (/)"],
    ["a\\b", "path separator (\\)"],
    ["", "boş string"],
    ["UPPERCASE", "büyük harf"],
    ["-leading-dash", "tire ile başlama"],
    ["a".repeat(65), "64 karakterden uzun"],
    ["/etc/passwd", "absolute-path injection"],
  ])("content-id %s (%s) için PipelineError fırlatır", (badId) => {
    expect(() => resolveOutputDir(badId, outputRoot)).toThrow(PipelineError);
  });
});

describe("removeDirSafe — madde 4: double-cleanup hata üretmez", () => {
  it("var olan bir dizini gerçekten siler", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "stt-removedir-test-"));
    fs.writeFileSync(path.join(dir, "file.txt"), "x");

    removeDirSafe(dir);

    expect(fs.existsSync(dir)).toBe(false);
  });

  it("aynı (artık var olmayan) dizin üzerinde İKİNCİ kez çağrılınca hata FIRLATMAZ", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "stt-removedir-test-"));

    removeDirSafe(dir);
    expect(() => removeDirSafe(dir)).not.toThrow();
  });

  it("hiç var olmamış bir dizin için de hata fırlatmaz", () => {
    expect(() => removeDirSafe(path.join(os.tmpdir(), "never-existed-" + Date.now()))).not.toThrow();
  });
});

describe("assertOutputDirAvailable — madde 5: sessiz overwrite yok", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "stt-output-test-"));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("output klasörü yoksa sessizce geçer (hata fırlatmaz)", () => {
    expect(() => assertOutputDirAvailable(path.join(tmpDir, "does-not-exist"))).not.toThrow();
  });

  it("output klasörü ZATEN varsa PipelineError fırlatır — overwrite etmez", () => {
    const existingDir = path.join(tmpDir, "already-here");
    fs.mkdirSync(existingDir);
    fs.writeFileSync(path.join(existingDir, "draft.json"), '{"marker":"do-not-overwrite"}');

    expect(() => assertOutputDirAvailable(existingDir)).toThrow(PipelineError);

    // İçerik dokunulmamış kaldı mı — gerçek "silinmedi/overwrite edilmedi" kanıtı.
    expect(fs.readFileSync(path.join(existingDir, "draft.json"), "utf-8")).toContain("do-not-overwrite");
  });
});
