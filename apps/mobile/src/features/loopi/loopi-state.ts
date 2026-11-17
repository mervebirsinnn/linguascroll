import { z } from "zod";
import { getLoopiStage } from "./loopi-stage";

/**
 * 2026-11-17 — Loopi'nin cihazda, HESAP (userId) başına tutulan durumu. Saf fonksiyonlar (React/AsyncStorage
 * bilmez) — use-feed.ts'teki desen: hook'lar ve kayıt noktaları yalnız bunları çağırır, testler React'siz koşar.
 *
 *  - `seenStage`: kullanıcının kartta GÖRDÜĞÜ son boy. null = bu cihazda bu hesap için henüz hiç başlatılmadı
 *    (yeni cihaz/yeniden kurulum) → ilk açılış SESSİZ: mevcut boy gösterilir, eski büyümeler yeniden oynatılmaz.
 *  - `pending`: sunucunun `created: true` dediği (gerçekten YENİ) ve henüz kartta gösterilmemiş kayıtların
 *    wordId'leri. Lemma burada TUTULMUYOR: kart zaten GET /words/saved listesini (lemma + savedAt) yüklüyor;
 *    hapta yazan kelime oradan, yani sunucudaki gerçek kayıttan gelir — cihazda eskimiş bir kopya olmaz.
 *
 * Neden toplam sayı farkı DEĞİL (ürün kararı): bir kelime silinip başka biri kaydedilince toplam aynı kalır ama
 * kullanıcı gerçekten yeni bir kelime topladı; ayrıca hapta HANGİ kelimenin yazacağını sayı farkı söyleyemez.
 */
export const loopiStateSchema = z.object({
  version: z.literal(1),
  seenStage: z.number().int().min(0).nullable(),
  pending: z.array(z.string()),
});

export type LoopiState = z.infer<typeof loopiStateSchema>;

export function emptyLoopiState(): LoopiState {
  return { version: 1, seenStage: null, pending: [] };
}

/** created:true kayıt. Aynı wordId zaten bekliyorsa tekrar eklenmez (çift bildirim "+N"'i şişirmez). */
export function recordCreated(state: LoopiState, wordId: string): LoopiState {
  if (state.pending.includes(wordId)) return state;
  return { ...state, pending: [...state.pending, wordId] };
}

/** Başarılı unsave → bekleyenden çıkar. Temizlik amaçlı; doğruluk zaten resolveLoopiReveal'ın süzmesinde. */
export function removeWord(state: LoopiState, wordId: string): LoopiState {
  if (!state.pending.includes(wordId)) return state;
  return { ...state, pending: state.pending.filter((id) => id !== wordId) };
}

/**
 * İlk başlatma (seenStage null). `stillSavedPendingCount`: bekleyenlerden hâlâ kayıtlı olanların sayısı — init'ten
 * ÖNCE bu cihazda yapılmış yeni kayıtlar "görülmüş" sayılmasın, kart açılınca kutlansın diye boydan düşülür.
 * Zaten başlatılmışsa durum aynen döner.
 */
export function initializeIfMissing(state: LoopiState, savedCount: number, stillSavedPendingCount: number): LoopiState {
  if (state.seenStage !== null) return state;
  return { ...state, seenStage: getLoopiStage(Math.max(0, savedCount - stillSavedPendingCount)) };
}

export type SavedWordForReveal = { word: { id: string; lemma: string }; savedAt: string };

export type LoopiReveal = {
  /** Hapta yazacak kelime: hâlâ kayıtlı bekleyenler içinde sunucudaki savedAt'i EN YENİ olan. Yoksa null. */
  latest: { wordId: string; lemma: string } | null;
  /** Hapın köşesindeki "+N": latest'e EK olarak kaç yeni kelime toplandı. */
  extraCount: number;
  fromStage: number;
  toStage: number;
};

/**
 * Kart açılınca ne oynatılacağı. `savedWords` sunucudaki GÜNCEL tam liste (GET /words/saved sayfalı değil).
 * Silinmiş bekleyenler burada doğal olarak düşer (A kaydet → A sil → B kaydet: latest = B, +0).
 * Başka cihazda kaydedilenler pending'de yok → hap gösterilmez, yalnız boy farkı varsa uzama (uydurma kelime yok).
 */
export function resolveLoopiReveal(state: LoopiState, savedWords: readonly SavedWordForReveal[]): LoopiReveal {
  const pendingIds = new Set(state.pending);
  const stillSaved = savedWords.filter((saved) => pendingIds.has(saved.word.id));
  let latest: SavedWordForReveal | null = null;
  for (const saved of stillSaved) {
    if (latest === null || Date.parse(saved.savedAt) > Date.parse(latest.savedAt)) latest = saved;
  }
  const toStage = getLoopiStage(savedWords.length);
  const fromStage = state.seenStage ?? toStage;
  return {
    latest: latest ? { wordId: latest.word.id, lemma: latest.word.lemma } : null,
    extraCount: Math.max(0, stillSaved.length - 1),
    fromStage: Math.min(fromStage, toStage),
    toStage,
  };
}

/** Oynatılacak bir şey var mı: gösterilecek yeni kelime ya da görülmemiş bir uzama. */
export function hasLoopiReveal(reveal: LoopiReveal): boolean {
  return reveal.latest !== null || reveal.toStage > reveal.fromStage;
}

/**
 * Gösterim BAŞLADIĞI anda yazılır (kullanıcı yarıda çıkarsa tekrar oynamaz). seenStage hiç DÜŞÜRÜLMEZ: kelime
 * silinip sayı azalınca, aynı eşiğe yeniden çıkıldığında ikinci kez kutlama olmaz (ürün kararı d).
 */
export function markRevealed(state: LoopiState, savedCount: number): LoopiState {
  return { version: 1, seenStage: Math.max(state.seenStage ?? 0, getLoopiStage(savedCount)), pending: [] };
}

/** "Kelimelerim" düğmesindeki lime nokta: yalnız GÖRÜLMEMİŞ bir eşik varsa. Başlatılmamış durumda nokta yok. */
export function shouldShowLoopiDot(state: LoopiState, savedCount: number): boolean {
  return state.seenStage !== null && getLoopiStage(savedCount) > state.seenStage;
}

/**
 * Kart açılışının TAMAMI tek saf adımda: başlat (gerekirse) → neyin oynatılacağını çöz → oynatılacaksa "görüldü"
 * yaz. use-loopi-card bunu depo kuyruğunun içinde (store.update) çağırır, böylece "oku-karar ver-yaz" arasına
 * başka bir kayıt giremez.
 */
export function openLoopiCard(
  state: LoopiState,
  savedWords: readonly SavedWordForReveal[],
): { nextState: LoopiState; reveal: LoopiReveal | null } {
  const savedIds = new Set(savedWords.map((saved) => saved.word.id));
  const stillSavedPending = state.pending.filter((id) => savedIds.has(id)).length;
  const initialized = initializeIfMissing(state, savedWords.length, stillSavedPending);
  const reveal = resolveLoopiReveal(initialized, savedWords);
  if (!hasLoopiReveal(reveal)) return { nextState: initialized, reveal: null };
  return { nextState: markRevealed(initialized, savedWords.length), reveal };
}

/** Depodan okunan ham değer. Bozuk/eski/eksik → boş durum (sessiz başlangıç), asla hata fırlatmaz. */
export function parseLoopiState(raw: string | null): LoopiState {
  if (raw === null) return emptyLoopiState();
  try {
    const parsed = loopiStateSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : emptyLoopiState();
  } catch {
    return emptyLoopiState();
  }
}
