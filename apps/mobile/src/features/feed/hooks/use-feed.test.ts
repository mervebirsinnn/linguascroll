import type { FeedItem, FeedPage } from "@linguascroll/shared-types";
import {
  applyFreshSessionError,
  applyLoadMoreError,
  applyLoadMoreStart,
  applyLoadMoreSuccess,
  applyFreshSessionSuccess,
  canLoadMore,
  canRefresh,
  type FeedState,
} from "./use-feed";

/**
 * useFeed'in state-transition mantığı React'ten bağımsız saf fonksiyonlara
 * çıkarıldığı için (hook bunları BİREBİR kullanıyor — bkz. use-feed.ts), bu
 * testler RN render etmeden (RNTL/jest-expo gerekmeden) pagination/refresh'in
 * kritik davranışlarını doğruluyor: concurrency guard, session-sonu'nda
 * otomatik devam etmeme, başarısız loadMore/refresh'te item korunumu, explicit
 * retry/refresh.
 *
 * BİLİNÇLİ OLARAK test EDİLMEYEN şey: "refresh sonrası içerik önceki session'dan
 * farklı olmalı" — ranking deterministic ve cross-session exclusion yok, aynı/
 * benzer içerik tekrar gelebilir. Test edilen contract SADECE yeni cursor'sız
 * bir session request'inin başlaması ve state'in REPLACE edilmesi.
 *
 * NOT: `refresh()`'in gerçekten `fetchFeed(userId)`'i cursor'SIZ çağırdığı (yani
 * mevcut `state.nextCursor`'ı hiç okumadığı) — hook'un kendi imperatif kodunun
 * bir gerçeği; RN render etmeden otomatik test edilemiyor (bkz. Chunk 8 raporu),
 * kod incelemesiyle doğrulanıyor: `refresh()`'in gövdesi `state`'e hiç erişmiyor.
 */

const item: FeedItem = {
  type: "video",
  video: {
    id: "00000000-0000-4000-8000-000000000001",
    learningLanguage: "en",
    cefrLevel: "A1",
    topic: "travel",
    durationMs: 1000,
    playbackUrl: "https://example.com/v.mp4",
    vocabulary: [],
    segments: [],
  },
};

function successState(overrides: Partial<Extract<FeedState, { status: "success" }>> = {}): FeedState {
  return { status: "success", items: [item], nextCursor: "some-cursor", isLoadingMore: false, loadMoreError: null, ...overrides };
}

describe("canLoadMore", () => {
  it("nextCursor null iken false döner — session bitince otomatik devam etmez (Chunk 8 kararı)", () => {
    expect(canLoadMore(successState({ nextCursor: null }), false)).toBe(false);
  });

  it("zaten bir fetch devam ederken (isFetching=true) false döner — concurrent loadMore guard'ı", () => {
    expect(canLoadMore(successState({ nextCursor: "cursor" }), true)).toBe(false);
  });

  it("loading/error durumlarında false döner", () => {
    expect(canLoadMore({ status: "loading" }, false)).toBe(false);
    expect(canLoadMore({ status: "error", message: "x" }, false)).toBe(false);
  });

  it("nextCursor varken ve isFetching=false iken true döner", () => {
    expect(canLoadMore(successState({ nextCursor: "cursor" }), false)).toBe(true);
  });
});

describe("canRefresh — paylaşılan concurrency guard", () => {
  it("hiçbir request in-flight değilken (isFetching=false) true döner", () => {
    expect(canRefresh(false)).toBe(true);
  });

  it("bir loadMore devam ederken (isFetching=true) false döner — 'loadMore sırasında refresh tetiklenirse duplicate request oluşmuyor'", () => {
    expect(canRefresh(true)).toBe(false);
  });

  it("bir önceki refresh devam ederken (isFetching=true) false döner — 'refresh sırasında başka request in-flight ise ikinci request oluşmuyor'", () => {
    expect(canRefresh(true)).toBe(false);
  });

  it("state'in kendisinden BAĞIMSIZ — nextCursor null/non-null farketmez, sadece isFetching'e bakar", () => {
    // canRefresh state parametresi bile almıyor: refresh her state'ten (loading/
    // error/success, nextCursor ne olursa olsun) denenebilir olmalı — TEK şart isFetching.
    expect(canRefresh(false)).toBe(true);
  });
});

