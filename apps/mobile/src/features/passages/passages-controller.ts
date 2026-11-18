import type { PassageAnswerResult, PassageLevel, PassagePage } from "@linguascroll/shared-types";
import { PassagesApiError } from "./api/passages-api";
import {
  applyAnswerResult,
  applyFreshError,
  applyFreshSuccess,
  applyLoadMoreError,
  applyLoadMoreStart,
  applyLoadMoreSuccess,
  applyWordSaved,
  canLoadMore,
  canRefresh,
  canSelectOption,
  findQuestion,
  invalidateAfterAccessChange,
  isOutcomeUncertain,
  mapAllLevels,
  mergeAnswersFromPage,
  passageContainsWord,
  toggleEliminated,
  INITIAL_LEVEL_STATE,
  type PassagesByLevel,
  type PassagesLevelState,
} from "./passages-state";

/**
 * Okuma pratiği DENETLEYİCİSİ — React'ten bağımsız; yarış/çift gönderim/erişim değişimi kararlarının tek yeri. Hook
 * (use-passages.ts) bunu ince bir sarmalayıcıyla çağırır; böylece "eski yanıt yeni durumu ezmesin" gibi zamanlama
 * davranışları RN render etmeden, kontrollü (elle çözülen) promise'lerle test edilir.
 *
 * Yarış güvenceleri:
 *  - `epoch`: kullanıcı/erişim değişince artar. Her asenkron devam, başladığı andaki epoch'u taşır; epoch değiştiyse SONUCU
 *    ATAR (eski kullanıcı/erişim durumuna ait veri yeni durumu ezemez). `dispose` aynı etkiyi verir.
 *  - Seviye başına TEK uçuştaki istek (fresh/loadMore ortak `isFetching`): refresh/loadMore çakışması ve çift tetik yok.
 *    Sonuç, kendi seviyesinin yuvasına yazılır → seviye değişince geç gelen yanıt başka seviyeyi bozmaz.
 *  - Soru başına / kelime başına tek uçuştaki gönderim (çift dokunma).
 */

export type PassagesDeps = {
  fetchPassages: (level: PassageLevel, cursor?: string) => Promise<PassagePage>;
  answerPassageQuestion: (questionId: string, optionId: string) => Promise<PassageAnswerResult>;
  savePassageWord: (wordId: string, passageId: string) => Promise<unknown>;
  unsaveWord: (wordId: string) => Promise<void>;
  /** Belirsiz sonuçlu cevap yeniden gönderilmeden önce kısa bekleme (testlerde anlık). */
  sleep: (ms: number) => Promise<void>;
};

export const ANSWER_RETRY_DELAY_MS = 600;
export const ANSWER_UNCERTAIN_MESSAGE = "Cevabının kaydedilip kaydedilmediğinden emin olamadık. Tekrar dokun, kayıtlıysa kayıtlı sonucu göstereceğiz.";
export const ANSWER_FAILED_MESSAGE = "Cevap gönderilemedi. Tekrar dene.";
export const WORD_FAILED_MESSAGE = "Kelime işlemi tamamlanamadı. Tekrar dene.";

export type PassagesSnapshot = {
  byLevel: PassagesByLevel;
  /** questionId → gönderilmekte olan şık (UI "gönderiliyor" gösterir, ikinci dokunuş yok sayılır). */
  pendingAnswers: Readonly<Record<string, string>>;
  answerErrors: Readonly<Record<string, string>>;
  /** Kaydet/çıkar işlemi süren kelimeler. */
  pendingWords: ReadonlySet<string>;
  wordErrors: Readonly<Record<string, string>>;
  /** Yerel ✕ elemesi (şık id'leri). Açık veri temizlenince birlikte temizlenir. */
  eliminated: ReadonlySet<string>;
  /** true → erişim değişti (doğrulanmış kazanım/kayıp ya da 403) ve liste yeniden yükleniyor; yeni liste gelince false olur. */
  accessChanged: boolean;
};

type Token = object;

export class PassagesController {
  private byLevel: PassagesByLevel = {};
  private pendingAnswers: Record<string, string> = {};
  private answerErrors: Record<string, string> = {};
  private pendingWords = new Set<string>();
  private wordErrors: Record<string, string> = {};
  private eliminated: ReadonlySet<string> = new Set();
  private accessChanged = false;

