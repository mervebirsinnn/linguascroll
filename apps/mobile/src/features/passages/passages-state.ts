import type { Passage, PassageAnswerResult, PassageLevel, PassagePage, PassageQuestion } from "@linguascroll/shared-types";
import { PassagesApiError } from "./api/passages-api";

/**
 * Okuma pratiği durum mantığı — React'ten BAĞIMSIZ saf fonksiyonlar (repo kuralı: bkz. features/feed/hooks/use-feed.ts).
 * Hook (PR-7) bunları birebir çağıracak; böylece sayfalama/kopya düşürme/cevap/eleme kararları RN render etmeden test edilir.
 *
 * Wire kararları burada nasıl uygulanıyor:
 *  - Sunucu hazır "run"lar verir; mobil offset hesabı YAPMAZ (yalnız run'ları çizer).
 *  - Cursor opak; `nextCursor === null` → seviye bitti, otomatik yeniden başlama YOK.
 *  - Kilitli metin yalnız başlık taşır; cevap/kelime yok. Erişim değişince (satın alma) liste sıfırdan çekilir.
 *  - İlk cevap kazanır (sunucu); istemci sunucunun döndürdüğü kayıtlı sonucu aynen uygular.
 *  - ✕ elemesi YALNIZ yerel/geçici ve görsel yardımdır; cevap göndermez, sunucuya gitmez.
 */

export type PassagesLevelState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "success"; items: Passage[]; nextCursor: string | null; isLoadingMore: boolean; loadMoreError: string | null };
type SuccessState = Extract<PassagesLevelState, { status: "success" }>;

/** Seviye başına bağımsız durum; olmayan anahtar = henüz hiç yüklenmedi (ilk açılışta çekilecek). */
export type PassagesByLevel = Partial<Record<PassageLevel, PassagesLevelState>>;

export const INITIAL_LEVEL_STATE: PassagesLevelState = { status: "loading" };

function errorMessage(error: unknown): string {
  if (error instanceof PassagesApiError && (error.isTimeout || error.status === 429 || (error.status !== undefined && error.status >= 500))) {
    return "Sunucu şu an çok yoğun. Birkaç dakika sonra tekrar dene.";
  }
  return "Bağlantı kurulamadı. İnternet bağlantını kontrol edip tekrar dene.";
}

export function canLoadMore(state: PassagesLevelState, isFetching: boolean): state is SuccessState & { nextCursor: string } {
  return !isFetching && state.status === "success" && state.nextCursor !== null;
}

export function canRefresh(isFetching: boolean): boolean {
  return !isFetching;
}

/** Cursor'sız (ilk/yeniden) çekimin sonucu: önceki içeriğin ÜZERİNE YAZAR (append değil; eski items'a erişimi bile yok). */
export function applyFreshSuccess(page: PassagePage): SuccessState {
  return { status: "success", items: dedupeById([], page.items), nextCursor: page.nextCursor, isLoadingMore: false, loadMoreError: null };
}

export function applyFreshError(error: unknown): PassagesLevelState {
  return { status: "error", message: errorMessage(error) };
}

export function applyLoadMoreStart(state: PassagesLevelState): PassagesLevelState {
  return state.status === "success" ? { ...state, isLoadingMore: true, loadMoreError: null } : state;
}

/**
 * Devam sayfası eklenir; AYNI id'li metin ikinci kez GÖSTERİLMEZ (cursor sınırında/yeniden yayında tekrar gelebilen metin
 * ekranda iki kez çıkmasın — feed'in kopya düşürme kuralıyla aynı fikir). İlk gelen korunur (kullanıcının cevapları orada).
 */
export function applyLoadMoreSuccess(state: PassagesLevelState, page: PassagePage): PassagesLevelState {
  return state.status === "success"
    ? { ...state, items: dedupeById(state.items, page.items), nextCursor: page.nextCursor, isLoadingMore: false, loadMoreError: null }
    : state;
}

/** Hata sonrası mevcut metinler AYNEN korunur; kullanıcı elle yeniden dener. */
export function applyLoadMoreError(state: PassagesLevelState, error: unknown): PassagesLevelState {
  return state.status === "success" ? { ...state, isLoadingMore: false, loadMoreError: errorMessage(error) } : state;
}

function dedupeById(existing: readonly Passage[], incoming: readonly Passage[]): Passage[] {
  const seen = new Set(existing.map((item) => item.id));
  const merged = [...existing];
  for (const item of incoming) {
    if (seen.has(item.id)) continue;
    seen.add(item.id);
    merged.push(item);
  }
  return merged;
}

/**
 * Erişim değişti (satın alma / geri yükleme doğrulandı): hiçbir seviyenin eski listesi geçerli değil (kilitli kartlar açıldı,
 * cevap durumları aynı ama içerik yeni). TÜM seviyeler sıfırlanır → ilk açılışta yeniden çekilir. Çağıran, bunu YALNIZ
 * backend aboneliği doğruladıktan SONRA (paywall akışı `refreshSubscription` → `active: true` → onUnlocked) çağırmalı:
 * sunucu "abone değil" sonucunu kısa süre önbellekte tutar, doğrulamadan önce yeniden çekmek kilitli listeyi geri getirir.
 */