describe("applyFreshSessionSuccess — refresh/initial ORTAK başarı yolu", () => {
  it("state'i REPLACE eder — eski items'a asla erişimi yok, bu yüzden append fiziksel olarak imkansız", () => {
    const newPage: FeedPage = { items: [item, item], nextCursor: "new-cursor" };
    const result = applyFreshSessionSuccess(newPage);

    expect(result).toEqual({
      status: "success",
      items: newPage.items,
      nextCursor: "new-cursor",
      isLoadingMore: false,
      loadMoreError: null,
    });
  });

  it("nextCursor null olan bir sayfa da (tek sayfalık yeni session) doğru şekilde temsil edilir", () => {
    const newPage: FeedPage = { items: [item], nextCursor: null };
    expect(applyFreshSessionSuccess(newPage).nextCursor).toBeNull();
  });
});

describe("applyLoadMoreError — hem loadMore hem refresh hatası için ortak yol", () => {
  it("mevcut items'ı AYNEN korur, isLoadingMore'u false yapar, loadMoreError set eder", () => {
    const before = successState({ isLoadingMore: true });
    const after = applyLoadMoreError(before, new Error("network hatası"));

    expect(after).toEqual({ ...before, isLoadingMore: false, loadMoreError: "network hatası" });
  });

  it("başarısız bir refresh sonrası da (nextCursor zaten null'ken) items korunur, kontrollü hata state'ine geçilir", () => {
    // refresh'in kendi hata yolu applyFreshSessionError'ı DEĞİL, applyLoadMoreError'ı
    // kullanıyor (bkz. use-feed.ts yorumu) — kullanıcının önündeki çalışan feed'i
    // tam ekran bir hataya çevirmemek için.
    const before = successState({ nextCursor: null, isLoadingMore: true });
    const after = applyLoadMoreError(before, new Error("refresh başarısız"));

    expect(after).toEqual({ ...before, isLoadingMore: false, loadMoreError: "refresh başarısız" });
  });

  it("hatadan sonra canLoadMore/canRefresh tekrar true döner — explicit retry mümkün", () => {
    const afterLoadMoreError = applyLoadMoreError(successState({ isLoadingMore: true }), new Error("boom"));
    expect(canLoadMore(afterLoadMoreError, false)).toBe(true);

    const afterRefreshError = applyLoadMoreError(successState({ nextCursor: null, isLoadingMore: true }), new Error("boom"));
    expect(canRefresh(false)).toBe(true);
    expect(afterRefreshError.status).toBe("success"); // tam ekran hataya düşmedi, retry edilebilir durumda
  });
});

describe("applyLoadMoreStart", () => {
  it("retry/refresh başlarken önceki loadMoreError'ı temizler", () => {
    const withError = successState({ loadMoreError: "eski hata" });
    const restarted = applyLoadMoreStart(withError);
    expect(restarted).toEqual({ ...withError, isLoadingMore: true, loadMoreError: null });
  });
});

describe("applyLoadMoreSuccess", () => {
  it("yeni sayfanın item'larını mevcutlara EKLER (üzerine yazmaz) — applyFreshSessionSuccess'in tam tersi", () => {
    const before = successState({ items: [item] });
    const newPage: FeedPage = { items: [item], nextCursor: null };

    const after = applyLoadMoreSuccess(before, newPage);

    expect(after).toMatchObject({ status: "success", items: [item, item], nextCursor: null, isLoadingMore: false, loadMoreError: null });
  });
});

describe("applyFreshSessionError", () => {
  it("Error instance'ından mesajı çıkarır", () => {
    expect(applyFreshSessionError(new Error("bağlantı koptu"))).toEqual({ status: "error", message: "bağlantı koptu" });
  });

  it("Error olmayan bir değer için genel bir mesaj döner", () => {
    expect(applyFreshSessionError("garip bir şey")).toEqual({ status: "error", message: "Bilinmeyen bir hata oluştu" });
  });
});
