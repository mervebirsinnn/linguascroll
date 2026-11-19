import { gatedEntry, parseFlag, PASSAGES_ENABLED, shouldRenderPassages } from "./feature-flags";

describe("feature-flags", () => {
  it("parseFlag: yalnız 'true' açık; tanımsız/boş/'false'/'1'/'yes' KAPALI; büyük-küçük harf ve boşluk önemsiz", () => {
    expect(parseFlag("true")).toBe(true);
    expect(parseFlag(" TRUE ")).toBe(true);
    expect(parseFlag(undefined)).toBe(false);
    expect(parseFlag("")).toBe(false);
    expect(parseFlag("false")).toBe(false);
    expect(parseFlag("1")).toBe(false);
    expect(parseFlag("yes")).toBe(false);
  });

  it("PASSAGES_ENABLED test ortamında (env tanımsız) KAPALI: varsayılan güvenli", () => {
    expect(process.env.EXPO_PUBLIC_PASSAGES_ENABLED).toBeUndefined();
    expect(PASSAGES_ENABLED).toBe(false);
  });

  it("gatedEntry: kapalıyken eylem verilmez (undefined → Feed butonu çizmez); açıkken aynı eylem döner", () => {
    const open = jest.fn();
    expect(gatedEntry(false, open)).toBeUndefined();
    expect(gatedEntry(true, open)).toBe(open);
  });

  it("shouldRenderPassages: bayrak kapalıyken mode 'passages' olsa bile çizilmez; açıkken yalnız o mode'da", () => {
    expect(shouldRenderPassages(false, "passages")).toBe(false);
    expect(shouldRenderPassages(true, "passages")).toBe(true);
    expect(shouldRenderPassages(true, "feed")).toBe(false);
    expect(shouldRenderPassages(true, "memory")).toBe(false);
  });
});
