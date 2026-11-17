import { formatVideoTime, seekTimeFromTap } from "./video-progress";

describe("seekTimeFromTap", () => {
  it("dokunma konumunu video süresine orantılı çevirir", () => {
    expect(seekTimeFromTap(100, 400, 20)).toBe(5);
    expect(seekTimeFromTap(300, 400, 20)).toBe(15);
  });

  it("bandın dışındaki koordinatları video sınırlarına sıkıştırır", () => {
    expect(seekTimeFromTap(-20, 400, 20)).toBe(0);
    expect(seekTimeFromTap(500, 400, 20)).toBe(20);
  });

  it("geçersiz ölçüm veya süre için güvenli biçimde sıfır döner", () => {
    expect(seekTimeFromTap(10, 0, 20)).toBe(0);
    expect(seekTimeFromTap(10, 100, 0)).toBe(0);
    expect(seekTimeFromTap(Number.NaN, 100, 20)).toBe(0);
  });
});

describe("formatVideoTime", () => {
  it("saniyeyi dakika:saniye biçiminde gösterir", () => {
    expect(formatVideoTime(5.9)).toBe("0:05");
    expect(formatVideoTime(65)).toBe("1:05");
  });
});
