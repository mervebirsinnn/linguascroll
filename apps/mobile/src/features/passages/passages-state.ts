import { ZodError } from "zod";
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
 * ekranda iki kez çıkmasın — feed'in kopya düşürme kuralıyla aynı fikir). Erişim durumu aynıysa İLK gelen korunur (kullanıcının cevapları orada); farklıysa gelen kazanır (bkz. dedupeById).
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

/**
 * Aynı id'li iki kopya arasında karar: erişim durumu AYNIYSA ilk kopya korunur (kullanıcının yerel durumu/cevapları orada);
 * erişim durumu FARKLIYSA gelen (sunucunun son hali) kazanır — eski kilitli kopya yeni açık verinin önüne geçmez, eski açık
 * kopya da sunucu "kilitli" dediyse ekranda kalmaz. (Erişim değişince liste zaten sıfırlanır; bu, sıfırlamadan önce
 * yola çıkmış bir sayfanın aradan sızması ihtimaline karşı ikinci savunma.)
 */
function dedupeById(existing: readonly Passage[], incoming: readonly Passage[]): Passage[] {
  const indexById = new Map(existing.map((item, index) => [item.id, index] as const));
  const merged = [...existing];
  for (const item of incoming) {
    const at = indexById.get(item.id);
    if (at === undefined) {
      indexById.set(item.id, merged.length);
      merged.push(item);
    } else if (merged[at]!.access !== item.access) {
      merged[at] = item;
    }
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
  | { kind: "question"; questionId: string; index: number; total: number }
  | { kind: "summary" };

/**
 * 1 metin = sayfalar: açık metin → [metin, soru1..soruN, özet] (tasarım: 1 + 4 + skor özeti = 6 dikey sayfa); kilitli → tek
 * "locked" sayfa. Sayfa sayısını sabit varsaymaz: soru sayısı veriden gelir (sözleşme min 1 soru).
 */
export function expandPassagePages(passage: Passage): PassagePageDescriptor[] {
  if (passage.access === "locked") return [{ kind: "locked" }];
  return [
    { kind: "text" },
    ...passage.questions.map((question, index) => ({ kind: "question" as const, questionId: question.id, index, total: passage.questions.length })),
    { kind: "summary" },
  ];
}

/** Dikey pager'ın (FlatList) düz öğesi: hangi metnin hangi sayfası. `key` listede benzersiz ve kararlı. */
export type FlatPage = { key: string; passage: Passage; page: PassagePageDescriptor };

/** Seviyedeki tüm metinleri tek düz sayfa listesine açar (metin sırası ve metin içi sayfa sırası korunur). */
export function flattenPassagePages(passages: readonly Passage[]): FlatPage[] {
  return passages.flatMap((passage) =>
    expandPassagePages(passage).map((page, index) => ({ key: `${passage.id}:${page.kind}:${index}`, passage, page })),
  );
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

// --- Hook/denetleyici için seçiciler ve uzlaştırma ---------------------------------------------------------------------

/** Tüm yüklü seviyelerde (bir soru yalnız bir metne ait) soruyu bulur; yalnız AÇIK metinlerde soru vardır. */
export function findQuestion(byLevel: PassagesByLevel, questionId: string): PassageQuestion | null {
  for (const state of Object.values(byLevel)) {
    const found = state ? findQuestionInLevel(state, questionId) : null;
    if (found) return found;
  }
  return null;
}

function findQuestionInLevel(state: PassagesLevelState, questionId: string): PassageQuestion | null {
  if (state.status !== "success") return null;
  for (const passage of state.items) {
    if (passage.access !== "open") continue;
    const found = passage.questions.find((question) => question.id === questionId);
    if (found) return found;
  }
  return null;
}

/**
 * "Bu GEÇİŞ (span) bu AÇIK metinde ve bu kelimeye ait mi": kaynak metin/kelime/geçiş üçlüsü sunucuya gitmeden önce doğrulanır
 * (yanlış üçlü = 400 olurdu). Geçiş kimliği run'daki word.spanId'dir; kelimenin başka geçişi/başka kelimenin geçişi eşleşmez.
 */
export function passageContainsSpan(byLevel: PassagesByLevel, passageId: string, wordId: string, spanId: string): boolean {
  for (const state of Object.values(byLevel)) {
    if (state?.status !== "success") continue;
    const passage = state.items.find((item) => item.id === passageId);
    if (passage?.access === "open") {
      return passage.paragraphs.some((paragraph) => paragraph.some((run) => run.word?.wordId === wordId && run.word.spanId === spanId));
    }
  }
  return false;
}

/** Aynı dönüşümü yüklü TÜM seviyelere uygular (cevap/kelime kaydı seviyeden bağımsız doğrudur). */
export function mapAllLevels(byLevel: PassagesByLevel, transform: (state: PassagesLevelState) => PassagesLevelState): PassagesByLevel {
  const next: PassagesByLevel = {};
  for (const [level, state] of Object.entries(byLevel) as Array<[PassageLevel, PassagesLevelState | undefined]>) {
    if (state) next[level] = transform(state);
  }
  return next;
}

/**
 * Bir istek başarısızlığının SONUCU: sunucu işlemi yazdı mı?
 *  - "rejected": API SÖZLEŞMESİNDEKİ kesin retler (answer/save uçları yalnız bunları üretir): 400 (geçersiz şık/gövde), 401 (oturum),
 *    403 (kilitli), 404 (bilinmeyen/emekli). İstek işlenmeden reddedildi, hiçbir şey yazılmadı. İstek hiç atılmadan oluşan
 *    hatalar (ör. oturum yok) da buraya düşer.
 *  - "rate-limited": 429. API'nin kendi hız sınırı YOK; 429 yalnız altyapıdan (proxy/CDN) gelir ve istek işlenmeden döner —
 *    yazılmadı. Ama hemen yeniden göndermek aynı sınıra takılır: otomatik yeniden deneme YOK, kullanıcıya "biraz bekle" denir.
 *  - "uncertain": geri kalan HER ŞEY — zaman aşımı, 408 (istek sunucuya ulaşmış olabilir), sözleşmede olmayan diğer 4xx, 5xx, düz ağ
 *    hatası (RN: TypeError) ve 200 dönüp gövdesi okunamayan/sözleşmeye uymayan yanıt (SyntaxError/ZodError). Cevap kaydedilmiş
 *    OLABİLİR; körlemesine "4xx = kesin" kabul edilmez.
 */
export type FailureOutcome = "rejected" | "rate-limited" | "uncertain";

const CONTRACT_REJECTION_STATUSES: ReadonlySet<number> = new Set([400, 401, 403, 404]);

export function classifyFailure(error: unknown): FailureOutcome {
  if (error instanceof PassagesApiError) {
    if (error.isTimeout || error.status === undefined) return "uncertain";
    if (CONTRACT_REJECTION_STATUSES.has(error.status)) return "rejected";
    if (error.status === 429) return "rate-limited";
    return "uncertain";
  }
  if (error instanceof TypeError || error instanceof SyntaxError || error instanceof ZodError) return "uncertain";
  return "rejected"; // istek atılmadan önceki hata (ör. oturum yok): hiçbir şey yazılmadı
}

export function isOutcomeUncertain(error: unknown): boolean {
  return classifyFailure(error) === "uncertain";
}

/**
 * Taze bir sayfadaki KAYITLI cevapları, yerelde henüz cevapsız görünen aynı sorulara yazar; başka hiçbir şeye dokunmaz
 * (liste/cursor/yerel cevaplar korunur). Zaman aşımı sonrası "sunucuda kayıtlı mı" sorusunun yeniden-okuma yoludur.
 */
export function mergeAnswersFromPage(state: PassagesLevelState, page: PassagePage): PassagesLevelState {
  let next = state;
  for (const passage of page.items) {
    if (passage.access !== "open") continue;
    for (const question of passage.questions) {
      if (question.result === null) continue;
      const local = findQuestionInLevel(next, question.id);
      if (local && local.result === null) next = applyAnswerResult(next, question.id, question.result);
    }
  }
  return next;
}
