import { createWordGlossesCache } from "./word-glosses-cache";

const glosses = { "00000000-0000-4000-8000-000000000001": { home: "ev" } };

describe("createWordGlossesCache", () => {
  it("ikinci load ağ çağrısı yapmadan bellekten döner", async () => {
    const fetcher = jest.fn().mockResolvedValue(glosses);
    const cache = createWordGlossesCache(fetcher);
    await cache.load("v1");
    await expect(cache.load("v1")).resolves.toEqual(glosses);
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(cache.getCached("v1")).toEqual(glosses);
  });

  it("eşzamanlı iki load tek ağ çağrısına iner", async () => {
    const fetcher = jest.fn().mockResolvedValue(glosses);
    const cache = createWordGlossesCache(fetcher);
    await Promise.all([cache.load("v1"), cache.load("v1")]);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("başarısız isteği cache'lemez, sonraki load yeniden dener", async () => {
    const fetcher = jest.fn().mockRejectedValueOnce(new Error("ağ")).mockResolvedValueOnce(glosses);
    const cache = createWordGlossesCache(fetcher);
    await expect(cache.load("v1")).rejects.toThrow("ağ");
    await expect(cache.load("v1")).resolves.toEqual(glosses);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it("boş sonucu cache'lemez (anlamlar sonradan üretilebilir)", async () => {
    const fetcher = jest.fn().mockResolvedValue({});
    const cache = createWordGlossesCache(fetcher);
    await cache.load("v1");
    await cache.load("v1");
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(cache.getCached("v1")).toBeUndefined();
  });
});
