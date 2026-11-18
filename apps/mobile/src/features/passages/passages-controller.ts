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
  classifyFailure,
  isOutcomeUncertain,
  mapAllLevels,
  mergeAnswersFromPage,
  passageContainsSpan,
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
  savePassageWord: (wordId: string, passageId: string, spanId: string) => Promise<unknown>;
  unsaveWord: (wordId: string) => Promise<void>;
  /** Belirsiz sonuçlu cevap yeniden gönderilmeden önce kısa bekleme (testlerde anlık). */
  sleep: (ms: number) => Promise<void>;
};

export const ANSWER_RETRY_DELAY_MS = 600;
/**
 * Belirsiz sonuç ("kaydedilmedi" DEĞİL): istek sunucuya ulaşıp cevabı kaydetmiş olabilir. "Tekrar kontrol et" aynı şıkkı yeniden
 * gönderir; sunucu ilk cevap kazanır kuralıyla SAKLANAN ilk sonucu döndürür.
 */
export const ANSWER_UNCERTAIN_MESSAGE = "Sonuç doğrulanamadı; tekrar kontrol et.";
export const ANSWER_FAILED_MESSAGE = "Cevap gönderilemedi. Tekrar dene.";
export const ANSWER_RATE_LIMITED_MESSAGE = "Çok fazla istek gönderildi. Biraz bekleyip tekrar dene.";
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
  /** Belirsiz kalan cevabın denenen şıkkı: "tekrar kontrol et" AYNI şıkkı yeniden gönderir. */
  private uncertainAttempts: Record<string, string> = {};
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
   * Sunucunun DOĞRULADIĞI erişim sonucu (satın alma / restore / hesap ekranı yenilemesi). Karar GÖSTERİLEN duruma bakar,
   * "son bildirilen değer"e değil: doğrulanmış sonuçla çelişen bir şey ekrandaysa (aktif ama kilitli kart; aktif değil ama
   * açık içerik) YA DA eski erişimle yola çıkmış bir istek uçuştaysa liste sıfırlanıp yeniden çekilir; tutarlıysa hiçbir şey
   * yapılmaz (abonenin hesap ekranı her yenilendiğinde bekleyen cevap/eleme silinmesin). Bu yüzden 403 ile yeniden
   * kilitlenmiş bir liste, sonradan gelen doğrulanmış satın almayı kaçırmaz.
   */
  onAccessVerified(active: boolean): void {
    if (!this.active || !this.contradictsAccess(active)) return;
    this.reloadAfterAccessChange();
  }

  private contradictsAccess(active: boolean): boolean {
    if (this.inFlight.size > 0) return true;
    return Object.values(this.byLevel).some(
      (state) => state?.status === "success" && state.items.some((item) => (active ? item.access === "locked" : item.access === "open")),
    );
  }

  /**
   * Önbellekteki TÜM metin/cevap/kelime verisi (açık içerik dahil) atılır, uçuştaki eski istekler geçersizlenir ve aktif seviye
   * sunucudan yeniden çekilir: kazanımda kilitler açılır; kayıpta ücretli içerik gider, ÜCRETSİZ ÖRNEKLER sunucu yine açık
   * döndürdüğü için kilitlenmez (kararı sunucu verir, istemci tahmin etmez). 403 (sunucu "kilitli" dedi) koşulsuz bunu çağırır.
   */
  private reloadAfterAccessChange(): void {
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
    this.uncertainAttempts = {};
    this.pendingWords = new Set();
    this.wordErrors = {};
    this.eliminated = new Set();
    this.accessChanged = true;
    this.emit();
  }

  // --- cevap ------------------------------------------------------------------------------------------------------------

  async answer(questionId: string, optionId: string): Promise<void> {
    await this.sendAnswer(questionId, optionId, false);
  }

  /**
   * `recheck`: belirsiz kalan cevabın YENİDEN GÖNDERİMİ. Elenmiş şık seçilemez kuralına takılmaz: kullanıcı o şıkkı eleme
   * aracıyla işaretlemiş olsa bile, ZATEN gönderilmiş cevabı doğrulamak istiyor; sessizce hiçbir şey yapmamalıyız.
   */
  private async sendAnswer(questionId: string, optionId: string, recheck: boolean): Promise<void> {
    const question = findQuestion(this.byLevel, questionId);
    if (!question || this.pendingAnswers[questionId] !== undefined) return;
    if (question.result !== null || (!recheck && !canSelectOption(this.eliminated, question, optionId))) return;
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
      this.uncertainAttempts = withoutKey(this.uncertainAttempts, questionId);
      this.emit();
    } catch (error) {
      if (!this.isCurrent(epoch)) return;
      this.pendingAnswers = withoutKey(this.pendingAnswers, questionId);
      if (this.isLockedError(error)) {
        this.reloadAfterAccessChange();
        return;
      }
      const outcome = classifyFailure(error);
      if (outcome === "uncertain") this.uncertainAttempts = { ...this.uncertainAttempts, [questionId]: optionId };
      const message = outcome === "uncertain" ? ANSWER_UNCERTAIN_MESSAGE : outcome === "rate-limited" ? ANSWER_RATE_LIMITED_MESSAGE : ANSWER_FAILED_MESSAGE;
      this.answerErrors = { ...this.answerErrors, [questionId]: message };
      this.emit();
      if (outcome === "uncertain") void this.reconcileAnswers();
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
      this.uncertainAttempts = Object.fromEntries(Object.entries(this.uncertainAttempts).filter(([questionId]) => findQuestion(this.byLevel, questionId)?.result === null));
      this.emit();
    } catch {
      // Uzlaştırma en-iyi-çaba: başarısızsa kullanıcının "tekrar dokun" yolu (idempotent yeniden gönderim) duruyor.
    }
  }

  /**
   * "Tekrar kontrol et": belirsiz kalan cevabı, denenen AYNI şıkla yeniden gönderir. Cevap sunucuda kayıtlıysa (sonraki sayfadaki
   * soru dahil: uzlaştırma yalnız ilk sayfayı okur) sunucu SAKLANAN ilk sonucu döndürür ve olduğu gibi uygulanır; kayıtlı değilse
   * kullanıcının cevabı bu istekle kaydedilir. Yalnız belirsiz bir deneme varken anlamlı; yoksa yok sayılır.
   */
  async recheckAnswer(questionId: string): Promise<void> {
    const optionId = this.uncertainAttempts[questionId];
    if (optionId === undefined) return;
    await this.sendAnswer(questionId, optionId, true);
  }

  // --- kelime kaydı -----------------------------------------------------------------------------------------------------

  /**
   * `passageId` = kelimeye DOKUNULAN metin, `spanId` = dokunulan GEÇİŞ (run'daki word.spanId). Sunucu kaynak cümleyi o geçişten
   * bulur (aynı kelime iki cümlede geçiyorsa doğru cümle); kelime zaten kayıtlıysa ilk kayıt kazanır. Üçlü doğrulanır: kelime
   * o açık metinde o geçişle yoksa istek atılmaz (sunucu 400 verirdi).
   */
  async saveWord(passageId: string, wordId: string, spanId: string): Promise<void> {
    if (this.pendingWords.has(wordId) || !passageContainsSpan(this.byLevel, passageId, wordId, spanId)) return;
    await this.runWordAction(wordId, async () => {
      await this.deps.savePassageWord(wordId, passageId, spanId);
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
        this.reloadAfterAccessChange();
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