export function invalidateAfterAccessChange(): PassagesByLevel {
  return {};
}

// --- Cevap ve kelime güncellemeleri (sunucu cevabını/olayını yerel listeye yansıtır) -------------------------------

function mapOpenPassages(state: PassagesLevelState, transform: (passage: Extract<Passage, { access: "open" }>) => Extract<Passage, { access: "open" }>): PassagesLevelState {
  if (state.status !== "success") return state;
  return { ...state, items: state.items.map((item) => (item.access === "open" ? transform(item) : item)) };
}

/** Sunucunun döndürdüğü KAYITLI cevap sonucunu ilgili soruya yazar (ilk cevap kazanır; sunucu aynı soruya hep aynı sonucu verir). */
export function applyAnswerResult(state: PassagesLevelState, questionId: string, result: PassageAnswerResult): PassagesLevelState {
  return mapOpenPassages(state, (passage) =>
    passage.questions.some((question) => question.id === questionId)
      ? { ...passage, questions: passage.questions.map((question) => (question.id === questionId ? { ...question, result } : question)) }
      : passage,
  );
}

/** Bir kelimenin `saved` durumunu o kelimenin TÜM geçişlerinde (tüm paragraf/metinlerde) günceller: kelime defteri kullanıcı başına tek. */
export function applyWordSaved(state: PassagesLevelState, wordId: string, saved: boolean): PassagesLevelState {
  return mapOpenPassages(state, (passage) => ({
    ...passage,
    paragraphs: passage.paragraphs.map((paragraph) => paragraph.map((run) => (run.word?.wordId === wordId ? { ...run, word: { ...run.word, saved } } : run))),
  }));
}

// --- Bir metnin sayfalara açılması ve özet -------------------------------------------------------------------------

export type PassagePageDescriptor =
  | { kind: "locked" }
  | { kind: "text" }
  | { kind: "question"; questionId: string; index: number; total: number };

/**
 * 1 metin = sayfalar: açık metin → [metin, soru1..soruN] (tasarım: 1 + 4 = 5 dikey sayfa); kilitli → tek "locked" sayfa.
 * Sayfa sayısını sabit 5 varsaymaz: soru sayısı veriden gelir (sözleşme min 1 soru).
 */
export function expandPassagePages(passage: Passage): PassagePageDescriptor[] {
  if (passage.access === "locked") return [{ kind: "locked" }];
  return [{ kind: "text" }, ...passage.questions.map((question, index) => ({ kind: "question" as const, questionId: question.id, index, total: passage.questions.length }))];
}

export type AnswerSummary = { correct: number; wrong: number; unanswered: number };

export function summarizeAnswers(questions: readonly PassageQuestion[]): AnswerSummary {
  let correct = 0;
  let wrong = 0;
  for (const question of questions) {
    if (question.result === null) continue;
    if (question.result.correct) correct += 1;
    else wrong += 1;
  }
  return { correct, wrong, unanswered: questions.length - correct - wrong };
}

/** Canlı özet metni: "2 doğru · 1 yanlış · 1 cevaplanmadı" (sıfırlar da gösterilir: kullanıcı durumu eksiksiz görsün). */
export function formatAnswerSummary(summary: AnswerSummary): string {
  return `${summary.correct} doğru · ${summary.wrong} yanlış · ${summary.unanswered} cevaplanmadı`;
}

/** Tüm sorular cevaplandı mı (sonuç kutusu/özet ekranı için). */
export function isPassageComplete(questions: readonly PassageQuestion[]): boolean {
  return questions.length > 0 && questions.every((question) => question.result !== null);
}

// --- ✕ elemesi (yalnız yerel, geri alınabilir) ----------------------------------------------------------------------

/**
 * Şık elemesini aç/kapat. Kurallar: cevaplanmış soruda eleme değişmez; bir sorunun TÜM şıkları elenemez (en az 1 şık
 * seçilebilir kalmalı, yoksa kullanıcı kendini cevaplayamaz hâle getirir). Eleme geri alınabilir (tekrar dokunma).
 */
export function toggleEliminated(eliminated: ReadonlySet<string>, question: PassageQuestion, optionId: string): ReadonlySet<string> {
  if (question.result !== null) return eliminated;
  if (!question.options.some((option) => option.id === optionId)) return eliminated;
  const next = new Set(eliminated);
  if (next.has(optionId)) {
    next.delete(optionId);
    return next;
  }
  const remaining = question.options.filter((option) => !next.has(option.id));
  if (remaining.length <= 1) return eliminated;
  next.add(optionId);
  return next;
}

/** Elenmiş şık seçilemez; cevaplanmış soruda seçim yok. Eleme yalnız görsel yardım: seçilemezlik burada tek yerde karar verilir. */
export function canSelectOption(eliminated: ReadonlySet<string>, question: PassageQuestion, optionId: string): boolean {
  return question.result === null && !eliminated.has(optionId);
}
