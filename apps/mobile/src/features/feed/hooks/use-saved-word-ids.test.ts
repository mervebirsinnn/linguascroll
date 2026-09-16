import type { FeedItem } from "@linguascroll/shared-types";
import {
  applyToggleSuccess,
  canToggleSave,
  computeIsSaved,
  deriveServerSavedWordIds,
  toggleSaveWord,
} from "./use-saved-word-ids";

/**
 * `useSavedWordIds`'in state-transition mantığı React'ten bağımsız saf
 * fonksiyonlara çıkarıldığı için (hook bunları BİREBİR kullanıyor), bu testler
 * RN render etmeden (RNTL/jest-expo gerekmeden) cross-occurrence consistency,
 * concurrency guard ve refresh/loadMore sonrası merge semantics'i kanıtlıyor.
 *
 * NOT: `userId` değişince hook'un `confirmedOverrides`/`pendingWordIds`'ı
 * GERÇEKTEN sıfırladığı ([userId]-keyed useEffect) — hook'un kendi imperatif
 * lifecycle'ının bir gerçeği; RN render etmeden otomatik test edilemiyor (bkz.
 * use-feed.test.ts'teki aynı sınır, refresh() için). Aşağıdaki "userId context
 * switch" testi, bu reset GERÇEKLEŞTİĞİNDE sonucun doğru olduğunu (eski
 * override'ın yeni context'e sızmadığını) kanıtlıyor — reset'in KENDİSİNİN
 * tetiklendiği kod incelemesiyle doğrulanıyor (tek satırlık, use-feed.ts'teki
 * aynı desenin tekrarı).
 */

const WORD_JOURNEY = "00000000-0000-4000-9000-000000000001";
const WORD_HABIT = "00000000-0000-4000-9000-000000000002";
const USER_ID = "00000000-0000-4000-8000-000000000001";

function makeVideoItem(videoId: string, vocabulary: { wordId: string; saved: boolean }[]): FeedItem {
  return {
    type: "video",
    video: {
      id: videoId,
      learningLanguage: "en",
      cefrLevel: "A1",
      topic: "travel",
      durationMs: 1000,
      playbackUrl: `https://example.com/${videoId}.mp4`,
      vocabulary: vocabulary.map(({ wordId, saved }) => ({
        word: { id: wordId, language: "en", lemma: "x", gloss: "y" },
        saved,
      })),
      segments: [],
    },
  };
}

describe("deriveServerSavedWordIds", () => {
  it("aynı wordId iki farklı yüklü videoda bulunuyorsa TEK bir sette birleşir", () => {
    const items = [
      makeVideoItem("video-a", [{ wordId: WORD_JOURNEY, saved: true }]),
      makeVideoItem("video-b", [{ wordId: WORD_JOURNEY, saved: true }]),
    ];
    const result = deriveServerSavedWordIds(items);
    expect(result).toEqual(new Set([WORD_JOURNEY]));
  });

  it("saved=false olan kelimeler sete hiç girmez", () => {
    const items = [makeVideoItem("video-a", [{ wordId: WORD_HABIT, saved: false }])];
    expect(deriveServerSavedWordIds(items).has(WORD_HABIT)).toBe(false);
  });
});

