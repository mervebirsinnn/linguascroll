import {
  decodeFeedCursor,
  encodeFeedCursor,
  FEED_CURSOR_VERSION,
  InvalidFeedCursorError,
  MAX_SESSION_FEED_ITEMS,
  type FeedCursorPayload,
  type FeedPlanItemRef,
} from "./feed-cursor";

const SECRET = "unit-test-secret-0123456789abcdef";
const OTHER_SECRET = "a-completely-different-secret-xyz";
const USER_ID = "00000000-0000-4000-8000-000000000001";

function makePlan(length: number): FeedPlanItemRef[] {
  return Array.from({ length }, (_, i) => ({
    type: i % 4 === 3 ? ("quiz" as const) : ("video" as const),
    id: `00000000-0000-4000-8000-${String(i).padStart(12, "0")}`,
  }));
}

function makePayload(overrides: Partial<FeedCursorPayload> = {}): FeedCursorPayload {
  return { v: FEED_CURSOR_VERSION, userId: USER_ID, plan: makePlan(6), position: 0, ...overrides };
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
