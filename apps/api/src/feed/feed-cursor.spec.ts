import { createHmac } from "node:crypto";
import {
  decodeFeedCursor,
  encodeFeedCursor,
  FEED_CURSOR_VERSION,
  InvalidFeedCursorError,
  LEGACY_FEED_CURSOR_VERSION,
  MAX_SESSION_FEED_ITEMS,
  type FeedCursorPayload,
  type FeedPlanItemRef,
} from "./feed-cursor";

const SECRET = "unit-test-secret-0123456789abcdef";
const OTHER_SECRET = "a-completely-different-secret-xyz";
const USER_ID = "00000000-0000-4000-8000-000000000001";
const SEED = "0123456789abcdef0123456789abcdef";

function makePlan(length: number): FeedPlanItemRef[] {
  return Array.from({ length }, (_, i) => ({
    type: i % 4 === 3 ? ("quiz" as const) : ("video" as const),
    id: `00000000-0000-4000-8000-${String(i).padStart(12, "0")}`,
  }));
}

function makePayload(overrides: Partial<FeedCursorPayload> = {}): FeedCursorPayload {
  return { v: FEED_CURSOR_VERSION, userId: USER_ID, scope: "all", sessionSeed: SEED, plan: makePlan(6), position: 0, ...overrides };
}

describe("feed-cursor encode/decode roundtrip", () => {
  it("geçerli bir payload'ı encode edip aynı secret'la decode edince aynı payload'ı verir", () => {
    const payload = makePayload({ position: 3 });
    const cursor = encodeFeedCursor(payload, SECRET);
    expect(decodeFeedCursor(cursor, SECRET)).toEqual(payload);
  });

  it("MAX_SESSION_FEED_ITEMS ile TAM dolu, legitimate bir plan roundtrip'i başarılı olur", () => {
    const payload = makePayload({ plan: makePlan(MAX_SESSION_FEED_ITEMS), position: MAX_SESSION_FEED_ITEMS });
    const cursor = encodeFeedCursor(payload, SECRET);
    expect(decodeFeedCursor(cursor, SECRET)).toEqual(payload);
  });
});

describe("feed-cursor — scope", () => {
  it.each(["all", "animation", "ielts"] as const)("%s scope'u imzalı payload'ta roundtrip eder", (scope) => {
    const payload = makePayload({ scope });
    expect(decodeFeedCursor(encodeFeedCursor(payload, SECRET), SECRET).scope).toBe(scope);
  });

  it("scope'u elle değiştirilmiş cursor imza uyuşmazlığıyla reddedilir (scope imzaya bağlı)", () => {
    const [payloadB64, signature] = encodeFeedCursor(makePayload({ scope: "all" }), SECRET).split(".");
    const tampered = JSON.parse(Buffer.from(payloadB64 as string, "base64url").toString("utf-8"));
    tampered.scope = "ielts";
    const tamperedB64 = Buffer.from(JSON.stringify(tampered), "utf-8").toString("base64url");
    expect(() => decodeFeedCursor(`${tamperedB64}.${signature}`, SECRET)).toThrow(InvalidFeedCursorError);
  });

  it("eski (v1: category taşıyan / scope'suz) cursor'lar KONTROLLÜ biçimde reddedilir — geçerli imzalı olsalar bile", () => {
    // İmzayı gerçek secret'la atıyoruz: red sebebi imza DEĞİL, payload sürümü/şeması olmalı.
    const legacyPayload = { v: 1, userId: USER_ID, category: "animation", plan: makePlan(3), position: 0 };
    const payloadB64 = Buffer.from(JSON.stringify(legacyPayload), "utf-8").toString("base64url");
    const signature = require("node:crypto").createHmac("sha256", SECRET).update(payloadB64).digest("base64url");
    expect(() => decodeFeedCursor(`${payloadB64}.${signature}`, SECRET)).toThrow(InvalidFeedCursorError);
  });

  it("scope alanı olmayan v2 payload reddedilir", () => {
    const payload = { v: FEED_CURSOR_VERSION, userId: USER_ID, plan: makePlan(3), position: 0 };
    const payloadB64 = Buffer.from(JSON.stringify(payload), "utf-8").toString("base64url");
    const signature = require("node:crypto").createHmac("sha256", SECRET).update(payloadB64).digest("base64url");
    expect(() => decodeFeedCursor(`${payloadB64}.${signature}`, SECRET)).toThrow(InvalidFeedCursorError);
  });
});

