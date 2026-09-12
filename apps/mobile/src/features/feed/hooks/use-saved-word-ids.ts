import { useEffect, useMemo, useRef, useState } from "react";
import type { FeedItem } from "@linguascroll/shared-types";
import { saveWord } from "../api/save-word";
import { unsaveWord } from "../api/unsave-word";

/**
 * `video_words` many-to-many olduğu için aynı wordId aynı anda yüklü feed'de
 * birden fazla videoda görünebilir — bu hook, TÜM occurrence'ların TEK bir
 * mantıksal saved-state okumasını garanti eder (bkz. Chunk 9 tasarım kararı).
 * `Feed.tsx` seviyesinde yaşar, `VideoFeedItem`'a prop-threading ile aktarılır —
 * global bir store YOK, `useFeed`'e de hiç dokunulmuyor (ayrı, kardeş bir hook).
 *
 * İKİ KATMANLI state (BİLİNÇLİ tasarım — tek katmanlı bir "union-only" ilk
 * tasarım YANLIŞTI, bkz. deriveServerSavedWordIds'in yorumu):
 *
 *  - `serverSavedWordIds` — `items`'tan HER RENDER'DA yeniden türetilen (useMemo)
 *    bir "server snapshot".
 *  - `confirmedOverrides` — bu session içinde backend'in ONAYLADIĞI (başarılı
 *    save/unsave) sonuç. `refresh()`/`loadMore()` dahil hiçbir `items`
 *    değişikliğiyle sıfırlanmıyor.
 *
 * isSaved(wordId) = confirmedOverrides.has(wordId) ? override : serverSavedWordIds.has(wordId)
 *
 * USER-SCOPED (Chunk 9 review düzeltmesi): `confirmedOverrides`/`pendingWordIds`
 * aslında user-specific state — aynı `Feed` component instance'ında `userId`
 * değişirse (teorik olarak, örn. hesap değişimi), A kullanıcısının local
 * override/pending'i B kullanıcısına SIZMAMALI. Bu yüzden hook artık `userId`'yi
 * kendisi alıyor (dışarıdan her `toggleSave` çağrısında taşınmıyor) ve `userId`
 * değiştiğinde üç state'i de (`confirmedOverrides`, `pendingWordIds` state'i,
 * `pendingWordIdsRef`) sıfırlıyor — `useFeed`'in kendi `[userId]`-keyed mount
 * effect'iyle AYNI, zaten kanıtlanmış desen (bkz. use-feed.ts).
 */
export function useSavedWordIds(
  userId: string,
  items: FeedItem[],
): {
  isSaved: (wordId: string) => boolean;
  isPending: (wordId: string) => boolean;
  toggleSave: (wordId: string, sourceSegmentId?: string | null) => void;
} {
  const serverSavedWordIds = useMemo(() => deriveServerSavedWordIds(items), [items]);
  const [confirmedOverrides, setConfirmedOverrides] = useState<Map<string, boolean>>(new Map());

  // Concurrency guard'ı Chunk 8'deki isFetchingRef deseninin AYNISI: senkron bir
  // ref — React state timing'ine değil. Aynı wordId için art arda gelen iki
  // toggleSave çağrısından ikincisi, İLK await'ten (ağ isteğinden) önce bile
  // güvenle engellenir. `pendingWordIds` (state) sadece UI render'ı için;
  // gerçek guard otoritesi ref'te.
  const pendingWordIdsRef = useRef<Set<string>>(new Set());
  const [pendingWordIds, setPendingWordIds] = useState<Set<string>>(new Set());

  // userId değişince (farklı bir kullanıcı context'i) önceki kullanıcının
  // confirmed/pending state'i tamamen sıfırlanır — sızıntı yok.
  useEffect(() => {
    setConfirmedOverrides(new Map());
    pendingWordIdsRef.current = new Set();
    setPendingWordIds(new Set());
  }, [userId]);

  function isSaved(wordId: string): boolean {
    return computeIsSaved(serverSavedWordIds, confirmedOverrides, wordId);
  }

  function isPending(wordId: string): boolean {
    return pendingWordIds.has(wordId);
  }

  function toggleSave(wordId: string, sourceSegmentId?: string | null): void {
    toggleSaveWord(
      wordId,
      userId,
      isSaved(wordId),
      pendingWordIdsRef.current,
      (next) => setPendingWordIds(next),
      (id, nowSaved) => setConfirmedOverrides((current) => applyToggleSuccess(current, id, nowSaved)),
      sourceSegmentId,
    );
  }

  return { isSaved, isPending, toggleSave };
}