describe("computeIsSaved — refresh/loadMore sonrası merge semantics (kritik düzeltme)", () => {
  it("server snapshot'ı true, confirmed override yok → effective true", () => {
    const serverSavedWordIds = new Set([WORD_JOURNEY]);
    expect(computeIsSaved(serverSavedWordIds, new Map(), WORD_JOURNEY)).toBe(true);
  });

  it("server journey=true, başarılı local UNSAVE sonrası → yeni (refresh/loadMore) snapshot journey=true taşısa bile effective FALSE kalır", () => {
    // Bu, düzeltilen bug'ın regresyon testi: eski union-only tasarımda bu senaryo
    // journey'yi yanlışlıkla saved=true'ya geri döndürüyordu.
    const oldServerSnapshot = new Set([WORD_JOURNEY]); // eski (donmuş) items'tan türetilmiş
    const confirmedOverrides = applyToggleSuccess(new Map(), WORD_JOURNEY, false); // başarılı unsave

    // Sonra normal bir loadMore/refresh olur, YENİ items'tan yeniden türetilen
    // snapshot'ta journey HÂLÂ true (backend henüz güncellenmemiş bir response
    // döndürmüş olabilir, ya da eski bir sayfa tekrar dahil olmuş olabilir).
    const newServerSnapshot = deriveServerSavedWordIds([makeVideoItem("video-c", [{ wordId: WORD_JOURNEY, saved: true }])]);
    expect(newServerSnapshot.has(WORD_JOURNEY)).toBe(true); // snapshot'ın kendisi "stale" gösteriyor

    expect(computeIsSaved(oldServerSnapshot, confirmedOverrides, WORD_JOURNEY)).toBe(false);
    expect(computeIsSaved(newServerSnapshot, confirmedOverrides, WORD_JOURNEY)).toBe(false);
  });

  it("server journey=false, başarılı local SAVE sonrası → yeni snapshot journey=false taşısa bile effective TRUE kalır", () => {
    const confirmedOverrides = applyToggleSuccess(new Map(), WORD_JOURNEY, true);
    const newServerSnapshot = deriveServerSavedWordIds([makeVideoItem("video-c", [{ wordId: WORD_JOURNEY, saved: false }])]);

    expect(computeIsSaved(newServerSnapshot, confirmedOverrides, WORD_JOURNEY)).toBe(true);
  });

  it("aynı wordId iki farklı video occurrence'ı, save success sonrası ikisi de true okur (shared state)", () => {
    const confirmedOverrides = applyToggleSuccess(new Map(), WORD_JOURNEY, true);
    const serverSavedWordIds = new Set<string>();

    // İki occurrence da AYNI (serverSavedWordIds, confirmedOverrides) çiftinden okunuyor.
    expect(computeIsSaved(serverSavedWordIds, confirmedOverrides, WORD_JOURNEY)).toBe(true);
    expect(computeIsSaved(serverSavedWordIds, confirmedOverrides, WORD_JOURNEY)).toBe(true);
  });

  it("unsave success sonrası iki occurrence de false okur", () => {
    const confirmedOverrides = applyToggleSuccess(new Map([[WORD_JOURNEY, true]]), WORD_JOURNEY, false);
    const serverSavedWordIds = new Set([WORD_JOURNEY]);

    expect(computeIsSaved(serverSavedWordIds, confirmedOverrides, WORD_JOURNEY)).toBe(false);
  });
});

describe("userId context switch — confirmedOverrides sızıntı regresyonu (Chunk 9 review düzeltmesi)", () => {
  it("A kullanıcısı için oluşturulan confirmed override, sıfırlanmış (B kullanıcısına geçiş) bir confirmedOverrides'ta effective state'e sızmaz", () => {
    // User A: journey'yi save eder → confirmedOverrides = {journey: true}.
    const userAOverrides = applyToggleSuccess(new Map(), WORD_JOURNEY, true);
    expect(computeIsSaved(new Set(), userAOverrides, WORD_JOURNEY)).toBe(true);

    // useSavedWordIds'in [userId]-keyed reset effect'i (bkz. hook'un kendi
    // yorumu) userId değişince confirmedOverrides'ı YENİ, boş bir Map'e resetler
    // — burada bunu simüle ediyoruz. Reset sonrası (User B context'i) journey
    // için hiçbir override kalmamalı, effective state server snapshot'ına
    // (bu örnekte boş — B hiç kaydetmedi) düşmeli.
    const userBOverrides = new Map<string, boolean>();
    expect(computeIsSaved(new Set(), userBOverrides, WORD_JOURNEY)).toBe(false);

    // A'nın override'ının kendisi hâlâ orada dursa bile (referans başka bir
    // değişkende tutulsa da), B'nin context'i ondan tamamen bağımsız.
    expect(computeIsSaved(new Set(), userAOverrides, WORD_JOURNEY)).toBe(true);
  });
});

