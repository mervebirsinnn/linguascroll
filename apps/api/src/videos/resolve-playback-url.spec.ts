import { resolvePlaybackUrl } from "./resolve-playback-url";

describe("resolvePlaybackUrl", () => {
  it("local-<slug> muxAssetId'sini <slug>.mp4 dosyasına çözer", () => {
    expect(resolvePlaybackUrl("local-dog-three-words", "http://localhost:3000")).toBe(
      "http://localhost:3000/media/dog-three-words.mp4",
    );
  });

  it("mediaBaseUrl farklı bir origin olsa da (path prefix hariç, `/media/...` origin'e göre absolute) doğru URL'i üretir", () => {
    // `new URL("/media/x", base)` standart WHATWG semantiği: baştaki "/" origin'e
    // göre absolute'tür, base'in kendi path'ini (burada "/base/") EZER — bu,
    // resolvePlaybackUrl'ün DEĞİL, `new URL()`'in davranışı; test bunu
    // olduğu gibi belgeliyor.
    expect(resolvePlaybackUrl("local-common-mistakes", "https://cdn.example.com/base/")).toBe(
      "https://cdn.example.com/media/common-mistakes.mp4",
    );
  });

  it("\"local-\" öneki olmayan bir muxAssetId için açıkça throw eder", () => {
    expect(() => resolvePlaybackUrl("mock-mux-asset-1", "http://localhost:3000")).toThrow(
      /Bilinmeyen\/geçersiz muxAssetId/,
    );
  });

  it("desene uymayan karakterler (büyük harf, alt çizgi) içeren bir muxAssetId için throw eder", () => {
    expect(() => resolvePlaybackUrl("local-Dog_Three_Words", "http://localhost:3000")).toThrow(
      /Bilinmeyen\/geçersiz muxAssetId/,
    );
  });

  it("boş string için throw eder", () => {
    expect(() => resolvePlaybackUrl("", "http://localhost:3000")).toThrow(/Bilinmeyen\/geçersiz muxAssetId/);
  });
});
