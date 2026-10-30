import { getSessionSeed } from "../../../shared/session-seed";
import { FeedFetchError, fetchFeed } from "./fetch-feed";

// 2026-10-27 — kimlik Firebase ID token'ı (Authorization header); SDK burada mock'lanıyor.
const mockAuthHeaders = jest.fn(() => Promise.resolve({ Authorization: "Bearer test-id-token" }));
jest.mock("../../identity/auth-headers", () => ({ authHeaders: () => mockAuthHeaders() }));

jest.mock("expo-crypto", () => ({
  // Kontrollü CSPRNG: her çağrıda aynı 16 bayt (seed testlerde sabit ve gözlemlenebilir olsun).
  getRandomValues: (array: Uint8Array) => array.fill(0xab),
}));

describe("fetchFeed", () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("oturum yoksa (token alınamazsa) network isteği atmadan hata fırlatır", async () => {
    const fetchSpy = jest.fn();
    global.fetch = fetchSpy as unknown as typeof fetch;
    mockAuthHeaders.mockRejectedValueOnce(new Error("Oturum yok"));

    await expect(fetchFeed()).rejects.toThrow("Oturum yok");
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("cursor olmadan doğru URL'e, kimliği Authorization header'ında taşıyarak GET isteği atar (query'de userId YOK)", async () => {
    const fetchSpy = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ items: [], nextCursor: null }),
    });
    global.fetch = fetchSpy as unknown as typeof fetch;

    const page = await fetchFeed();

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [calledUrl, init] = fetchSpy.mock.calls[0] as [string, { headers: Record<string, string> }];
    expect(calledUrl).toContain("continuous=true");
    expect(calledUrl).not.toContain("userId=");
    expect(init.headers).toMatchObject({ Authorization: "Bearer test-id-token" });
    expect(calledUrl).not.toContain("cursor=");
    expect(page).toEqual({ items: [], nextCursor: null });
  });

  it("cursor verildiğinde onu olduğu gibi (parse etmeden) query'ye ekler", async () => {
    const opaqueCursor = "some.opaque-cursor_value123";
    const fetchSpy = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ items: [], nextCursor: "next-opaque-cursor" }),
    });
    global.fetch = fetchSpy as unknown as typeof fetch;

    const page = await fetchFeed(opaqueCursor);

    const [calledUrl] = fetchSpy.mock.calls[0] as [string];
    expect(calledUrl).toContain(`cursor=${encodeURIComponent(opaqueCursor)}`);
    expect(page.nextCursor).toBe("next-opaque-cursor");
  });

  it("Chunk 15 — cursor YOKKEN, preference (level+topics) query'ye eklenir", async () => {
    const fetchSpy = jest.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({ items: [], nextCursor: null }) });
    global.fetch = fetchSpy as unknown as typeof fetch;

    await fetchFeed(undefined, { level: "B1", topics: ["travel", "dating"] });

    const [calledUrl] = fetchSpy.mock.calls[0] as [string];
    expect(calledUrl).toContain("level=B1");
    expect(calledUrl).toContain(`topics=${encodeURIComponent("travel,dating")}`);
  });

  it("Chunk 15 — cursor VARKEN preference verilse bile query'ye EKLENMEZ (backend zaten yok sayıyor, gereksiz)", async () => {
    const fetchSpy = jest.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({ items: [], nextCursor: null }) });
    global.fetch = fetchSpy as unknown as typeof fetch;

    await fetchFeed("some-cursor", { level: "B1", topics: ["travel"] });

    const [calledUrl] = fetchSpy.mock.calls[0] as [string];
    expect(calledUrl).not.toContain("level=");
    expect(calledUrl).not.toContain("topics=");
  });

  it("Chunk 15 — preference boşsa (level:null, topics:[]) query'ye hiçbir şey eklenmez", async () => {
    const fetchSpy = jest.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({ items: [], nextCursor: null }) });
    global.fetch = fetchSpy as unknown as typeof fetch;

    await fetchFeed(undefined, { level: null, topics: [] });

    const [calledUrl] = fetchSpy.mock.calls[0] as [string];
    expect(calledUrl).not.toContain("level=");
    expect(calledUrl).not.toContain("topics=");
  });
  it("Animasyon seçimi ilk sayfa ve devam isteğinde korunur", async () => {
    const fetchSpy = jest.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({ items: [], nextCursor: null }) });
    global.fetch = fetchSpy as unknown as typeof fetch;
    await fetchFeed(undefined, { level: "B1", topics: ["travel"] }, "animation");
    await fetchFeed("signed-cursor", undefined, "animation");
    expect(fetchSpy.mock.calls).toHaveLength(2);
    for (const [url] of fetchSpy.mock.calls) expect(new URL(url).searchParams.get("scope")).toBe("animation");
    expect(new URL(fetchSpy.mock.calls[1][0]).searchParams.get("cursor")).toBe("signed-cursor");
  });

  it("IELTS seçimi scope=ielts olarak gönderilir; seviye tercihi ayrı param kalır, ilk sayfa cursor taşımaz", async () => {
    const fetchSpy = jest.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({ items: [], nextCursor: null }) });
    global.fetch = fetchSpy as unknown as typeof fetch;
    await fetchFeed(undefined, { level: "C1", topics: [] }, "ielts");
    const url = new URL(fetchSpy.mock.calls[0][0]);
    expect(url.searchParams.get("scope")).toBe("ielts");
    expect(url.searchParams.get("level")).toBe("C1");
    expect(url.searchParams.has("cursor")).toBe(false);
  });

  it("varsayılan (Akış) scope=all gönderir; eski `category` parametresi HİÇBİR istekte gönderilmez", async () => {
    const fetchSpy = jest.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({ items: [], nextCursor: null }) });
    global.fetch = fetchSpy as unknown as typeof fetch;
    await fetchFeed();
    await fetchFeed("signed-cursor", undefined, "ielts");
    for (const [url] of fetchSpy.mock.calls) expect(new URL(url).searchParams.has("category")).toBe(false);
    expect(new URL(fetchSpy.mock.calls[0][0]).searchParams.get("scope")).toBe("all");
  });

  it("cursor'suz her istek AYNI process ömürlü sessionSeed'i taşır (scope/preference/retry değişse de); cursor'lu istek seed taşımaz", async () => {
    const fetchSpy = jest.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({ items: [], nextCursor: null }) });
    global.fetch = fetchSpy as unknown as typeof fetch;
    await fetchFeed(undefined, undefined, "all");
    await fetchFeed(undefined, { level: "B1", topics: ["travel"] }, "animation");
    await fetchFeed(undefined, undefined, "ielts");
    await fetchFeed(undefined, undefined, "ielts"); // retry
    await fetchFeed("signed-cursor", undefined, "ielts");

    const seeds = fetchSpy.mock.calls.slice(0, 4).map(([url]) => new URL(url).searchParams.get("sessionSeed"));
    expect(seeds[0]).toBe("ab".repeat(16));
    expect(new Set(seeds).size).toBe(1);
    expect(seeds[0]).toBe(getSessionSeed());
    expect(new URL(fetchSpy.mock.calls[4][0]).searchParams.has("sessionSeed")).toBe(false);
  });

  it("geçersiz bölüm network'e çıkmadan reddedilir", async () => {
    const fetchSpy = jest.fn();
    global.fetch = fetchSpy as unknown as typeof fetch;
    await expect(fetchFeed(undefined, undefined, "anime" as "animation")).rejects.toThrow();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  // 2026-10-01 — gerçek bir gözden geçirme bulgusu: başarısız bir HTTP yanıtının
  // FeedFetchError.status'e DOĞRU aktarıldığını doğrudan doğrulayan bir test
  // yoktu (use-feed.test.ts sadece zaten üretilmiş bir FeedFetchError'ı
  // kullanıyordu, fetchFeed'in KENDİSİNİN bunu doğru ürettiğini değil).
  it("başarısız bir HTTP yanıtı, status'ü taşıyan bir FeedFetchError fırlatır (isTimeout: false)", async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 503, statusText: "Service Unavailable" }) as unknown as typeof fetch;

    await expect(fetchFeed()).rejects.toMatchObject(
      expect.objectContaining({ status: 503, isTimeout: false }),
    );
  });

  it("sunucu FETCH_TIMEOUT_MS içinde hiç yanıt vermezse, isTimeout:true olan (status'süz) bir FeedFetchError fırlatır", async () => {
    jest.useFakeTimers();
    try {
        global.fetch = jest.fn((_input: unknown, init?: { signal?: AbortSignal }) => {
        return new Promise((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => {
            const abortError = new Error("The operation was aborted");
            abortError.name = "AbortError";
            reject(abortError);
          });
        });
      }) as unknown as typeof fetch;

      const promise = fetchFeed();
      // authHeaders (async) çözülüp timer kurulana kadar mikro görevleri boşalt.
      for (let i = 0; i < 5; i++) await Promise.resolve();
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

