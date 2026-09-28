import { Logger } from "@nestjs/common";
import { RequestLoggingMiddleware } from "./request-logging.middleware";

// Nest DI konteynerini bootstrap etmiyoruz — middleware'i saf bir sınıf olarak,
// req/res'i elle sahteleyerek test ediyoruz (repo konvansiyonu: *.spec.ts = DB/Nest DI yok).

function createReq(headers: Record<string, string | string[] | undefined> = {}) {
  return { method: "GET", path: "/feed", headers };
}

function createRes(statusCode: number) {
  let finishListener: (() => void) | undefined;
  return {
    statusCode,
    setHeader: jest.fn(),
    on: jest.fn((event: string, listener: () => void) => {
      if (event === "finish") {
        finishListener = listener;
      }
    }),
    triggerFinish: () => finishListener?.(),
  };
}

describe("RequestLoggingMiddleware", () => {
  let middleware: RequestLoggingMiddleware;
  let logSpy: jest.SpyInstance;
  let warnSpy: jest.SpyInstance;
  let errorSpy: jest.SpyInstance;

  beforeEach(() => {
    middleware = new RequestLoggingMiddleware();
    logSpy = jest.spyOn(Logger.prototype, "log").mockImplementation(() => undefined);
    warnSpy = jest.spyOn(Logger.prototype, "warn").mockImplementation(() => undefined);
    errorSpy = jest.spyOn(Logger.prototype, "error").mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("gelen X-Request-Id yoksa bir requestId üretir ve response'a yazar", () => {
    const req = createReq();
    const res = createRes(200);

    middleware.use(req as never, res as never, jest.fn());

    expect(res.setHeader).toHaveBeenCalledWith("X-Request-Id", expect.stringMatching(/^[A-Za-z0-9-]+$/));
  });

  it("geçerli bir gelen X-Request-Id'yi aynen yeniden kullanır", () => {
    const req = createReq({ "x-request-id": "client-abc-123" });
    const res = createRes(200);

    middleware.use(req as never, res as never, jest.fn());

    expect(res.setHeader).toHaveBeenCalledWith("X-Request-Id", "client-abc-123");
  });

  it("geçersiz karakter içeren bir X-Request-Id'yi üretilmiş bir id ile değiştirir", () => {
    const req = createReq({ "x-request-id": "not valid! id" });
    const res = createRes(200);

    middleware.use(req as never, res as never, jest.fn());

    const [, usedId] = (res.setHeader as jest.Mock).mock.calls[0];
    expect(usedId).not.toBe("not valid! id");
    expect(usedId).toMatch(/^[A-Za-z0-9-]+$/);
  });

  it("maksimum uzunluğu aşan bir X-Request-Id'yi üretilmiş bir id ile değiştirir", () => {
    const tooLong = "a".repeat(200);
    const req = createReq({ "x-request-id": tooLong });
    const res = createRes(200);

    middleware.use(req as never, res as never, jest.fn());

    const [, usedId] = (res.setHeader as jest.Mock).mock.calls[0];
    expect(usedId).not.toBe(tooLong);
  });

  it("2xx yanıtı Logger.log() ile loglar", () => {
    const req = createReq();
    const res = createRes(200);

    middleware.use(req as never, res as never, jest.fn());
    res.triggerFinish();

    expect(logSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy).not.toHaveBeenCalled();
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it("4xx yanıtı Logger.warn() ile loglar", () => {
    const req = createReq();
    const res = createRes(404);

    middleware.use(req as never, res as never, jest.fn());
    res.triggerFinish();

    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(logSpy).not.toHaveBeenCalled();
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it("5xx yanıtı Logger.error() ile loglar", () => {
    const req = createReq();
    const res = createRes(500);

    middleware.use(req as never, res as never, jest.fn());
    res.triggerFinish();

    expect(errorSpy).toHaveBeenCalledTimes(1);
    expect(logSpy).not.toHaveBeenCalled();
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it("next()'i her zaman çağırır", () => {
    const req = createReq();
    const res = createRes(200);
    const next = jest.fn();

    middleware.use(req as never, res as never, next);

    expect(next).toHaveBeenCalledTimes(1);
  });
});
