import { buildOriginalVideoStorageKey, isOwnedOriginalVideoStorageKey, isValidContentId } from "./build-storage-key";

describe("buildOriginalVideoStorageKey", () => {
  it("originals/<contentId>/<uuid>.mp4 şeklinde deterministik bir key üretir", () => {
    const key = buildOriginalVideoStorageKey("b1-cafe-order", "9f8e7d6c-1111-2222-3333-444455556666");
    expect(key).toBe("originals/b1-cafe-order/9f8e7d6c-1111-2222-3333-444455556666.mp4");
  });

  it("aynı contentId + farklı uuid farklı key üretir (raw dosya adı hiçbir zaman key'e girmiyor)", () => {
    const keyA = buildOriginalVideoStorageKey("b1-cafe-order", "uuid-a");
    const keyB = buildOriginalVideoStorageKey("b1-cafe-order", "uuid-b");
    expect(keyA).not.toBe(keyB);
  });
});

describe("isValidContentId", () => {
  it.each(["b1final2", "c1-final-3", "a1"])('"%s" gibi kebab-case slug\'ları kabul eder', (contentId) => {
    expect(isValidContentId(contentId)).toBe(true);
  });

  it.each(["", "B1Final2", "has space", "../etc/passwd", "trailing-", "-leading"])(
    '"%s" gibi geçersiz değerleri reddeder',
    (contentId) => {
      expect(isValidContentId(contentId)).toBe(false);
    },
  );
});

describe("isOwnedOriginalVideoStorageKey", () => {
  it("contentId'nin kendi prefix'i altındaki geçerli bir uuid.mp4 key'ini kabul eder", () => {
    expect(isOwnedOriginalVideoStorageKey("b1-cafe-order", "originals/b1-cafe-order/9f8e7d6c-1111-2222-3333-444455556666.mp4")).toBe(
      true,
    );
  });

  it("başka bir contentId'nin prefix'i altındaki bir key'i reddeder", () => {
    expect(isOwnedOriginalVideoStorageKey("b1-cafe-order", "originals/other-content/9f8e7d6c-1111-2222-3333-444455556666.mp4")).toBe(
      false,
    );
  });

  it("prefix eşleşse bile suffix'i uuid.mp4 şeklinde olmayan bir key'i reddeder (ör. path traversal denemesi)", () => {
    expect(isOwnedOriginalVideoStorageKey("b1-cafe-order", "originals/b1-cafe-order/../other-content/x.mp4")).toBe(false);
  });

  it("tamamen alakasız/keyfi bir R2 key'ini reddeder", () => {
    expect(isOwnedOriginalVideoStorageKey("b1-cafe-order", "some/other/bucket/path.mp4")).toBe(false);
  });
});
