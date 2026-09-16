/**
 * Chunk 16 — DB/Nest/HTTP bilmeyen saf bir modül, `personalization-ranking.ts`
 * ile AYNI gerekçeyle: karmaşık deterministic bir algoritma, kendi dosyasında,
 * mock/DI olmadan test edilebiliyor. Bu FSRS/SM-2 DEĞİL — kullanıcının
 * verdiği sabit, 3 kademeli bir ilerleme kuralı.
 *
 * `now` HER ZAMAN explicit bir parametre (gerçek clock'a hiç dokunulmuyor) —
 * flaky zaman testlerinden kaçınmak için (kullanıcı kararı).
 */

export type ReviewEvent = { isCorrect: boolean; reviewedAt: Date };

export type WordReviewState =
  | { status: "neverReviewed" }
  | { status: "dueIncorrect"; lastReviewedAt: Date }
  | { status: "dueCorrect"; lastReviewedAt: Date; consecutiveCorrect: number }
  | { status: "notDue"; lastReviewedAt: Date; consecutiveCorrect: number; nextDueAt: Date };

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Kullanıcının verdiği sabit ilerleme: 1. doğru → +1 gün, 2. ardışık doğru →
 * +3 gün, 3+ ardışık doğru → +7 gün. `Record` yerine bilinçli olarak bir
 * fonksiyon: "3+" durumunu (sınırsız streak) doğal olarak, bir map'e her
 * streak değeri için satır eklemeden ifade ediyor.
 */
function intervalDaysForStreak(consecutiveCorrect: number): number {
  if (consecutiveCorrect <= 1) {
    return 1;
  }
  if (consecutiveCorrect === 2) {
    return 3;
  }
  return 7;
}

/** En son (en yeni) event'ten GERİYE doğru, kesintisiz "doğru" koşusu. İlk "yanlış"ta durur. */
function computeConsecutiveCorrect(chronologicalEvents: readonly ReviewEvent[]): number {
  let streak = 0;
  for (let i = chronologicalEvents.length - 1; i >= 0; i--) {
    if (!chronologicalEvents[i]!.isCorrect) {
      break;
    }
    streak++;
  }
  return streak;
}

/**
 * Tek bir kelimenin GÜNCEL review durumu — `events` HERHANGİ bir sırada
 * gelebilir (fonksiyon kendi içinde `reviewedAt`'e göre kronolojik sıralar,
 * girdinin sırasına güvenmiyor).
 *
 * Sınır davranışı (kullanıcı kararı, birebir): `lastReviewedAt + intervalDays
 * <= now` → due. Tam sınırda (eşitlik) DUE sayılır — "henüz erken" değil.
 *
 * "Hatırlamadım" (son event yanlış) → interval hesabı YAPILMAZ, ANINDA due
 * (kullanıcı kararı: "streak reset, item yeniden due" — 1 günlük bir bekleme
 * bile yok).
 */
export function computeWordReviewState(events: readonly ReviewEvent[], now: Date): WordReviewState {
  if (events.length === 0) {
    return { status: "neverReviewed" };
  }

  const chronological = [...events].sort((a, b) => a.reviewedAt.getTime() - b.reviewedAt.getTime());
  const last = chronological[chronological.length - 1]!;

  if (!last.isCorrect) {
    return { status: "dueIncorrect", lastReviewedAt: last.reviewedAt };
  }

  const consecutiveCorrect = computeConsecutiveCorrect(chronological);
  const intervalDays = intervalDaysForStreak(consecutiveCorrect);
  const nextDueAt = new Date(last.reviewedAt.getTime() + intervalDays * MS_PER_DAY);

  if (nextDueAt.getTime() <= now.getTime()) {
    return { status: "dueCorrect", lastReviewedAt: last.reviewedAt, consecutiveCorrect };
  }
  return { status: "notDue", lastReviewedAt: last.reviewedAt, consecutiveCorrect, nextDueAt };
}
