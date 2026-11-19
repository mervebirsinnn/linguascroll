import { publishAccessVerified, resetAccessEventsForTests, subscribeToAccessVerified } from "./access-events";

beforeEach(resetAccessEventsForTests);

describe("access-events", () => {
  it("her doğrulanmış sonuç iletilir (aynı değer tekrar yayınlansa da): gerekliliği tüketici gösterdiği duruma bakarak karar verir", () => {
    const seen: boolean[] = [];
    subscribeToAccessVerified("u1", (active) => seen.push(active));
    publishAccessVerified("u1", true);
    publishAccessVerified("u1", true);
    publishAccessVerified("u1", false);
    expect(seen).toEqual([true, true, false]);
  });

  it("kullanıcı başına ayrıdır: başka kullanıcının olayı dinleyiciye gitmez", () => {
    const one: boolean[] = [];
    const two: boolean[] = [];
    subscribeToAccessVerified("u1", (active) => one.push(active));
    subscribeToAccessVerified("u2", (active) => two.push(active));
    publishAccessVerified("u1", true);
    expect(one).toEqual([true]);
    expect(two).toEqual([]);
  });

  it("abonelikten çıkınca olay gelmez", () => {
    const seen: boolean[] = [];
    const unsubscribe = subscribeToAccessVerified("u1", (active) => seen.push(active));
    unsubscribe();
    publishAccessVerified("u1", true);
    expect(seen).toEqual([]);
  });
});
