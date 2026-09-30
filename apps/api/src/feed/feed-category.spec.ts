import { BadRequestException } from "@nestjs/common";
import { FeedController } from "./feed.controller";
import type { FeedService } from "./feed.service";

describe("Feed category query", () => {
  const getFeed = jest.fn().mockResolvedValue({ items: [], nextCursor: null });
  const controller = new FeedController({ getFeed } as unknown as FeedService);
  beforeEach(() => getFeed.mockClear());

  it("eski kategori belirtmeyen client general akışına gider", async () => {
    await controller.getFeed("user");
    expect(getFeed).toHaveBeenCalledWith("user", undefined, { level: null, topics: [] }, "general");
  });
  it("animation seçimini tercih sinyalinden bağımsız geçirir", async () => {
    await controller.getFeed("user", undefined, "B1", "travel", "animation");
    expect(getFeed).toHaveBeenCalledWith("user", undefined, { level: "B1", topics: ["travel"] }, "animation");
  });
  it("bilinmeyen kategoriyle sessizce başka bir akış döndürmez", () => {
    expect(() => controller.getFeed("user", undefined, undefined, undefined, "anime" as string)).toThrow(BadRequestException);
    expect(getFeed).not.toHaveBeenCalled();
  });
});
