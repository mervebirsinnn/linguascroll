import { decodePassageCursor, encodePassageCursor, InvalidPassageCursorError } from "./passage-cursor";

const ID = "00000000-0000-4000-8000-000000000001";

const b64 = (value: unknown): string => Buffer.from(typeof value === "string" ? value : JSON.stringify(value), "utf8").toString("base64url");

describe("passage cursor", () => {
  it("encode → decode aynı konumu ve seviyeyi geri verir", () => {
    const cursor = { level: "C1" as const, sortOrder: 7, id: ID };
    expect(decodePassageCursor(encodePassageCursor(cursor))).toEqual(cursor);
  });

  it("negatif sort_order da geçerli bir konumdur", () => {
    const cursor = { level: "B1" as const, sortOrder: -3, id: ID };
    expect(decodePassageCursor(encodePassageCursor(cursor))).toEqual(cursor);
  });

  it.each([
    ["JSON olmayan metin", b64("not json at all")],
    ["boş string", ""],
    ["yanlış sürüm", b64({ v: 2, level: "B2", sortOrder: 1, id: ID })],
    ["geçersiz seviye", b64({ v: 1, level: "A2", sortOrder: 1, id: ID })],
    ["kesirli sort_order", b64({ v: 1, level: "B2", sortOrder: 1.5, id: ID })],
    ["uuid olmayan id", b64({ v: 1, level: "B2", sortOrder: 1, id: "x" })],
    ["alan eksik", b64({ v: 1, level: "B2" })],
    ["dizi", b64([1, 2, 3])],
  ])("bozuk cursor reddedilir: %s", (_name, raw) => {
    expect(() => decodePassageCursor(raw)).toThrow(InvalidPassageCursorError);
  });
});
