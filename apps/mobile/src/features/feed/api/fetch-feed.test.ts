import { fetchFeed } from "./fetch-feed";

/**
 * fetchFeed'in kendi guard'ı — undefined/null/boş string bir bug ile buraya kadar
 * sızsa bile (TypeScript "" için hiçbir uyarı vermez), network'e hiç gitmeden
 * fail-fast patlamalı. global.fetch burada hiç çağrılmamalı — bu, "invalid userId
 * request üretmiyor" invariant'ının doğrudan kanıtı.
 */
describe("fetchFeed", () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("boş string userId ile network isteği atmadan hata fırlatır", async () => {
    const fetchSpy = jest.fn();
    global.fetch = fetchSpy as unknown as typeof fetch;

    await expect(fetchFeed("")).rejects.toThrow();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("undefined userId ile (runtime'da tip sistemini atlayan bir çağrı) network isteği atmadan hata fırlatır", async () => {
    const fetchSpy = jest.fn();
    global.fetch = fetchSpy as unknown as typeof fetch;

    await expect(fetchFeed(undefined as unknown as string)).rejects.toThrow();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("null userId ile (runtime'da tip sistemini atlayan bir çağrı) network isteği atmadan hata fırlatır", async () => {
    const fetchSpy = jest.fn();
    global.fetch = fetchSpy as unknown as typeof fetch;

    await expect(fetchFeed(null as unknown as string)).rejects.toThrow();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("geçerli bir userId ile, cursor olmadan doğru URL'e GET isteği atar", async () => {
    const userId = "00000000-0000-4000-8000-000000000001";
    const fetchSpy = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ items: [], nextCursor: null }),
    });
    global.fetch = fetchSpy as unknown as typeof fetch;

    const page = await fetchFeed(userId);

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [calledUrl] = fetchSpy.mock.calls[0] as [string];
    expect(calledUrl).toContain(`userId=${userId}`);
    expect(calledUrl).not.toContain("cursor=");
    expect(page).toEqual({ items: [], nextCursor: null });
  });

  it("cursor verildiğinde onu olduğu gibi (parse etmeden) query'ye ekler", async () => {
    const userId = "00000000-0000-4000-8000-000000000001";
    const opaqueCursor = "some.opaque-cursor_value123";
    const fetchSpy = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ items: [], nextCursor: "next-opaque-cursor" }),
    });
    global.fetch = fetchSpy as unknown as typeof fetch;

    const page = await fetchFeed(userId, opaqueCursor);

    const [calledUrl] = fetchSpy.mock.calls[0] as [string];
    expect(calledUrl).toContain(`cursor=${encodeURIComponent(opaqueCursor)}`);
    expect(page.nextCursor).toBe("next-opaque-cursor");
  });

  it("Chunk 15 — cursor YOKKEN, preference (level+topics) query'ye eklenir", async () => {
    const userId = "00000000-0000-4000-8000-000000000001";
    const fetchSpy = jest.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({ items: [], nextCursor: null }) });
    global.fetch = fetchSpy as unknown as typeof fetch;

    await fetchFeed(userId, undefined, { level: "B1", topics: ["travel", "dating"] });

    const [calledUrl] = fetchSpy.mock.calls[0] as [string];
    expect(calledUrl).toContain("level=B1");
    expect(calledUrl).toContain(`topics=${encodeURIComponent("travel,dating")}`);
  });

  it("Chunk 15 — cursor VARKEN preference verilse bile query'ye EKLENMEZ (backend zaten yok sayıyor, gereksiz)", async () => {
    const userId = "00000000-0000-4000-8000-000000000001";
    const fetchSpy = jest.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({ items: [], nextCursor: null }) });
    global.fetch = fetchSpy as unknown as typeof fetch;

    await fetchFeed(userId, "some-cursor", { level: "B1", topics: ["travel"] });

    const [calledUrl] = fetchSpy.mock.calls[0] as [string];
    expect(calledUrl).not.toContain("level=");
    expect(calledUrl).not.toContain("topics=");
  });

  it("Chunk 15 — preference boşsa (level:null, topics:[]) query'ye hiçbir şey eklenmez", async () => {
    const userId = "00000000-0000-4000-8000-000000000001";
    const fetchSpy = jest.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({ items: [], nextCursor: null }) });
    global.fetch = fetchSpy as unknown as typeof fetch;

    await fetchFeed(userId, undefined, { level: null, topics: [] });

    const [calledUrl] = fetchSpy.mock.calls[0] as [string];
    expect(calledUrl).not.toContain("level=");
    expect(calledUrl).not.toContain("topics=");
  });
});