  private epoch = 0;
  private active = false;
  private activeLevel: PassageLevel | null = null;
  private readonly inFlight = new Map<PassageLevel, Token>();
  private readonly listeners = new Set<() => void>();
  private snapshot: PassagesSnapshot;

  constructor(private readonly deps: PassagesDeps) {
    this.snapshot = this.buildSnapshot();
  }

  // --- useSyncExternalStore sözleşmesi --------------------------------------------------------------------------------

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  getSnapshot = (): PassagesSnapshot => this.snapshot;

  private emit(): void {
    this.snapshot = this.buildSnapshot();
    for (const listener of [...this.listeners]) listener();
  }

  private buildSnapshot(): PassagesSnapshot {
    return {
      byLevel: this.byLevel,
      pendingAnswers: this.pendingAnswers,
      answerErrors: this.answerErrors,
      pendingWords: this.pendingWords,
      wordErrors: this.wordErrors,
      eliminated: this.eliminated,
      accessChanged: this.accessChanged,
    };
  }

  // --- yaşam döngüsü ----------------------------------------------------------------------------------------------------

  /** React StrictMode'un çift effect'ine dayanıklı: activate/deactivate eşleşmiş ve tekrarlanabilir. */
  activate(): void {
    this.active = true;
  }

  /** Ayrılınca uçuştaki her istek geçersizlenir (sonuçları atılır); durum bellekte kalır ama artık yazılmaz. */
  deactivate(): void {
    this.active = false;
    this.epoch += 1;
    this.inFlight.clear();
  }

  private isCurrent(epoch: number): boolean {
    return this.active && this.epoch === epoch;
  }

  // --- listeleme --------------------------------------------------------------------------------------------------------

  /** Seviye ilk kez gösterilirken çağrılır; zaten yüklü/yükleniyor ise hiçbir şey yapmaz. */
  ensureLoaded(level: PassageLevel): void {
    this.activeLevel = level;
    // "success" dışındaki her durum (yok / takılı kalmış loading / error) yeniden çekilir: StrictMode'un çift effect'i veya
    // deactivate ile iptal edilmiş bir istek, durumu "loading"de bırakıp seviyeyi sonsuza dek takılı bırakmasın.
    if (this.byLevel[level]?.status !== "success" && !this.inFlight.has(level)) void this.fetchFresh(level);
  }

  refresh(level: PassageLevel): void {
    this.activeLevel = level;
    if (canRefresh(this.inFlight.has(level))) void this.fetchFresh(level);
  }

  loadMore(level: PassageLevel): void {
    const state = this.byLevel[level] ?? INITIAL_LEVEL_STATE;
    if (!canLoadMore(state, this.inFlight.has(level))) return;
    void this.fetchMore(level, state.nextCursor);
  }

  private async fetchFresh(level: PassageLevel): Promise<void> {
    const epoch = this.epoch;
    const token: Token = {};
    this.inFlight.set(level, token);
    // İlk yükleme ya da hata sonrası yeniden deneme "loading" gösterir; var olan liste (refresh) görünür kalır.
    if (this.byLevel[level]?.status !== "success") {
      this.byLevel = { ...this.byLevel, [level]: INITIAL_LEVEL_STATE };
      this.emit();
    }
    try {
      const page = await this.deps.fetchPassages(level);
      if (!this.isCurrent(epoch)) return;
      this.byLevel = { ...this.byLevel, [level]: applyFreshSuccess(page) };
      this.accessChanged = false;
    } catch (error) {
      if (!this.isCurrent(epoch)) return;
      // Başarılı bir liste varken refresh hatası listeyi tam ekran hataya çevirmez (feed ile aynı karar).
      const current = this.byLevel[level];
      this.byLevel = { ...this.byLevel, [level]: current?.status === "success" ? applyLoadMoreError(current, error) : applyFreshError(error) };
      this.accessChanged = false;
    } finally {
      if (this.inFlight.get(level) === token) this.inFlight.delete(level);
    }
    if (this.isCurrent(epoch)) this.emit();
  }

