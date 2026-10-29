import { requireSignedMediaUrl } from "./require-signed-media-url.middleware";
import { signMediaUrl } from "./signed-media-url";

const SECRET = "test-media-signing-secret-at-least-32-chars";
const NOW = Date.UTC(2026, 9, 27, 12, 0, 0);

function run(originalUrl: string, nowMs = NOW): { status: number | null; nextCalled: boolean } {
  let status: number | null = null;
  let nextCalled = false;
  const res = {
    status(code: number) {
      status = code;
      return res;
    },
    end() {},
  };
  requireSignedMediaUrl(SECRET, () => nowMs)({ originalUrl }, res, () => {
    nextCalled = true;
  });
  return { status, nextCalled };
}

function signedPathAndQuery(path: string): string {
  const url = new URL(signMediaUrl(`http://localhost:3000${path}`, SECRET, 3600, NOW));
  return `${url.pathname}${url.search}`;
}

describe("requireSignedMediaUrl", () => {
  it("geçerli imzalı istek static sunuma devredilir", () => {
    expect(run(signedPathAndQuery("/media/ordering-food.mp4"))).toEqual({ status: null, nextCalled: true });
  });

  it("imzasız istek 403", () => {
    expect(run("/media/ordering-food.mp4")).toEqual({ status: 403, nextCalled: false });
  });

  it("başka bir dosyanın imzasıyla istek 403", () => {
    const query = signedPathAndQuery("/media/a.mp4").split("?")[1];
    expect(run(`/media/b.mp4?${query}`)).toEqual({ status: 403, nextCalled: false });
  });

  it("süresi dolmuş istek 403", () => {
    expect(run(signedPathAndQuery("/media/a.mp4"), NOW + 3601_000)).toEqual({ status: 403, nextCalled: false });
  });
});
