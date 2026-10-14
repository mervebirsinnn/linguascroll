import * as path from "node:path";
import { parseAnimationArgs } from "./publish-animation";

describe("animation publish CLI arguments", () => {
  it("tek bir güvenli katalog seçebilir", () => {
    const parsed = parseAnimationArgs(["--catalog", "sprite-fright", "--check"]);
    expect(parsed.catalogPath).toBe(path.resolve(__dirname, "../../content/animation/sprite-fright.json"));
    expect(parsed.checkOnly).toBe(true);
  });

  it.each(["../sprite-fright", "sprite/fright", "Sprite-Fright", "sprite_fright", ""])(
    "güvensiz katalog adını reddeder: %s",
    (catalog) => expect(() => parseAnimationArgs(["--catalog", catalog])).toThrow(),
  );
});
