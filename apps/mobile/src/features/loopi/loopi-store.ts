import {
  emptyLoopiState,
  openLoopiCard,
  parseLoopiState,
  recordCreated,
  removeWord,
  type LoopiReveal,
  type LoopiState,
  type SavedWordForReveal,
} from "./loopi-state";

/**
 * 2026-11-17 — Loopi durumunun kalıcı deposu + değişiklik yayıncısı. AsyncStorage'ı DOĞRUDAN import etmez:
 * `KeyValueStore` dışarıdan verilir (üretimde loopi-store-instance.ts AsyncStorage'ı bağlar), böylece sıralama/
 * bozuk veri/hesap ayrımı testleri Node'da, native modülsüz ve sahte bir gecikmeli depoyla koşar.
 *
 * Yazmalar KULLANICI BAŞINA bir promise zinciriyle sıralanır: iki hızlı kayıt (iki ayrı kelime) aynı anda
 * "oku → değiştir → yaz" yaparsa ikincisi birincinin yazdığını EZERDİ (kayıp güncelleme). Zincir her
 * güncellemeyi bir öncekinin yazması bittikten sonra okutur. Farklı kullanıcılar birbirini beklemez.
 */
export type KeyValueStore = {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
};

export type LoopiStore = {
  read(userId: string): Promise<LoopiState>;
  update(userId: string, change: (state: LoopiState) => LoopiState): Promise<LoopiState>;
  clear(userId: string): Promise<void>;
  /** Sunucu created:true dedi → bekleyene ekle ve dinleyenlere haber ver (Feed'deki nokta, açık kart). */
  recordWordCreated(userId: string, wordId: string): Promise<void>;
  /** Başarılı unsave → bekleyenden çıkar ve haber ver. */
  recordWordRemoved(userId: string, wordId: string): Promise<void>;
  /**
   * Kelimelerim kartı açıldı: openLoopiCard'ı kuyruk içinde uygular ("görüldü" yazar), oynatılacak şeyi döner ve
   * dinleyenlere haber verir. Haber vermek ŞART: Feed'deki lime nokta yalnız bildirimle yeniden hesaplanır; Feed
   * arkada açık kalırsa (bugün App.tsx Kelimelerim'e geçince Feed'i söküyor) nokta aksi halde takılı kalırdı.
   */
  openCard(userId: string, savedWords: readonly SavedWordForReveal[]): Promise<LoopiReveal | null>;
  subscribe(listener: (userId: string) => void): () => void;
};

export function loopiStorageKey(userId: string): string {
  return `looplish.loopi.v1.${userId}`;
}

export function createLoopiStore(kv: KeyValueStore): LoopiStore {
  const queues = new Map<string, Promise<unknown>>();
  const listeners = new Set<(userId: string) => void>();

  // Aynı kullanıcının işlemlerini sıraya koyar. Önceki işlem hata verse de zincir devam eder.
  function enqueue<T>(userId: string, task: () => Promise<T>): Promise<T> {
    const previous = queues.get(userId) ?? Promise.resolve();
    const next = previous.catch(() => undefined).then(task);
    queues.set(userId, next);
    return next;
  }

  async function readNow(userId: string): Promise<LoopiState> {
    try {
      return parseLoopiState(await kv.getItem(loopiStorageKey(userId)));
    } catch {
      return emptyLoopiState();
    }
  }

  function notify(userId: string): void {
    for (const listener of [...listeners]) listener(userId);
  }

  const store: LoopiStore = {
    // Okuma da kuyruğa girer: bekleyen bir yazmadan ÖNCEKİ eski değeri görmesin.
    read: (userId) => enqueue(userId, () => readNow(userId)),
    update: (userId, change) =>
      enqueue(userId, async () => {
        const next = change(await readNow(userId));
        await kv.setItem(loopiStorageKey(userId), JSON.stringify(next));
        return next;
      }),
    clear: (userId) => enqueue(userId, () => kv.removeItem(loopiStorageKey(userId))),
    async recordWordCreated(userId, wordId) {
      await store.update(userId, (state) => recordCreated(state, wordId));
      notify(userId);
    },
    async recordWordRemoved(userId, wordId) {
      await store.update(userId, (state) => removeWord(state, wordId));
      notify(userId);
    },
    async openCard(userId, savedWords) {
      let reveal: LoopiReveal | null = null;
      await store.update(userId, (state) => {
        const result = openLoopiCard(state, savedWords);
        reveal = result.reveal;
        return result.nextState;
      });
      notify(userId);
      return reveal;
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
  return store;
}
