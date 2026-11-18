/**
 * Sunucunun DOĞRULADIĞI abonelik sonucunu, abonelik yollarından (paywall/restore/hesap ekranı) bu bilgiye ihtiyacı olan
 * özelliklere (şimdilik okuma pratiği) taşıyan küçük süreç-içi yayın kanalı. Abonelik hook'ları tüketicileri bilmez
 * (ters bağımlılık yok); tüketiciler abonelik hook'larının içini bilmez. Bu yüzden kanal `subscription` özelliğine ait.
 *
 * BİLİNÇLİ OLARAK "yalnız değişimde yayınla" FİLTRESİ YOK: filtre, "son yayınlanan değer"i tutardı; oysa tüketicinin
 * gösterdiği durum başka yollarla (403, yenilenen liste) bundan sapabilir — örn. abonelik bitti, liste 403 ile yeniden
 * kilitlendi, kullanıcı yeniden satın aldı: son yayınlanan değer hâlâ `true` olduğundan olay yutulur ve liste doğrulanmış
 * satın almaya rağmen kilitli kalırdı. Gerekli/gereksiz kararı, GÖSTERİLEN duruma bakan tüketicide (bkz.
 * PassagesController.onAccessVerified); burada her doğrulanmış sonuç iletilir. Kullanıcı başına ayrıdır.
 *
 * `active` = sunucunun verified cevabı. Doğrulanamayan durumlar ("unknown", ağ/503) BURAYA GELMEZ: belirsizlik içeriği
 * silmek ya da açmak için gerekçe değil (sunucu RevenueCat'e ulaşamazsa refresh 503 döner, `active:false` DEĞİL).
 */
type Listener = (active: boolean) => void;

const listeners = new Map<string, Set<Listener>>();

export function publishAccessVerified(userId: string, active: boolean): void {
  for (const listener of [...(listeners.get(userId) ?? [])]) listener(active);
}

export function subscribeToAccessVerified(userId: string, listener: Listener): () => void {
  const set = listeners.get(userId) ?? new Set<Listener>();
  set.add(listener);
  listeners.set(userId, set);
  return () => {
    set.delete(listener);
    if (set.size === 0) listeners.delete(userId);
  };
}

/** Test yardımcısı: modül durumunu sıfırlar. */
export function resetAccessEventsForTests(): void {
  listeners.clear();
}
