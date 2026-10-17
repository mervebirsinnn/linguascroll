import { getSessionSeed } from "../../../shared/session-seed";
import { FeedFetchError, fetchFeed } from "./fetch-feed";

jest.mock("expo-crypto", () => ({
  // Kontrollü CSPRNG: her çağrıda aynı 16 bayt (seed testlerde sabit ve gözlemlenebilir olsun).
  getRandomValues: (array: Uint8Array) => array.fill(0xab),
}));

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
  it("Animasyon seçimi ilk sayfa ve devam isteğinde korunur", async () => {
    const fetchSpy = jest.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({ items: [], nextCursor: null }) });
    global.fetch = fetchSpy as unknown as typeof fetch;
    await fetchFeed("user", undefined, { level: "B1", topics: ["travel"] }, "animation");
    await fetchFeed("user", "signed-cursor", undefined, "animation");
    expect(fetchSpy.mock.calls).toHaveLength(2);
    for (const [url] of fetchSpy.mock.calls) expect(new URL(url).searchParams.get("scope")).toBe("animation");
    expect(new URL(fetchSpy.mock.calls[1][0]).searchParams.get("cursor")).toBe("signed-cursor");
  });

  it("IELTS seçimi scope=ielts olarak gönderilir; seviye tercihi ayrı param kalır, ilk sayfa cursor taşımaz", async () => {
    const fetchSpy = jest.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({ items: [], nextCursor: null }) });
    global.fetch = fetchSpy as unknown as typeof fetch;
    await fetchFeed("user", undefined, { level: "C1", topics: [] }, "ielts");
    const url = new URL(fetchSpy.mock.calls[0][0]);
    expect(url.searchParams.get("scope")).toBe("ielts");
    expect(url.searchParams.get("level")).toBe("C1");
    expect(url.searchParams.has("cursor")).toBe(false);
  });

  it("varsayılan (Akış) scope=all gönderir; eski `category` parametresi HİÇBİR istekte gönderilmez", async () => {
    const fetchSpy = jest.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({ items: [], nextCursor: null }) });
    global.fetch = fetchSpy as unknown as typeof fetch;
    await fetchFeed("user");
    await fetchFeed("user", "signed-cursor", undefined, "ielts");
    for (const [url] of fetchSpy.mock.calls) expect(new URL(url).searchParams.has("category")).toBe(false);
    expect(new URL(fetchSpy.mock.calls[0][0]).searchParams.get("scope")).toBe("all");
  });

  it("cursor'suz her istek AYNI process ömürlü sessionSeed'i taşır (scope/preference/retry değişse de); cursor'lu istek seed taşımaz", async () => {
    const fetchSpy = jest.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({ items: [], nextCursor: null }) });
    global.fetch = fetchSpy as unknown as typeof fetch;
    await fetchFeed("user", undefined, undefined, "all");
    await fetchFeed("user", undefined, { level: "B1", topics: ["travel"] }, "animation");
    await fetchFeed("user", undefined, undefined, "ielts");
    await fetchFeed("user", undefined, undefined, "ielts"); // retry
    await fetchFeed("user", "signed-cursor", undefined, "ielts");

    const seeds = fetchSpy.mock.calls.slice(0, 4).map(([url]) => new URL(url).searchParams.get("sessionSeed"));
    expect(seeds[0]).toBe("ab".repeat(16));
    expect(new Set(seeds).size).toBe(1);
    expect(seeds[0]).toBe(getSessionSeed());
    expect(new URL(fetchSpy.mock.calls[4][0]).searchParams.has("sessionSeed")).toBe(false);
  });

  it("geçersiz bölüm network'e çıkmadan reddedilir", async () => {
    const fetchSpy = jest.fn();
    global.fetch = fetchSpy as unknown as typeof fetch;
    await expect(fetchFeed("user", undefined, undefined, "anime" as "animation")).rejects.toThrow();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  // 2026-10-01 — gerçek bir gözden geçirme bulgusu: başarısız bir HTTP yanıtının
  // FeedFetchError.status'e DOĞRU aktarıldığını doğrudan doğrulayan bir test
  // yoktu (use-feed.test.ts sadece zaten üretilmiş bir FeedFetchError'ı
  // kullanıyordu, fetchFeed'in KENDİSİNİN bunu doğru ürettiğini değil).
  it("başarısız bir HTTP yanıtı, status'ü taşıyan bir FeedFetchError fırlatır (isTimeout: false)", async () => {
    const userId = "00000000-0000-4000-8000-000000000001";
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 503, statusText: "Service Unavailable" }) as unknown as typeof fetch;

    await expect(fetchFeed(userId)).rejects.toMatchObject(
      expect.objectContaining({ status: 503, isTimeout: false }),
    );
  });

  it("sunucu FETCH_TIMEOUT_MS içinde hiç yanıt vermezse, isTimeout:true olan (status'süz) bir FeedFetchError fırlatır", async () => {
    jest.useFakeTimers();
    try {
      const userId = "00000000-0000-4000-8000-000000000001";
      global.fetch = jest.fn((_input: unknown, init?: { signal?: AbortSignal }) => {
        return new Promise((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => {
            const abortError = new Error("The operation was aborted");
            abortError.name = "AbortError";
            reject(abortError);
          });
        });
      }) as unknown as typeof fetch;

      const promise = fetchFeed(userId);
      // fetchFeed kendi FETCH_TIMEOUT_MS'ini (15s) AŞMAYAN bir süre bekleyip
      // timer'ı tetiklememeli — önce bunu doğruluyoruz (yanlış pozitif riski).
      jest.advanceTimersByTime(14999);
      await Promise.resolve();

      jest.advanceTimersByTime(1);
      const error = await promise.catch((e: unknown) => e);

      expect(error).toBeInstanceOf(FeedFetchError);
      expect((error as FeedFetchError).isTimeout).toBe(true);
      expect((error as FeedFetchError).status).toBeUndefined();
    } finally {
      jest.useRealTimers();
    }
  });
});