describe("canToggleSave", () => {
  it("aynı wordId pending iken false döner", () => {
    expect(canToggleSave(new Set([WORD_JOURNEY]), WORD_JOURNEY)).toBe(false);
  });

  it("farklı bir wordId pending iken true döner — birbirini bloklamaz", () => {
    expect(canToggleSave(new Set([WORD_JOURNEY]), WORD_HABIT)).toBe(true);
  });
});

describe("toggleSaveWord — gerçek concurrency seam'i (ref-guarded, RN render gerektirmez)", () => {
  function makeDeps() {
    return {
      saveWord: jest.fn().mockResolvedValue(undefined),
      unsaveWord: jest.fn().mockResolvedValue(undefined),
    };
  }

  it("aynı wordId için art arda iki çağrı — API mock'u YALNIZ 1 kez çağrılır", () => {
    const deps = makeDeps();
    const pending = new Set<string>();

    toggleSaveWord(WORD_JOURNEY, USER_ID, false, pending, () => {}, () => {}, undefined, deps);
    toggleSaveWord(WORD_JOURNEY, USER_ID, false, pending, () => {}, () => {}, undefined, deps);

    expect(deps.saveWord).toHaveBeenCalledTimes(1);
  });

  it("farklı wordId'ler birbirini bloklamaz — ikisi de çağrılır", () => {
    const deps = makeDeps();
    const pending = new Set<string>();

    toggleSaveWord(WORD_JOURNEY, USER_ID, false, pending, () => {}, () => {}, undefined, deps);
    toggleSaveWord(WORD_HABIT, USER_ID, false, pending, () => {}, () => {}, undefined, deps);

    expect(deps.saveWord).toHaveBeenCalledTimes(2);
  });

  it("başarı sonrası onSuccess(wordId, nowSaved) çağrılır, pending temizlenir", async () => {
    const deps = makeDeps();
    const pending = new Set<string>();
    const onSuccess = jest.fn();
    const onPendingChange = jest.fn();

    toggleSaveWord(WORD_JOURNEY, USER_ID, false, pending, onPendingChange, onSuccess, undefined, deps);
    await Promise.resolve().then(() => Promise.resolve()); // mikro-task kuyruğunu boşalt

    expect(onSuccess).toHaveBeenCalledWith(WORD_JOURNEY, true);
    expect(pending.has(WORD_JOURNEY)).toBe(false);
  });

  it("mutation reddedilirse onSuccess HİÇ çağrılmaz, pending yine de temizlenir", async () => {
    const deps = { saveWord: jest.fn().mockRejectedValue(new Error("network")), unsaveWord: jest.fn() };
    const pending = new Set<string>();
    const onSuccess = jest.fn();

    toggleSaveWord(WORD_JOURNEY, USER_ID, false, pending, () => {}, onSuccess, undefined, deps);
    await Promise.resolve().then(() => Promise.resolve());

    expect(onSuccess).not.toHaveBeenCalled();
    expect(pending.has(WORD_JOURNEY)).toBe(false);
  });

  it("currentlySaved=true verildiğinde unsaveWord çağrılır (saveWord değil)", () => {
    const deps = makeDeps();
    toggleSaveWord(WORD_JOURNEY, USER_ID, true, new Set(), () => {}, () => {}, undefined, deps);
    expect(deps.unsaveWord).toHaveBeenCalledWith(WORD_JOURNEY, USER_ID);
    expect(deps.saveWord).not.toHaveBeenCalled();
  });

  it("sourceSegmentId verilmişse saveWord'e AYNEN iletilir", () => {
    const deps = makeDeps();
    const SEGMENT_ID = "00000000-0000-4000-a000-000000000001";
    toggleSaveWord(WORD_JOURNEY, USER_ID, false, new Set(), () => {}, () => {}, SEGMENT_ID, deps);
    expect(deps.saveWord).toHaveBeenCalledWith(WORD_JOURNEY, USER_ID, SEGMENT_ID);
  });
});
