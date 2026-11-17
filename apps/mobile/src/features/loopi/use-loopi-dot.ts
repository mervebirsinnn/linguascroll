import { useEffect, useState } from "react";
import { fetchWordsProgress } from "../memory/api/fetch-words-progress";
import { initializeIfMissing, shouldShowLoopiDot } from "./loopi-state";
import { loopiStore } from "./loopi-store-instance";

/** Art arda kayıtlar tek /words/progress isteğine birleştirilir. */
const RECHECK_DELAY_MS = 1000;

/**
 * 2026-11-17 — "Kelimelerim" düğmesindeki lime nokta. Feed açılınca BİR kez + bu kullanıcının her yeni kayıt/
 * silme bildiriminden sonra (1 sn birleştirilmiş) GET /words/progress ile güncel sayıyı alır. Açılıştaki istek
 * bilinçli (ürün kararı c): yalnız kayıt sonrası bakılsaydı başka cihazda geçilen eşikte nokta hiç çıkmazdı.
 *
 * Nokta süs: istek/depo hatası sessizce yutulur, Feed'i asla bozmaz. Bu cihazda ilk kez açılıyorsa durum burada
 * sessizce başlatılır (bekleyen kayıtlar "görülmemiş" kalsın diye boydan düşülür) — eski eşikler için nokta yok.
 *
 * Noktanın sönmesi: Kelimelerim kartı açılınca loopiStore.openCard "görüldü" yazar ve HABER VERİR; bu hook o
 * bildirimle yeniden hesaplar. Feed'in o sırada sökülmüş olmasına (bugünkü App.tsx davranışı) dayanılmaz.
 */
export function useLoopiDot(userId: string): boolean {
  const [showDot, setShowDot] = useState(false);
  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    async function check(): Promise<void> {
      try {
        const { savedCount } = await fetchWordsProgress();
        // Feed bu arada söküldüyse ne depoya yazılır ne state güncellenir (istek boşa gitti, o kadar).
        if (cancelled) return;
        const state = await loopiStore.update(userId, (current) => initializeIfMissing(current, savedCount, current.pending.length));
        if (!cancelled) setShowDot(shouldShowLoopiDot(state, savedCount));
      } catch {
        // Nokta yalnızca bir ipucu; hata durumunda önceki değer kalır.
      }
    }

    void check();
    const unsubscribe = loopiStore.subscribe((changedUserId) => {
      if (changedUserId !== userId) return;
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => void check(), RECHECK_DELAY_MS);
    });
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      unsubscribe();
    };
  }, [userId]);
  return showDot;
}
