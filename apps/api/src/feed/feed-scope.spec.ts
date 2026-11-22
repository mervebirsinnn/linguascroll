import { BadRequestException } from "@nestjs/common";
import { contentCategorySchema, feedScopeSchema } from "@linguascroll/shared-types";
import { FeedController } from "./feed.controller";
import type { FeedService } from "./feed.service";
import { CATEGORIES_OUTSIDE_MAIN_FEED, isIsolatedScope, MAIN_FEED_CATALOG_FILTER, resolveFeedScope, scopeToVideoFilter } from "./feed-scope";

describe("resolveFeedScope", () => {
  it("scope yoksa ve category de yoksa all (geriye uyum)", () => {
    expect(resolveFeedScope(undefined, undefined)).toBe("all");
  });

  it.each(["all", "animation", "ielts", "cabincrew"] as const)("açık scope=%s aynen geçer", (scope) => {
    expect(resolveFeedScope(scope, undefined)).toBe(scope);
  });

  it.each(["general", "IELTS", "ielts ", "", "speaking", "ielts,animation"])("bilinmeyen scope %p için 400", (scope) => {
    expect(() => resolveFeedScope(scope, undefined)).toThrow(BadRequestException);
  });

  it("scope, eski category parametresine göre önceliklidir", () => {
    expect(resolveFeedScope("ielts", "animation")).toBe("ielts");
  });

  it("eski mobile build'lerin category parametresi: general -> all (eski Akış), animation/ielts aynen", () => {
    expect(resolveFeedScope(undefined, "general")).toBe("all");
    expect(resolveFeedScope(undefined, "animation")).toBe("animation");
    expect(resolveFeedScope(undefined, "ielts")).toBe("ielts");
  });

  it.each(["all", "anime", "IELTS", ""])("bilinmeyen eski category %p için 400 (category=all geçerli DEĞİL)", (category) => {
    expect(() => resolveFeedScope(undefined, category)).toThrow(BadRequestException);
  });
});

describe("scopeToVideoFilter ve izole kategoriler (Cabin Crew)", () => {
  it("'all' izole kategorileri DIŞLAR; cabincrew yalnız kendi scope'unda görünür", () => {
    expect(CATEGORIES_OUTSIDE_MAIN_FEED).toEqual(["cabincrew"]);
    expect(scopeToVideoFilter("all")).toEqual(MAIN_FEED_CATALOG_FILTER);
    expect(scopeToVideoFilter("all").category).toBeUndefined();
    expect(scopeToVideoFilter("all").excludeCategories).toContain("cabincrew");
    expect(scopeToVideoFilter("cabincrew")).toEqual({ category: "cabincrew" });
    expect(scopeToVideoFilter("animation")).toEqual({ category: "animation" });
    expect(scopeToVideoFilter("ielts")).toEqual({ category: "ielts" });
  });

  it("izole scope tespiti: yalnız cabincrew izole", () => {
    expect(isIsolatedScope("cabincrew")).toBe(true);
    for (const scope of ["all", "animation", "ielts"] as const) expect(isIsolatedScope(scope)).toBe(false);
  });

  it("eski category=cabincrew parametresi de cabincrew scope'una çözülür", () => {
    expect(resolveFeedScope(undefined, "cabincrew")).toBe("cabincrew");
  });
});

describe("shared-types: ContentCategory ve FeedScope ayrımı", () => {
  it("ContentCategory persist edilen değerlerdir ve 'all' içermez", () => {
    expect(contentCategorySchema.options).toEqual(["general", "animation", "ielts", "cabincrew"]);
    expect(contentCategorySchema.safeParse("all").success).toBe(false);
  });

  it("FeedScope all | animation | ielts | cabincrew'dir; 'general' bir scope DEĞİLDİR, bilinmeyen değer geçersizdir", () => {
    for (const valid of ["all", "animation", "ielts", "cabincrew"]) expect(feedScopeSchema.safeParse(valid).success).toBe(true);
    for (const invalid of ["general", "speaking", "", "ALL"]) expect(feedScopeSchema.safeParse(invalid).success).toBe(false);
  });
});

describe("FeedController scope", () => {
  const getFeed = jest.fn().mockResolvedValue({ items: [], nextCursor: null });
  const controller = new FeedController({ getFeed } as unknown as FeedService);
  beforeEach(() => getFeed.mockClear());

  it("scope/category yoksa all ile çağrılır", async () => {
    await controller.getFeed("user");
    expect(getFeed).toHaveBeenCalledWith("user", undefined, { level: null, topics: [] }, "all", undefined, false, null);
  });

  it("ielts scope'u tercih sinyalinden bağımsız geçirir (level yalnızca sıralama sinyali)", async () => {
    await controller.getFeed("user", undefined, "C1", "travel", "ielts");
    expect(getFeed).toHaveBeenCalledWith("user", undefined, { level: "C1", topics: ["travel"] }, "ielts", undefined, false, null);
  });

  it("continuous yalnızca açık boolean metni kabul eder", () => {
    controller.getFeed("user",undefined,undefined,undefined,"all",undefined,undefined,"true");
    expect(getFeed).toHaveBeenLastCalledWith("user",undefined,{level:null,topics:[]},"all",undefined,true,null);
    for(const value of ["1", "", ["true", "true"]]) expect(() => controller.getFeed("user",undefined,undefined,undefined,"all",undefined,undefined,value)).toThrow(BadRequestException);
  });

  it("geçersiz scope service çağrılmadan 400", () => {
    expect(() => controller.getFeed("user", undefined, undefined, undefined, "speaking")).toThrow(BadRequestException);
    expect(getFeed).not.toHaveBeenCalled();
  });

  it("eski client'ın category=animation isteği animation scope'una gider", async () => {
    await controller.getFeed("user", undefined, undefined, undefined, undefined, "animation");
    expect(getFeed).toHaveBeenCalledWith("user", undefined, { level: null, topics: [] }, "animation", undefined, false, null);
  });

  it("sessionSeed doğrulanıp service'e iletilir; geçersiz/dizi seed service çağrılmadan 400", async () => {
    const seed = "0123456789abcdef0123456789abcdef";
    await controller.getFeed("user", undefined, undefined, undefined, "ielts", undefined, seed);
    expect(getFeed).toHaveBeenCalledWith("user", undefined, { level: null, topics: [] }, "ielts", seed, false, null);

    getFeed.mockClear();
    for (const bad of ["", "ABC", "a".repeat(33), "a".repeat(5000), [seed, seed]]) {
      expect(() => controller.getFeed("user", undefined, undefined, undefined, "ielts", undefined, bad)).toThrow();
    }
    expect(getFeed).not.toHaveBeenCalled();
  });
});
