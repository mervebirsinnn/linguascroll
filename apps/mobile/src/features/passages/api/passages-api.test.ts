import { answerPassageQuestion, fetchPassages, PassagesApiError, savePassageWord } from "./passages-api";

const mockAuthHeaders = jest.fn(() => Promise.resolve({ Authorization: "Bearer test-id-token" }));
jest.mock("../../identity/auth-headers", () => ({ authHeaders: () => mockAuthHeaders() }));

const uuid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;

describe("passages api", () => {
  const originalFetch = global.fetch;
  afterEach(() => {
    global.fetch = originalFetch;
  });

  function mockFetch(response: { ok: boolean; status?: number; statusText?: string; json?: unknown }) {
    const spy = jest.fn().mockResolvedValue({ ok: response.ok, status: response.status ?? 200, statusText: response.statusText ?? "OK", json: () => Promise.resolve(response.json) });
    global.fetch = spy as unknown as typeof fetch;
    return spy;
  }

  it("fetchPassages: seviye query'de, cursor yoksa eklenmez, kimlik yalnız Authorization header'ında (userId yok)", async () => {
    const spy = mockFetch({ ok: true, json: { items: [], nextCursor: null } });

    await expect(fetchPassages("C1")).resolves.toEqual({ items: [], nextCursor: null });

    const [url, init] = spy.mock.calls[0] as [string, { headers: Record<string, string> }];
    expect(url).toContain("/passages?level=C1");
    expect(url).not.toContain("cursor=");
    expect(url).not.toContain("userId");
    expect(init.headers).toMatchObject({ Authorization: "Bearer test-id-token" });
  });

  it("fetchPassages: cursor opak olarak olduğu gibi (URL-encode) geri gönderilir", async () => {
    const spy = mockFetch({ ok: true, json: { items: [], nextCursor: "n" } });
    await fetchPassages("B1", "abc.d_e-f==");
    expect((spy.mock.calls[0] as [string])[0]).toContain(`cursor=${encodeURIComponent("abc.d_e-f==")}`);
  });

  it("fetchPassages: sözleşmeye uymayan gövde (eksik alanlı açık metin) wire doğrulamasında patlar", async () => {
    mockFetch({ ok: true, json: { items: [{ access: "open", id: "x" }], nextCursor: null } });
    await expect(fetchPassages("B2")).rejects.toThrow();
  });

  it("HTTP hatası status taşıyan tipli hata olur (arayüz 403'ü ağ hatasından ayırır)", async () => {
    mockFetch({ ok: false, status: 403, statusText: "Forbidden" });
    const error = await answerPassageQuestion(uuid(1), uuid(2)).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(PassagesApiError);
    expect((error as PassagesApiError).status).toBe(403);
  });

  it("oturum yoksa (token alınamazsa) network isteği atmadan hata fırlatır", async () => {
    const spy = jest.fn();
    global.fetch = spy as unknown as typeof fetch;
    mockAuthHeaders.mockRejectedValueOnce(new Error("Oturum yok"));
    await expect(fetchPassages("B2")).rejects.toThrow("Oturum yok");
    expect(spy).not.toHaveBeenCalled();
  });

  it("answerPassageQuestion: yalnız optionId gönderir (isCorrect/userId yok) ve sonucu şemayla doğrular", async () => {
    const result = {
      selectedOptionId: uuid(2),
      correctOptionId: uuid(3),
      correct: false,
      options: [
        { optionId: uuid(2), isCorrect: false, trapType: "copy", explanation: "e" },
        { optionId: uuid(3), isCorrect: true, trapType: null, explanation: "e" },
      ],
    };
    const spy = mockFetch({ ok: true, json: result });

    await expect(answerPassageQuestion(uuid(1), uuid(2))).resolves.toEqual(result);

    const [url, init] = spy.mock.calls[0] as [string, { method: string; body: string }];
    expect(url).toContain(`/passages/questions/${uuid(1)}/answer`);
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body)).toEqual({ optionId: uuid(2) });
  });

  it("answerPassageQuestion: geçersiz optionId istek atılmadan reddedilir", async () => {
    const spy = jest.fn();
    global.fetch = spy as unknown as typeof fetch;
    await expect(answerPassageQuestion(uuid(1), "not-a-uuid")).rejects.toThrow();
    expect(spy).not.toHaveBeenCalled();
  });

  it("savePassageWord: PUT, gövdede YALNIZ sourcePassageId (sourceSegmentId yok); created döner", async () => {
    const spy = mockFetch({ ok: true, json: { created: true } });

    await expect(savePassageWord(uuid(5), uuid(6))).resolves.toEqual({ created: true });

    const [url, init] = spy.mock.calls[0] as [string, { method: string; body: string }];
    expect(url).toContain(`/words/${uuid(5)}/saved`);
    expect(init.method).toBe("PUT");
    expect(JSON.parse(init.body)).toEqual({ sourcePassageId: uuid(6) });
  });

  it("savePassageWord: created opsiyonel alan: yoksa undefined döner; şemaya uymayan gövde patlar", async () => {
    mockFetch({ ok: true, json: {} });
    await expect(savePassageWord(uuid(5), uuid(6))).resolves.toEqual({ created: undefined });
    mockFetch({ ok: true, json: { created: "yes" } });
    await expect(savePassageWord(uuid(5), uuid(6))).rejects.toThrow();
  });

  it("timeout (AbortError) isTimeout:true tipli hata olur; düz ağ hatası olduğu gibi geçer", async () => {
    const abort = Object.assign(new Error("aborted"), { name: "AbortError" });
    global.fetch = jest.fn().mockRejectedValue(abort) as unknown as typeof fetch;
    const timeout = await fetchPassages("B2").catch((e: unknown) => e);
    expect(timeout).toBeInstanceOf(PassagesApiError);
    expect((timeout as PassagesApiError).isTimeout).toBe(true);
    expect((timeout as PassagesApiError).status).toBeUndefined();

    const network = new Error("Network request failed");
    global.fetch = jest.fn().mockRejectedValue(network) as unknown as typeof fetch;
    await expect(fetchPassages("B2")).rejects.toBe(network);
  });
});
