import { BadRequestException } from "@nestjs/common";
import { contentCategorySchema, feedScopeSchema } from "@linguascroll/shared-types";
import { FeedController } from "./feed.controller";
import type { FeedService } from "./feed.service";
import { resolveFeedScope, scopeToCategoryFilter } from "./feed-scope";

describe("resolveFeedScope", () => {
  it("scope yoksa ve category de yoksa all (geriye uyum)", () => {
    expect(resolveFeedScope(undefined, undefined)).toBe("all");
  });

  it.each(["all", "animation", "ielts"] as const)("açık scope=%s aynen geçer", (scope) => {
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

describe("scopeToCategoryFilter", () => {
  it("all için DB predicate'i YOK; animation/ielts için tek kategori", () => {
    expect(scopeToCategoryFilter("all")).toBeUndefined();
    expect(scopeToCategoryFilter("animation")).toBe("animation");
    expect(scopeToCategoryFilter("ielts")).toBe("ielts");
  });
});

describe("shared-types: ContentCategory ve FeedScope ayrımı", () => {
  it("ContentCategory persist edilen değerlerdir ve 'all' içermez", () => {
    expect(contentCategorySchema.options).toEqual(["general", "animation", "ielts"]);
    expect(contentCategorySchema.safeParse("all").success).toBe(false);
  });

  it("FeedScope all | animation | ielts'tir; 'general' bir scope DEĞİLDİR, bilinmeyen değer geçersizdir", () => {
    for (const valid of ["all", "animation", "ielts"]) expect(feedScopeSchema.safeParse(valid).success).toBe(true);
    for (const invalid of ["general", "speaking", "", "ALL"]) expect(feedScopeSchema.safeParse(invalid).success).toBe(false);
  });
});

describe("FeedController scope", () => {
  const getFeed = jest.fn().mockResolvedValue({ items: [], nextCursor: null });
  const controller = new FeedController({ getFeed } as unknown as FeedService);
  beforeEach(() => getFeed.mockClear());

  it("scope/category yoksa all ile çağrılır", async () => {
    await controller.getFeed("user");
    expect(getFeed).toHaveBeenCalledWith("user", undefined, { level: null, topics: [] }, "all", undefined);
  });

  it("ielts scope'u tercih sinyalinden bağımsız geçirir (level yalnızca sıralama sinyali)", async () => {
    await controller.getFeed("user", undefined, "C1", "travel", "ielts");
    expect(getFeed).toHaveBeenCalledWith("user", undefined, { level: "C1", topics: ["travel"] }, "ielts", undefined);
  });

  it("geçersiz scope service çağrılmadan 400", () => {
    expect(() => controller.getFeed("user", undefined, undefined, undefined, "speaking")).toThrow(BadRequestException);
    expect(getFeed).not.toHaveBeenCalled();
  });

  it("eski client'ın category=animation isteği animation scope'una gider", async () => {
    await controller.getFeed("user", undefined, undefined, undefined, undefined, "animation");
    expect(getFeed).toHaveBeenCalledWith("user", undefined, { level: null, topics: [] }, "animation", undefined);
  });

  it("sessionSeed doğrulanıp service'e iletilir; geçersiz/dizi seed service çağrılmadan 400", async () => {
    const seed = "0123456789abcdef0123456789abcdef";
    await controller.getFeed("user", undefined, undefined, undefined, "ielts", undefined, seed);
    expect(getFeed).toHaveBeenCalledWith("user", undefined, { level: null, topics: [] }, "ielts", seed);

    getFeed.mockClear();
    for (const bad of ["", "ABC", "a".repeat(33), "a".repeat(5000), [seed, seed]]) {
      expect(() => controller.getFeed("user", undefined, undefined, undefined, "ielts", undefined, bad)).toThrow();
    }
    expect(getFeed).not.toHaveBeenCalled();
  });
});
