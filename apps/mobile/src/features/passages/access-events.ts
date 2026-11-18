/**
 * Sunucunun DOĞRULADIĞI abonelik erişimi değişikliklerini, abonelik yollarından (paywall/restore/hesap ekranı) okuma
 * pratiğine taşıyan küçük süreç-içi yayın kanalı. Neden ayrı modül: abonelik hook'ları passages'ı bilmemeli (ters bağımlılık
 * olurdu); passages de abonelik hook'larının içini bilmemeli. İkisinin ortak noktası yalnız "bu kullanıcı için sunucu şu
 * erişimi doğruladı" bilgisi.
 *
 * Yalnız DEĞİŞİMDE yayınlar: aynı kullanıcı için son yayınlanan değerle aynıysa sessiz kalır (hesap ekranı her
 * yenilendiğinde passages'ı gereksiz yeniden çekmesin). Kullanıcı başına ayrı tutulur (hesap değişince eski kullanıcının
 * değeri yenisini bastırmaz). İLK yayın (bilinen değer yok) her zaman iletilir: passages erişimi bilmeden yüklenmiş olabilir.
 *
 * `active` = sunucunun verified cevabı. Doğrulanamayan/bilinmeyen durumlar ("unknown", ağ hatası) BURAYA GELMEZ: belirsizlik
 * içeriği silmek ya da açmak için gerekçe değil.
 */
type Listener = (active: boolean) => void;

const lastVerified = new Map<string, boolean>();
const listeners = new Map<string, Set<Listener>>();

export function publishAccessVerified(userId: string, active: boolean): void {
  if (lastVerified.get(userId) === active) return;
  lastVerified.set(userId, active);
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
  lastVerified.clear();
  listeners.clear();
}