describe("feed-cursor — scope", () => {
  it.each(["all", "animation", "ielts"] as const)("%s scope'u imzalı payload'ta roundtrip eder", (scope) => {
    const payload = makePayload({ scope });
    expect(decodeFeedCursor(encodeFeedCursor(payload, SECRET), SECRET).scope).toBe(scope);
  });

  it("scope'u elle değiştirilmiş cursor imza uyuşmazlığıyla reddedilir (scope imzaya bağlı)", () => {
    const [payloadB64, signature] = encodeFeedCursor(makePayload({ scope: "all" }), SECRET).split(".");
    const tampered = JSON.parse(Buffer.from(payloadB64 as string, "base64url").toString("utf-8"));
    tampered.scope = "ielts";
    const tamperedB64 = Buffer.from(JSON.stringify(tampered), "utf-8").toString("base64url");
    expect(() => decodeFeedCursor(`${tamperedB64}.${signature}`, SECRET)).toThrow(InvalidFeedCursorError);
  });

  it("eski (v1: category taşıyan / scope'suz) cursor'lar KONTROLLÜ biçimde reddedilir — geçerli imzalı olsalar bile", () => {
    // İmzayı gerçek secret'la atıyoruz: red sebebi imza DEĞİL, payload sürümü/şeması olmalı.
    const legacyPayload = { v: 1, userId: USER_ID, category: "animation", plan: makePlan(3), position: 0 };
    const payloadB64 = Buffer.from(JSON.stringify(legacyPayload), "utf-8").toString("base64url");
    const signature = createHmac("sha256", SECRET).update(payloadB64).digest("base64url");
    expect(() => decodeFeedCursor(`${payloadB64}.${signature}`, SECRET)).toThrow(InvalidFeedCursorError);
  });

  it("scope alanı olmayan v2 payload reddedilir", () => {
    const payload = { v: FEED_CURSOR_VERSION, userId: USER_ID, plan: makePlan(3), position: 0 };
    const payloadB64 = Buffer.from(JSON.stringify(payload), "utf-8").toString("base64url");
    const signature = createHmac("sha256", SECRET).update(payloadB64).digest("base64url");
    expect(() => decodeFeedCursor(`${payloadB64}.${signature}`, SECRET)).toThrow(InvalidFeedCursorError);
  });
});

describe("feed-cursor — tamper/format/version/bounds reddi", () => {
  it("farklı bir secret'la üretilmiş (tampered sayılan) imza reddedilir", () => {
    const cursor = encodeFeedCursor(makePayload(), OTHER_SECRET);
    expect(() => decodeFeedCursor(cursor, SECRET)).toThrow(InvalidFeedCursorError);
  });

  it("payload'ı elle değiştirilmiş (imza artık uyuşmuyor) bir cursor reddedilir", () => {
    const cursor = encodeFeedCursor(makePayload({ position: 0 }), SECRET);
    const [payloadB64, signature] = cursor.split(".");
    const tamperedPayload = JSON.parse(Buffer.from(payloadB64 as string, "base64url").toString("utf-8"));
    tamperedPayload.position = 99;
    const tamperedB64 = Buffer.from(JSON.stringify(tamperedPayload), "utf-8").toString("base64url");
    const tamperedCursor = `${tamperedB64}.${signature}`;

    expect(() => decodeFeedCursor(tamperedCursor, SECRET)).toThrow(InvalidFeedCursorError);
  });

  it("malformed (tek parçalı, ayracı olmayan) bir string reddedilir", () => {
    expect(() => decodeFeedCursor("not-a-valid-cursor-format", SECRET)).toThrow(InvalidFeedCursorError);
  });

  it("base64 olmayan/JSON'a çözülemeyen bir payload reddedilir", () => {
    expect(() => decodeFeedCursor("!!!invalid-base64!!!.signature", SECRET)).toThrow(InvalidFeedCursorError);
  });

  it("desteklenmeyen `v` (version) reddedilir", () => {
    const payload = { ...makePayload(), v: 999 } as unknown as FeedCursorPayload;
    const cursor = encodeFeedCursor(payload, SECRET);
    expect(() => decodeFeedCursor(cursor, SECRET)).toThrow(InvalidFeedCursorError);
  });

  it("MAX_SESSION_FEED_ITEMS'ı aşan (oversized) bir plan reddedilir", () => {
    const payload = { ...makePayload(), plan: makePlan(MAX_SESSION_FEED_ITEMS + 1) };
    const cursor = encodeFeedCursor(payload, SECRET);
    expect(() => decodeFeedCursor(cursor, SECRET)).toThrow(InvalidFeedCursorError);
  });

  it("geçersiz userId formatı (UUID değil) reddedilir", () => {
    const payload = { ...makePayload(), userId: "not-a-uuid" };
    const cursor = encodeFeedCursor(payload, SECRET);
    expect(() => decodeFeedCursor(cursor, SECRET)).toThrow(InvalidFeedCursorError);
  });

  it("position, plan.length'i aşarsa reddedilir", () => {
    const payload = makePayload({ plan: makePlan(6), position: 7 });
    const cursor = encodeFeedCursor(payload, SECRET);
    expect(() => decodeFeedCursor(cursor, SECRET)).toThrow(InvalidFeedCursorError);
  });

  it("negatif position reddedilir", () => {
    const payload = { ...makePayload(), position: -1 };
    const cursor = encodeFeedCursor(payload, SECRET);
    expect(() => decodeFeedCursor(cursor, SECRET)).toThrow(InvalidFeedCursorError);
  });

  it("geçersiz ref shape (type ne video ne quiz) reddedilir", () => {
    const payload = { ...makePayload(), plan: [{ type: "not-a-real-type", id: USER_ID }] } as unknown as FeedCursorPayload;
    const cursor = encodeFeedCursor(payload, SECRET);
    expect(() => decodeFeedCursor(cursor, SECRET)).toThrow(InvalidFeedCursorError);
  });
});