  private async fetchMore(level: PassageLevel, cursor: string): Promise<void> {
    const epoch = this.epoch;
    const token: Token = {};
    this.inFlight.set(level, token);
    this.byLevel = { ...this.byLevel, [level]: applyLoadMoreStart(this.byLevel[level] ?? INITIAL_LEVEL_STATE) };
    this.emit();
    try {
      const page = await this.deps.fetchPassages(level, cursor);
      if (!this.isCurrent(epoch)) return;
      this.byLevel = { ...this.byLevel, [level]: applyLoadMoreSuccess(this.byLevel[level] ?? INITIAL_LEVEL_STATE, page) };
    } catch (error) {
      if (!this.isCurrent(epoch)) return;
      this.byLevel = { ...this.byLevel, [level]: applyLoadMoreError(this.byLevel[level] ?? INITIAL_LEVEL_STATE, error) };
    } finally {
      if (this.inFlight.get(level) === token) this.inFlight.delete(level);
    }
    if (this.isCurrent(epoch)) this.emit();
  }

  // --- erişim -----------------------------------------------------------------------------------------------------------

  /**
   * Sunucunun doğruladığı erişim değişti (satın alma/restore/abonelik kaybı) YA DA bir istek 403 aldı. Önbellekteki TÜM
   * metin/cevap/kelime verisi (açık içerik dahil) atılır, uçuştaki eski istekler geçersizlenir ve aktif seviye sunucudan
   * yeniden çekilir: kazanımda kilitler açılır; kayıpta ücretli içerik gider, ÜCRETSİZ ÖRNEKLER sunucu yine açık döndüğü
   * için kilitlenmez (kararı sunucu verir, istemci tahmin etmez).
   */
  onAccessVerified(): void {
    if (!this.active) return;
    this.resetForAccessChange();
    if (this.activeLevel) void this.fetchFresh(this.activeLevel);
  }

  private resetForAccessChange(): void {
    this.epoch += 1;
    this.inFlight.clear();
    this.byLevel = invalidateAfterAccessChange();
    this.pendingAnswers = {};
    this.answerErrors = {};
    this.pendingWords = new Set();
    this.wordErrors = {};
    this.eliminated = new Set();
    this.accessChanged = true;
    this.emit();
  }

  // --- cevap ------------------------------------------------------------------------------------------------------------

  async answer(questionId: string, optionId: string): Promise<void> {
    const question = findQuestion(this.byLevel, questionId);
    if (!question || this.pendingAnswers[questionId] !== undefined || !canSelectOption(this.eliminated, question, optionId)) return;
    if (!question.options.some((option) => option.id === optionId)) return;

    const epoch = this.epoch;
    this.pendingAnswers = { ...this.pendingAnswers, [questionId]: optionId };
    this.answerErrors = withoutKey(this.answerErrors, questionId);
    this.emit();

    try {
      const result = await this.submitAnswer(questionId, optionId);
      if (!this.isCurrent(epoch)) return;
      this.byLevel = mapAllLevels(this.byLevel, (state) => applyAnswerResult(state, questionId, result));
      this.pendingAnswers = withoutKey(this.pendingAnswers, questionId);
      this.emit();
    } catch (error) {
      if (!this.isCurrent(epoch)) return;
      this.pendingAnswers = withoutKey(this.pendingAnswers, questionId);
      if (this.isLockedError(error)) {
        this.onAccessVerified();
        return;
      }
      const uncertain = isOutcomeUncertain(error);
      this.answerErrors = { ...this.answerErrors, [questionId]: uncertain ? ANSWER_UNCERTAIN_MESSAGE : ANSWER_FAILED_MESSAGE };
      this.emit();
      if (uncertain) void this.reconcileAnswers();
    }
  }

  /**
   * Zaman aşımı/5xx/ağ hatasında cevap sunucuda KAYDEDİLMİŞ olabilir. Aynı şıkkı BİR KEZ yeniden gönderiyoruz: sunucu ilk
   * cevap kazanır kuralıyla ya kaydı yeni yazar ya da ZATEN kayıtlı ilk sonucu döndürür; ikisinde de dönen sonuç
   * gerçeğin kendisidir ve olduğu gibi uygulanır. Kesin hatalar (4xx) yeniden denenmez.
   */
  private async submitAnswer(questionId: string, optionId: string): Promise<PassageAnswerResult> {
    try {
      return await this.deps.answerPassageQuestion(questionId, optionId);
    } catch (error) {
      if (!isOutcomeUncertain(error)) throw error;
      await this.deps.sleep(ANSWER_RETRY_DELAY_MS);
      return this.deps.answerPassageQuestion(questionId, optionId);
    }
  }

