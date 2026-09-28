import type { ErrorEvent, EventHint } from "@sentry/nestjs";
import { scrubSensitiveRequestData } from "./sentry-privacy";

// Saf fonksiyon testi — Sentry SDK'sı hiç initialize edilmiyor (bkz. sentry-privacy.ts'teki
// yorum: instrument.ts'i import etmek gerçek bir Sentry.init() side effect'i tetikler).

const HINT: EventHint = {};

// `ErrorEvent.type` her zaman `undefined` olmak ZORUNDA (bkz. @sentry/core'daki
// tip tanımı) — her test fixture'ında tekrarlamamak için tek bir yardımcı.
function buildErrorEvent(partial: Omit<ErrorEvent, "type">): ErrorEvent {
  return { ...partial, type: undefined };
}

describe("scrubSensitiveRequestData", () => {
  it("Authorization ve Cookie header'larını (case-insensitive) event'ten çıkarır", () => {
    const event = buildErrorEvent({
      request: {
        headers: {
          Authorization: "Bearer secret-token",
          cookie: "session=abc123",
          "X-Request-Id": "req-1",
          "content-type": "application/json",
        },
      },
    });

    const result = scrubSensitiveRequestData(event, HINT);

    expect(result.request?.headers).toEqual({
      "X-Request-Id": "req-1",
      "content-type": "application/json",
    });
  });

  it("structured `cookies` alanını tamamen kaldırır", () => {
    const event = buildErrorEvent({
      request: {
        cookies: { session: "abc123" },
      },
    });

    const result = scrubSensitiveRequestData(event, HINT);

    expect(result.request?.cookies).toBeUndefined();
  });

  it("request yoksa event'i değiştirmeden aynen döndürür", () => {
    const event = buildErrorEvent({ message: "boom" });

    const result = scrubSensitiveRequestData(event, HINT);

    expect(result).toBe(event);
  });

  it("hassas olmayan header'lara dokunmaz", () => {
    const event = buildErrorEvent({
      request: {
        headers: { "user-agent": "jest-test" },
      },
    });

    const result = scrubSensitiveRequestData(event, HINT);

    expect(result.request?.headers).toEqual({ "user-agent": "jest-test" });
  });

  it("body/query alanlarını ekleMEZ (yalnızca var olan alanları scrub eder, yenilerini eklemez)", () => {
    const event = buildErrorEvent({
      request: { headers: { "content-type": "application/json" } },
    });

    const result = scrubSensitiveRequestData(event, HINT);

    expect(result.request?.data).toBeUndefined();
    expect(result.request?.query_string).toBeUndefined();
  });
});
