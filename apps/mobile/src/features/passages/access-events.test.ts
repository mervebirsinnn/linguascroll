import { publishAccessVerified, resetAccessEventsForTests, subscribeToAccessVerified } from "./access-events";

beforeEach(resetAccessEventsForTests);

describe("access-events", () => {
  it("ilk yayın her zaman iletilir; aynı değer tekrar yayınlanınca sessiz kalır, değişimde iletilir", () => {
    const seen: boolean[] = [];
    subscribeToAccessVerified("u1", (active) => seen.push(active));
    publishAccessVerified("u1", false);
    publishAccessVerified("u1", false);
    publishAccessVerified("u1", true);
    publishAccessVerified("u1", true);
    publishAccessVerified("u1", false);
    expect(seen).toEqual([false, true, false]);
  });

  it("kullanıcı başına ayrıdır: başka kullanıcının olayı dinleyiciye gitmez ve değerini bastırmaz", () => {
    const one: boolean[] = [];
    const two: boolean[] = [];
    subscribeToAccessVerified("u1", (active) => one.push(active));
    subscribeToAccessVerified("u2", (active) => two.push(active));
    publishAccessVerified("u1", true);
    publishAccessVerified("u2", true);
    expect(one).toEqual([true]);
    expect(two).toEqual([true]);
  });

  it("abonelikten çıkınca olay gelmez", () => {
    const seen: boolean[] = [];
    const unsubscribe = subscribeToAccessVerified("u1", (active) => seen.push(active));
    unsubscribe();
    publishAccessVerified("u1", true);
    expect(seen).toEqual([]);
  });
});
