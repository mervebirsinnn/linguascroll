import type { WordReviewState } from "./review-scheduling";

/**
 * Chunk 16 — `review-scheduling.ts`'in çıktısından bir review session'ı
 * seçen, saf, deterministic bir fonksiyon. RNG YOK — `personalization-ranking.ts`'in
 * AYNI "determinism" prensibi: aynı `candidates` + aynı `now` (scheduling'e
 * geçmişte verilen) → her zaman aynı session.
 */

/** Session başına GÖSTERİLECEK maksimum item — kullanıcı kararı. Due item SAYISI bundan azsa, session KISA kalır (dolgu item YOK). */
export const REVIEW_SESSION_SIZE = 5;

export type ReviewCandidate = {
  wordId: string;
  savedAt: Date;
  state: WordReviewState;
};

/** Öncelik sırası — kullanıcı kararı, birebir. `notDue` bu sıralamaya hiç girmiyor (aşağıda baştan elenir). */
const TIER_ORDER: Record<WordReviewState["status"], number> = {
  neverReviewed: 0,
  dueIncorrect: 1,
  dueCorrect: 2,
  notDue: 99,
};

/**
 * Tie-break için "ilgili zaman damgası": hiç review edilmemiş bir kelime için
 * `savedAt` (henüz bir `reviewedAt` yok) — review edilmiş (due) bir kelime
 * için `lastReviewedAt`. "En eski önce" (en uzun süredir bekleyen kazanır).
 */
function relevantTimestampMs(candidate: ReviewCandidate): number {
  if (candidate.state.status === "neverReviewed") {
    return candidate.savedAt.getTime();
  }
  if (candidate.state.status === "dueIncorrect" || candidate.state.status === "dueCorrect") {
    return candidate.state.lastReviewedAt.getTime();
  }
  // notDue candidate'ler zaten filtrelendiği için buraya teorik olarak hiç girilmiyor.
  return Number.POSITIVE_INFINITY;
}

/**
 * SADECE gerçekten due olan candidate'lerden seçer — `sessionSize`'a
 * TAMAMLAMAK için due-olmayan bir item asla eklenmiyor (kullanıcı kararı:
 * "2 due varsa 2 göster"). Sıralama: (1) tier (neverReviewed → dueIncorrect
 * → dueCorrect), (2) tier içinde en eski `relevantTimestamp`, (3) stabil
 * tie-break olarak `wordId`.
 */
export function selectReviewSession(
  candidates: readonly ReviewCandidate[],
  sessionSize: number = REVIEW_SESSION_SIZE,
): ReviewCandidate[] {
  const due = candidates.filter((candidate) => candidate.state.status !== "notDue");

  const sorted = [...due].sort((a, b) => {
    const tierDiff = TIER_ORDER[a.state.status] - TIER_ORDER[b.state.status];
    if (tierDiff !== 0) {
      return tierDiff;
    }
    const timestampDiff = relevantTimestampMs(a) - relevantTimestampMs(b);
    if (timestampDiff !== 0) {
      return timestampDiff;
    }
    return a.wordId < b.wordId ? -1 : a.wordId > b.wordId ? 1 : 0;
  });

  return sorted.slice(0, sessionSize);
}
