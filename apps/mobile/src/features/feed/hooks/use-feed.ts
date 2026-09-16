import { useEffect, useRef, useState } from "react";
import type { FeedItem, FeedPage, FeedPreferences } from "@linguascroll/shared-types";
import { fetchFeed } from "../api/fetch-feed";

/**
 * Üç bağımsız boolean yerine discriminated union — aynı anda "hem loading hem
 * error" gibi imkansız bir kombinasyonu derleme zamanında imkansız kılar.
 *
 * "success" durumu artık pagination alt-state'lerini de taşıyor:
 *  - `nextCursor: null` → bu feed session'ı bitti. Chunk 8 kararı: bu OTOMATİK
 *    yeni bir session (cursor'sız istek) BAŞLATMAZ — ranking deterministic
 *    olduğu için hemen ardından başlayan bir session, affinity neredeyse hiç
 *    değişmediği için çarpıcı derecede benzer içeriği yeniden üretebilir. Yeni
 *    session sadece explicit bir kullanıcı eylemiyle (`refresh()`) başlar.
 *  - `isLoadingMore` / `loadMoreError` → hem `loadMore()` HEM `refresh()`
 *    çağrılarını yansıtır (ikisi de "arka planda bir devam isteği var" anlamına
 *    gelir) — ilk yüklemeyi ETKİLEMEZ (o `status: "loading"` ile ayrı temsil edilir).
 */
export type FeedState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | {
      status: "success";
      items: FeedItem[];
      nextCursor: string | null;
      isLoadingMore: boolean;
      loadMoreError: string | null;
    };

type SuccessFeedState = Extract<FeedState, { status: "success" }>;

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Bilinmeyen bir hata oluştu";
}

/**
 * Aşağıdaki saf fonksiyonlar useFeed'in TÜM state-transition mantığı — React'ten
 * (useState/useEffect/useRef) BAĞIMSIZ. Hook bunları BİREBİR kullanıyor (paralel
 * bir yeniden-implementasyon DEĞİL), bu yüzden bunları test etmek RN render
 * etmeden hook'un gerçek pagination/concurrency/retry/refresh davranışını kanıtlıyor.
 */

/** Concurrency guard'ı (aynı anda tek continuation request) HEM "session bitince otomatik devam etmeme" invariant'ını TEK kararda birleştiriyor. */
export function canLoadMore(state: FeedState, isFetching: boolean): state is SuccessFeedState & { nextCursor: string } {
  return !isFetching && state.status === "success" && state.nextCursor !== null;
}

/**
 * refresh()'in KENDİ guard'ı — loadMore'unkinden BİLEREK ayrı: refresh, mevcut
 * `state`'in ne olduğuna (loading/error/success, nextCursor null olsun ya da
 * olmasın) BAKMAKSIZIN her zaman denenebilir olmalı — TEK şart, aynı anda
 * başka bir request (loadMore YA DA önceki bir refresh) devam etmiyor olması.
 * Bu, "loadMore sırasında refresh tetiklenirse" ve "refresh sırasında başka
 * refresh tetiklenirse" senaryolarının İKİSİNİ de aynı paylaşılan `isFetching`
 * bayrağı üzerinden karşılıyor.
 */
export function canRefresh(isFetching: boolean): boolean {
  return !isFetching;
}

/**
 * Cursor'sız (fresh) bir session fetch'inin BAŞARI sonucu — hem ilk mount hem
 * refresh() bunu kullanıyor. BİLİNÇLİ OLARAK önceki state'i parametre almıyor:
 * yeni session'ın içeriği eskisinin ÜZERİNE YAZILIR (append değil) — bu,
 * "refresh eski items'a append etmez" invariant'ının, imkansız bir şekilde
 * ihlal edilemeyecek şekilde (fonksiyonun eski items'a erişimi bile yok)
 * kodlanmış hali.
 */
export function applyFreshSessionSuccess(page: FeedPage): SuccessFeedState {
  return { status: "success", items: page.items, nextCursor: page.nextCursor, isLoadingMore: false, loadMoreError: null };
}

/** Sadece İLK yüklemenin hatası için — henüz gösterilecek bir içerik yok, tam ekran hata state'i doğru. */
export function applyFreshSessionError(error: unknown): FeedState {
  return { status: "error", message: errorMessage(error) };
}

export function applyLoadMoreStart(state: FeedState): FeedState {
  return state.status === "success" ? { ...state, isLoadingMore: true, loadMoreError: null } : state;
}

export function applyLoadMoreSuccess(state: FeedState, page: FeedPage): FeedState {
  return state.status === "success"
    ? { ...state, items: [...state.items, ...page.items], nextCursor: page.nextCursor, isLoadingMore: false, loadMoreError: null }
    : state;
}

/**
 * Hata sonrası: mevcut `items` AYNEN korunur, `loadMoreError` set edilir —
 * kullanıcı explicit retry yapabilir. Bu fonksiyon HEM başarısız loadMore HEM
 * başarısız refresh için kullanılıyor (BİLİNÇLİ karar): refresh zaten var olan
 * bir session'ı görüntülerken tetikleniyor (bkz. FeedListFooter — sadece
 * `nextCursor === null` durumunda gösteriliyor), refresh başarısız olursa
 * kullanıcının önündeki çalışan feed'i tam ekran bir hataya çevirmek kötü bir
 * UX olurdu — applyFreshSessionError DEĞİL, bu fonksiyon kullanılıyor.
 */