  /** Yeniden gönderim de belirsiz kaldıysa: aktif seviyenin ilk sayfasını okuyup yalnız KAYITLI cevapları yerele uzlaştırır. */
  private async reconcileAnswers(): Promise<void> {
    const level = this.activeLevel;
    if (!level) return;
    const epoch = this.epoch;
    try {
      const page = await this.deps.fetchPassages(level);
      if (!this.isCurrent(epoch)) return;
      const current = this.byLevel[level];
      if (!current) return;
      this.byLevel = { ...this.byLevel, [level]: mergeAnswersFromPage(current, page) };
      // Kayıtlı sonuç bulunan sorunun "emin değiliz" uyarısı kalkar.
      this.answerErrors = Object.fromEntries(Object.entries(this.answerErrors).filter(([questionId]) => findQuestion(this.byLevel, questionId)?.result === null));
      this.emit();
    } catch {
      // Uzlaştırma en-iyi-çaba: başarısızsa kullanıcının "tekrar dokun" yolu (idempotent yeniden gönderim) duruyor.
    }
  }

  // --- kelime kaydı -----------------------------------------------------------------------------------------------------

  /**
   * `passageId` = kelimeye DOKUNULAN metin (sunucu bağlam cümlesini o metnin passage_words kaydından okur; kelime başka
   * metinlerde de geçiyorsa ilk kayıt kazanır). Çift doğrulanır: kelime o açık metinde yoksa istek atılmaz (sunucu 400 verirdi).
   */
  async saveWord(passageId: string, wordId: string): Promise<void> {
    if (this.pendingWords.has(wordId) || !passageContainsWord(this.byLevel, passageId, wordId)) return;
    await this.runWordAction(wordId, async () => {
      await this.deps.savePassageWord(wordId, passageId);
      return true;
    });
  }

  async unsaveWord(wordId: string): Promise<void> {
    if (this.pendingWords.has(wordId)) return;
    await this.runWordAction(wordId, async () => {
      await this.deps.unsaveWord(wordId);
      return false;
    });
  }

  private async runWordAction(wordId: string, action: () => Promise<boolean>): Promise<void> {
    const epoch = this.epoch;
    this.pendingWords = new Set(this.pendingWords).add(wordId);
    this.wordErrors = withoutKey(this.wordErrors, wordId);
    this.emit();
    try {
      const saved = await action();
      if (!this.isCurrent(epoch)) return;
      this.byLevel = mapAllLevels(this.byLevel, (state) => applyWordSaved(state, wordId, saved));
    } catch (error) {
      if (!this.isCurrent(epoch)) return;
      if (this.isLockedError(error)) {
        this.onAccessVerified();
        return;
      }
      this.wordErrors = { ...this.wordErrors, [wordId]: WORD_FAILED_MESSAGE };
    }
    const pending = new Set(this.pendingWords);
    pending.delete(wordId);
    this.pendingWords = pending;
    this.emit();
  }

  // --- eleme ------------------------------------------------------------------------------------------------------------

  toggleElimination(questionId: string, optionId: string): void {
    const question = findQuestion(this.byLevel, questionId);
    if (!question) return;
    const next = toggleEliminated(this.eliminated, question, optionId);
    if (next === this.eliminated) return;
    this.eliminated = next;
    this.emit();
  }

  private isLockedError(error: unknown): boolean {
    return error instanceof PassagesApiError && error.status === 403;
  }
}

function withoutKey<T>(record: Readonly<Record<string, T>>, key: string): Record<string, T> {
  const { [key]: _removed, ...rest } = record;
  return rest;
}

export function selectLevelState(snapshot: PassagesSnapshot, level: PassageLevel): PassagesLevelState {
  return snapshot.byLevel[level] ?? INITIAL_LEVEL_STATE;
}