/**
 * items'tan HER ÇAĞRIDA baştan türetilen "server snapshot". Yeniden türetilmesi
 * ÖNEMLİ (union/büyütme DEĞİL): loadMore item'ları mevcut diziye EKLER (eski,
 * donmuş item'lar dizide kalır), refresh ise diziyi TAMAMEN DEĞİŞTİRİR. Eğer bu
 * snapshot'ı items değiştikçe eskisiyle UNION edip büyütseydik (ilk hatalı
 * tasarım), başarılı bir local unsave'in hemen ardından gelen bir loadMore, o
 * kelimeyi eski (donmuş, unsave'den önceki) "saved:true" değeriyle sessizce
 * GERİ GETİRİRDİ — bu bir race condition değil, deterministik bir bug'dı.
 * `confirmedOverrides` (yukarısı) bu fonksiyonun ürettiği snapshot'ı her zaman
 * ezdiği için, snapshot'ın "eski" olması artık zararsız.
 */
export function deriveServerSavedWordIds(items: FeedItem[]): Set<string> {
  const wordIds = new Set<string>();
  for (const item of items) {
    if (item.type !== "video") {
      continue;
    }
    for (const vocabularyItem of item.video.vocabulary) {
      if (vocabularyItem.saved) {
        wordIds.add(vocabularyItem.word.id);
      }
    }
  }
  return wordIds;
}

/** confirmedOverrides varsa öncelikli, yoksa server snapshot'ına düş. */
export function computeIsSaved(
  serverSavedWordIds: ReadonlySet<string>,
  confirmedOverrides: ReadonlyMap<string, boolean>,
  wordId: string,
): boolean {
  const override = confirmedOverrides.get(wordId);
  return override !== undefined ? override : serverSavedWordIds.has(wordId);
}

/** Aynı wordId için zaten bir mutation in-flight ise false — farklı wordId'ler birbirini bloklamaz. */
export function canToggleSave(pendingWordIds: ReadonlySet<string>, wordId: string): boolean {
  return !pendingWordIds.has(wordId);
}

export function applyToggleSuccess(
  confirmedOverrides: ReadonlyMap<string, boolean>,
  wordId: string,
  nowSaved: boolean,
): Map<string, boolean> {
  return new Map(confirmedOverrides).set(wordId, nowSaved);
}

/**
 * Hook'un DIŞINDA, React'e hiç ihtiyaç duymadan test edilebilir gerçek mutation
 * seam'i — `useSavedWordIds` bunu BİREBİR kullanıyor (paralel bir yeniden-
 * implementasyon DEĞİL). `pendingWordIdsRef` düz bir mutable Set (üretimde
 * `useRef.current`, testte düz bir `new Set()`) — guard kontrolü ve `.add()`
 * İLK satırda, senkron, `saveWord`/`unsaveWord`'a hiç ulaşmadan önce. Bu yüzden
 * aynı wordId için art arda iki çağrı, React state timing'ine bağlı olmadan,
 * ikinci ağ isteğini hiç başlatmaz.
 *
 * Başarı/hata farketmeksizin `finally`'de pending ref'ten VE (onPendingChange
 * ile) UI state'inden temizleniyor. Hata durumunda `onSuccess` hiç çağrılmıyor —
 * confirmedOverrides'a dokunulmuyor (server-confirmed UI, Chunk 9 kararı).
 */
export function toggleSaveWord(
  wordId: string,
  userId: string,
  currentlySaved: boolean,
  pendingWordIdsRef: Set<string>,
  onPendingChange: (next: Set<string>) => void,
  onSuccess: (wordId: string, nowSaved: boolean) => void,
  sourceSegmentId?: string | null,
  deps: { saveWord: typeof saveWord; unsaveWord: typeof unsaveWord } = { saveWord, unsaveWord },
): void {
  if (!canToggleSave(pendingWordIdsRef, wordId)) {
    return;
  }

  const nowSaving = !currentlySaved;
  pendingWordIdsRef.add(wordId);
  onPendingChange(new Set(pendingWordIdsRef));

  // sourceSegmentId sadece SAVE ederken anlamlı — unsave'de kaynak context
  // kavramı yok (kayıt zaten siliniyor).
  const mutate = nowSaving ? deps.saveWord(wordId, userId, sourceSegmentId) : deps.unsaveWord(wordId, userId);
  mutate
    .then(() => {
      onSuccess(wordId, nowSaving);
    })
    .catch(() => {
      // Server-confirmed UI: başarısız mutation onSuccess'i hiç TETİKLEMİYOR —
      // confirmedOverrides değişmiyor, feed kullanılabilir kalmaya devam ediyor.
    })
    .finally(() => {
      pendingWordIdsRef.delete(wordId);
      onPendingChange(new Set(pendingWordIdsRef));
    });
}