describe("feed-cursor — v3 sessionSeed", () => {
  const signed = (payload: unknown): string => {
    const payloadB64 = Buffer.from(JSON.stringify(payload), "utf-8").toString("base64url");
    return `${payloadB64}.${createHmac("sha256", SECRET).update(payloadB64).digest("base64url")}`;
  };

  it("FEED_CURSOR_VERSION 3'tür ve sessionSeed roundtrip eder", () => {
    expect(FEED_CURSOR_VERSION).toBe(3);
    expect((decodeFeedCursor(encodeFeedCursor(makePayload(), SECRET), SECRET) as { sessionSeed?: string }).sessionSeed).toBe(SEED);
  });

  it("@deprecated v2 cursor (geçerli imzalı, seed'siz) hâlâ decode edilir ve v2 olarak işaretlenir (rollout uyumluluğu)", () => {
    const v2 = { v: 2, userId: USER_ID, scope: "ielts", plan: makePlan(3), position: 1 };
    const decoded = decodeFeedCursor(signed(v2), SECRET);
    expect(decoded).toEqual(v2);
    expect(decoded.v).toBe(LEGACY_FEED_CURSOR_VERSION);
  });

  it("v2 cursor encode/decode roundtrip eder (v2 continuation'ın sonraki cursor'ı)", () => {
    const v2 = { v: LEGACY_FEED_CURSOR_VERSION as 2, userId: USER_ID, scope: "all" as const, plan: makePlan(4), position: 2 };
    expect(decodeFeedCursor(encodeFeedCursor(v2, SECRET), SECRET)).toEqual(v2);
  });

  it("v2 imza/şema kontrolleri aynen korunur: bozuk imza, yanlış secret, scope'suz, sınır dışı position, fazladan alan reddedilir", () => {
    const v2 = { v: 2 as const, userId: USER_ID, scope: "all" as const, plan: makePlan(3), position: 0 };
    const [payloadB64, signature] = signed(v2).split(".");
    expect(() => decodeFeedCursor(`${payloadB64}.${(signature as string).slice(1)}x`, SECRET)).toThrow(InvalidFeedCursorError);
    expect(() => decodeFeedCursor(encodeFeedCursor({ ...v2, v: LEGACY_FEED_CURSOR_VERSION }, OTHER_SECRET), SECRET)).toThrow(InvalidFeedCursorError);
    expect(() => decodeFeedCursor(signed({ ...v2, scope: undefined }), SECRET)).toThrow(InvalidFeedCursorError);
    expect(() => decodeFeedCursor(signed({ ...v2, position: 4 }), SECRET)).toThrow(InvalidFeedCursorError);
    // v2 bir sessionSeed TAŞIYAMAZ: v2 etiketli ama seed'li payload reddedilir (v3'e "yükseltme" kapısı yok).
    expect(() => decodeFeedCursor(signed({ ...v2, sessionSeed: SEED }), SECRET)).toThrow(InvalidFeedCursorError);
  });

  it("v1 ve bilinmeyen sürümler hâlâ reddedilir", () => {
    for (const v of [1, 4, 0]) {
      expect(() => decodeFeedCursor(signed({ v, userId: USER_ID, scope: "all", sessionSeed: SEED, plan: makePlan(2), position: 0 }), SECRET)).toThrow(InvalidFeedCursorError);
    }
  });

  it("v3 ama sessionSeed'siz / geçersiz biçimli seed'li payload reddedilir", () => {
    const base = { v: 3, userId: USER_ID, scope: "all", plan: makePlan(3), position: 0 };
    expect(() => decodeFeedCursor(signed(base), SECRET)).toThrow(InvalidFeedCursorError);
    for (const sessionSeed of ["ABCDEF0123456789abcdef0123456789", "abc", "g".repeat(32), "a".repeat(33)]) {
      expect(() => decodeFeedCursor(signed({ ...base, sessionSeed }), SECRET)).toThrow(InvalidFeedCursorError);
    }
  });

  it("sessionSeed'i elle değiştirilmiş cursor imza uyuşmazlığıyla reddedilir (seed imzaya bağlı)", () => {
    const [payloadB64, signature] = encodeFeedCursor(makePayload(), SECRET).split(".");
    const tampered = JSON.parse(Buffer.from(payloadB64 as string, "base64url").toString("utf-8"));
    tampered.sessionSeed = "f".repeat(32);
    const tamperedB64 = Buffer.from(JSON.stringify(tampered), "utf-8").toString("base64url");
    expect(() => decodeFeedCursor(`${tamperedB64}.${signature}`, SECRET)).toThrow(InvalidFeedCursorError);
  });
});
