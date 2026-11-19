import { questionTypeLabel, trapTypeLabel } from "./passage-labels";

describe("passage-labels", () => {
  it("bilinen tuzak türleri Türkçe etiketlenir; doğru şıkta (null) ya da boş etiket yok", () => {
    expect(trapTypeLabel("extreme")).toBe("Aşırı genelleme");
    expect(trapTypeLabel("notstated")).toBe("Metinde yok");
    expect(trapTypeLabel(null)).toBeNull();
    expect(trapTypeLabel("  ")).toBeNull();
  });

  it("bilinmeyen (yeni) tür çökmez, okunur hâle getirilir", () => {
    expect(trapTypeLabel("scope-shift")).toBe("Scope shift");
    expect(questionTypeLabel("main-idea")).toBe("Ana fikir");
    expect(questionTypeLabel("writer-attitude")).toBe("Writer attitude");
    expect(questionTypeLabel("")).toBe("Soru");
  });
});