export function applyLoadMoreError(state: FeedState, error: unknown): FeedState {
  return state.status === "success" ? { ...state, isLoadingMore: false, loadMoreError: errorMessage(error) } : state;
}

export function useFeed(
  userId: string,
  preference?: FeedPreferences,
): { state: FeedState; loadMore: () => void; refresh: () => Promise<void> } {
  const [state, setState] = useState<FeedState>({ status: "loading" });

  // TEK paylaşılan concurrency guard — initial mount fetch, loadMore() ve
  // refresh() ÜÇÜ de bunu kullanıyor. Ref (state değil) olması bilinçli: mutation
  // senkron, aynı tick içinde art arda gelen çağrılar bile (FlatList'in
  // `onEndReached`'i momentum scroll'da birden fazla tetikleyebiliyor, veya
  // kullanıcı loadMore devam ederken refresh'e basarsa) ikinci bir fetchFeed'i
  // tetiklemeden önce bu guard'ı görür. Bu, "eski bir loadMore response'unun
  // refresh sonrası yeni session state'ine append olması" race'ini de önlüyor:
  // refresh, bir loadMore devam ederken guard tarafından zaten engellenir —
  // ikisi ASLA aynı anda in-flight olamaz.
  const isFetchingRef = useRef(false);

  /**
   * Cursor'sız bir "fresh session" fetch'inin ORTAK iskeleti — guard set/clear +
   * fetchFeed çağrısı BURADA, TEK yerde yazılı. Başarı/hata durumunda state'e
   * NASIL yansıtılacağı çağırana bırakılıyor (mount ve refresh'in ihtiyaçları
   * farklı: mount'ın kendi `isCancelled` sarmalaması var, refresh'in hata
   * davranışı applyLoadMoreError'ı yeniden kullanıyor — bkz. yukarısı).
   *
   * Dönen Promise BİLEREK reject de edebiliyor (onError çağrıldıktan SONRA
   * re-throw) — refresh()'in çağıranı (Feed.tsx), state'i tekrar okumadan,
   * SADECE bu promise'in resolve/reject olmasına bakarak "başarılı mıydı"
   * bilebilsin diye (bkz. Feed.tsx'teki scroll-to-top mantığı). Mount effect'i
   * bu promise'i hiç TÜKETMİYOR (aşağıda `.catch(() => {})` ile kasıtlı olarak
   * yutuluyor) — zaten kendi onError'ı üzerinden state'i güncelliyor, unhandled
   * rejection riskini önlemek için bu yeterli.
   */
  function requestFreshSession(onSuccess: (page: FeedPage) => void, onError: (error: unknown) => void): Promise<void> {
    isFetchingRef.current = true;
    return fetchFeed(userId, undefined, preference).then(
      (page) => {
        isFetchingRef.current = false;
        onSuccess(page);
      },
      (error: unknown) => {
        isFetchingRef.current = false;
        onError(error);
        throw error;
      },
    );
  }

  useEffect(() => {
    let isCancelled = false;
    setState({ status: "loading" });

    requestFreshSession(
      (page) => {
        if (!isCancelled) {
          setState(applyFreshSessionSuccess(page));
        }
      },
      (error) => {
        if (!isCancelled) {
          setState(applyFreshSessionError(error));
        }
      },
    ).catch(() => {
      // Hata zaten yukarıdaki onError üzerinden state'e yansıtıldı — burada
      // sadece unhandled rejection oluşmasını önlüyoruz.
    });

    return () => {
      isCancelled = true;
    };
    // `preference` App.tsx'te onboarding tamamlanana kadar Feed HİÇ mount
    // edilmediği için stabil bir referans (bkz. App.tsx) — yine de deps'te
    // açıkça listeleniyor, gelecekte bu varsayım bozulursa effect doğru
    // şekilde yeniden çalışsın diye.
  }, [userId, preference]);

  function loadMore(): void {
    if (!canLoadMore(state, isFetchingRef.current)) {
      return;
    }

    isFetchingRef.current = true;
    const cursor = state.nextCursor;
    setState((current) => applyLoadMoreStart(current));

    fetchFeed(userId, cursor)
      .then((page) => {
        isFetchingRef.current = false;
        setState((current) => applyLoadMoreSuccess(current, page));
      })
      .catch((error: unknown) => {
        isFetchingRef.current = false;
        setState((current) => applyLoadMoreError(current, error));
      });
  }

  /**
   * Chunk 8 §5 düzeltmesi — explicit "feed'i yenile" eylemi. Mevcut cursor'ı
   * HİÇ okumuyor (state'ten `nextCursor` almıyor) — bu, "refresh mevcut session
   * cursor'ını kullanmamalı" invariant'ının kodda görünür hali. Tek guard:
   * `canRefresh` — başka bir request (loadMore YA DA önceki bir refresh) devam
   * etmiyor olmalı.
   *
   * Promise döner (resolve=başarılı, reject=başarısız) — Feed.tsx bunu
   * "yeni session başarıyla geldiyse listeyi başa kaydır" kararı için kullanıyor
   * (state'i tekrar okumadan, sadece bu promise'in sonucuna bakarak).
   */
  function refresh(): Promise<void> {
    if (!canRefresh(isFetchingRef.current)) {
      return Promise.resolve();
    }

    setState((current) => applyLoadMoreStart(current));
    return requestFreshSession(
      (page) => setState(applyFreshSessionSuccess(page)),
      (error) => setState((current) => applyLoadMoreError(current, error)),
    );
  }

  return { state, loadMore, refresh };
}
