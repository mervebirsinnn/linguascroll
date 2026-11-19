import { createLoopiStore, loopiStorageKey, type KeyValueStore } from "./loopi-store";

/**
 * 2026-11-17 — Loopi deposu: eşzamanlı kayıtların birbirini ezmemesi, hesap ayrımı, temizleme, bozuk veri ve
 * yayıncı. Sahte depo yazmaları GECİKMELİ yapar ki "oku → değiştir → yaz" yarışları gerçekten ortaya çıksın.
 */
function delayedStore(delayMs = 5): KeyValueStore & { data: Map<string, string> } {
  const data = new Map<string, string>();
  const wait = () => new Promise((resolve) => setTimeout(resolve, delayMs));
  return {
    data,
    async getItem(key) {
      await wait();
      return data.get(key) ?? null;
    },
    async setItem(key, value) {
      await wait();
      data.set(key, value);
    },
    async removeItem(key) {
      await wait();
      data.delete(key);
    },
  };
}

describe("createLoopiStore", () => {
  it("eşzamanlı kayıt: iki farklı kelime paralel kaydedilince ikisi de korunur (kayıp güncelleme yok)", async () => {
    const kv = delayedStore();
    const store = createLoopiStore(kv);

    await Promise.all([store.recordWordCreated("u1", "A"), store.recordWordCreated("u1", "B"), store.recordWordCreated("u1", "C")]);

    expect((await store.read("u1")).pending).toEqual(["A", "B", "C"]);
  });

  it("çift bildirim aynı kelime için paralel gelse de tek kayıt", async () => {
    const store = createLoopiStore(delayedStore());
    await Promise.all([store.recordWordCreated("u1", "A"), store.recordWordCreated("u1", "A")]);
    expect((await store.read("u1")).pending).toEqual(["A"]);
  });

  it("hesap değiştirme: user1'in bekleyeni user2'de görünmez; user1'e dönünce korunur", async () => {
    const store = createLoopiStore(delayedStore());
    await store.recordWordCreated("user1", "A");

    expect((await store.read("user2")).pending).toEqual([]);
    await store.recordWordCreated("user2", "B");
    expect((await store.read("user1")).pending).toEqual(["A"]);
    expect((await store.read("user2")).pending).toEqual(["B"]);
  });

  it("clear yalnız o kullanıcıyı siler", async () => {
    const kv = delayedStore();
    const store = createLoopiStore(kv);
    await store.recordWordCreated("user1", "A");
    await store.recordWordCreated("user2", "B");

    await store.clear("user1");

    expect(kv.data.has(loopiStorageKey("user1"))).toBe(false);
    expect((await store.read("user2")).pending).toEqual(["B"]);
  });

  it("okuma bekleyen yazmadan SONRA çalışır (eski değeri görmez)", async () => {
    const store = createLoopiStore(delayedStore());
    const write = store.recordWordCreated("u1", "A");
    const read = store.read("u1");
    await write;
    expect((await read).pending).toEqual(["A"]);
  });

  it("bozuk JSON → sessiz başlangıç, üstüne yazılabilir", async () => {
    const kv = delayedStore();
    kv.data.set(loopiStorageKey("u1"), "{bozuk");
    const store = createLoopiStore(kv);

    expect(await store.read("u1")).toEqual({ version: 1, seenStage: null, pending: [] });
    await store.recordWordCreated("u1", "A");
    expect((await store.read("u1")).pending).toEqual(["A"]);
  });

  it("depo okuması hata verirse boş durum; bir yazma hatası sonraki işlemleri kilitlemez", async () => {
    let failSet = true;
    const kv: KeyValueStore = {
      getItem: () => Promise.reject(new Error("disk")),
      setItem: () => (failSet ? Promise.reject(new Error("disk")) : Promise.resolve()),
      removeItem: () => Promise.resolve(),
    };
    const store = createLoopiStore(kv);
    expect(await store.read("u1")).toEqual({ version: 1, seenStage: null, pending: [] });
    await expect(store.recordWordCreated("u1", "A")).rejects.toThrow("disk");
    failSet = false;
    await expect(store.recordWordCreated("u1", "B")).resolves.toBeUndefined();
  });

  it("openCard: görüldü yazar, oynatılacak şeyi döner ve dinleyenlere haber verir", async () => {
    const store = createLoopiStore(delayedStore(0));
    await store.recordWordCreated("u1", "A");
    const listener = jest.fn();
    store.subscribe(listener);

    const reveal = await store.openCard("u1", [{ word: { id: "A", lemma: "tomato" }, savedAt: "2026-11-17T09:00:00.000Z" }]);

    expect(reveal?.latest).toEqual({ wordId: "A", lemma: "tomato" });
    expect(await store.read("u1")).toEqual({ version: 1, seenStage: 1, pending: [] });
    expect(listener).toHaveBeenCalledWith("u1");
  });

  it("yayıncı: kayıt ve silme o kullanıcının id'siyle bildirilir; abonelikten çıkınca bildirilmez", async () => {
    const store = createLoopiStore(delayedStore(0));
    const listener = jest.fn();
    const unsubscribe = store.subscribe(listener);

    await store.recordWordCreated("u1", "A");
    await store.recordWordRemoved("u1", "A");
    expect(listener.mock.calls).toEqual([["u1"], ["u1"]]);
    expect((await store.read("u1")).pending).toEqual([]);

    unsubscribe();
    await store.recordWordCreated("u1", "B");
    expect(listener).toHaveBeenCalledTimes(2);
  });
});
