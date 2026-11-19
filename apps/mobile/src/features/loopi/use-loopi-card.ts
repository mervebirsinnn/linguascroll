import { useEffect, useRef, useState } from "react";
import type { LoopiReveal, SavedWordForReveal } from "./loopi-state";
import { loopiStore } from "./loopi-store-instance";

export type LoopiCardModel = { status: "loading" } | { status: "ready"; reveal: LoopiReveal | null };

/**
 * 2026-11-17 — Kelimelerim kartı açılırken bir kez: depodaki durumu sunucunun güncel listesiyle karşılaştırır,
 * oynatılacak bir şey varsa HEMEN "görüldü" yazar (kullanıcı animasyon bitmeden çıkarsa tekrar oynamaz) ve
 * dinleyenlere (Feed'deki nokta) haber verir — bkz. loopiStore.openCard. Karar mantığı saf `openLoopiCard`'da.
 * Depo okunamazsa kart yine çizilir (animasyonsuz, güncel boy) — Loopi kelime listesini asla engellemez.
 *
 * Açılış promise'i bileşen ömrü boyunca ref'te TEK kez oluşturulur, her efekt çalışması kendi `cancelled`
 * bayrağıyla ona abone olur. Böylece StrictMode'un "efekt → temizlik → efekt" çifti açılışı ikinci kez
 * yapmaz (ikinci kez yapsaydı ilk açılış "görüldü" yazdığı için reveal kaybolurdu) ve ikinci efekt sonucu
 * yine alır (ilk sürümde ref erken dönüş + cancelled birlikte kartı "loading"de bırakıyordu).
 */
export function useLoopiCard(userId: string, savedWords: readonly SavedWordForReveal[]): LoopiCardModel {
  const [model, setModel] = useState<LoopiCardModel>({ status: "loading" });
  const opening = useRef<Promise<LoopiReveal | null> | null>(null);

  useEffect(() => {
    let cancelled = false;
    // savedWords bilinçli olarak bağımlılık DEĞİL: kart açılışı başına tek karar (liste bu ekranda değişmiyor).
    opening.current ??= loopiStore.openCard(userId, savedWords).catch(() => null);
    opening.current.then((reveal) => {
      if (!cancelled) setModel({ status: "ready", reveal });
    });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  return model;
}
