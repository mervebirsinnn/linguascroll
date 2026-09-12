import { BadRequestException } from "@nestjs/common";
import type { Word } from "@linguascroll/shared-types";
import type { UsersService } from "../users/users.service";
import type { WordReviewEventsRepository } from "./word-review-events-repository";
import { WordsRepository, type SavedWordRow } from "./words-repository";
import { WordsService } from "./words.service";

/**
 * FeedService.spec.ts / feed.service.spec.ts ile AYNI desen: NestJS DI container'ı
 * olmadan, doğrudan stub bağımlılıklarla test ediyoruz. Bu dosya SADECE
 * WordsService'in orkestrasyonunu doğruluyor — scheduling'in kendi boundary
 * mantığı review-scheduling.spec.ts'te, selection'ın kendi tier/tie-break
 * mantığı review-selection.spec.ts'te, gerçek Postgres davranışı
 * words-repository.integration.spec.ts / word-review-events-repository.integration.spec.ts'te.
 */

const USER_ID = "00000000-0000-4000-8000-000000000001";
const WORD_A_ID = "00000000-0000-4000-9000-00000000000a";
const WORD_B_ID = "00000000-0000-4000-9000-00000000000b";
const WORD_C_ID = "00000000-0000-4000-9000-00000000000c";
const SEGMENT_ID = "00000000-0000-4000-a000-000000000001";

function makeWord(id: string, lemma: string): Word {
  return { id, language: "en", lemma, gloss: `${lemma} gloss` };
}

function makeSavedWordRow(word: Word, savedAt: Date, sourceSentence: string | null = null): SavedWordRow {
  return { word, savedAt, sourceSentence };
}

type Overrides = {
  findWordById?: (wordId: string) => Promise<Word | null>;
  userExists?: boolean;
  isSegmentConsistentWithWord?: (segmentId: string, wordId: string) => Promise<boolean>;
  saveWordSpy?: (userId: string, wordId: string, sourceSegmentId: string | null) => void;
  findSavedWordsForUser?: () => Promise<SavedWordRow[]>;
  findEventsForUser?: () => Promise<Map<string, { isCorrect: boolean; reviewedAt: Date }[]>>;
  recordSpy?: (params: { userId: string; wordId: string; isCorrect: boolean }) => void;
  getSavedWordCounts?: (userId: string, since: Date) => Promise<{ total: number; sinceCount: number }>;
  getReviewCounts?: (
    userId: string,
    since: Date,
  ) => Promise<{ reviewed: number; reviewedSince: number; correct: number; correctSince: number }>;
};

function makeService(overrides: Overrides = {}): WordsService {
  const wordsRepository = {
    findWordById: overrides.findWordById ?? ((wordId: string) => Promise.resolve(makeWord(wordId, "journey"))),
    saveWord: (userId: string, wordId: string, sourceSegmentId: string | null = null) => {
      overrides.saveWordSpy?.(userId, wordId, sourceSegmentId);
      return Promise.resolve();
    },
    unsaveWord: () => Promise.resolve(),
    isSegmentConsistentWithWord: overrides.isSegmentConsistentWithWord ?? (() => Promise.resolve(true)),
    findSavedWordsForUser: overrides.findSavedWordsForUser ?? (() => Promise.resolve([])),
    getSavedWordCounts: overrides.getSavedWordCounts ?? (() => Promise.resolve({ total: 0, sinceCount: 0 })),
    findVocabularyForVideos: () => Promise.resolve([]),
  } as unknown as WordsRepository;

  const wordReviewEventsRepository = {
    record: (params: { userId: string; wordId: string; isCorrect: boolean }) => {
      overrides.recordSpy?.(params);
      return Promise.resolve();
    },
    findEventsForUser: overrides.findEventsForUser ?? (() => Promise.resolve(new Map())),
    getReviewCounts: overrides.getReviewCounts ?? (() => Promise.resolve({ reviewed: 0, reviewedSince: 0, correct: 0, correctSince: 0 })),
  } as unknown as WordReviewEventsRepository;

  const usersService = {
    userExists: () => Promise.resolve(overrides.userExists ?? true),
  } as unknown as UsersService;

  return new WordsService(wordsRepository, wordReviewEventsRepository, usersService);
}

describe("WordsService", () => {
  describe("saveWord — sourceSegmentId tutarlılık kontrolü", () => {
    it("sourceSegmentId verilmemişse isSegmentConsistentWithWord HİÇ çağrılmaz, saveWord null context ile çağrılır", async () => {
      const isSegmentConsistentWithWord = jest.fn(() => Promise.resolve(true));
      const saveWordSpy = jest.fn();
      const service = makeService({ isSegmentConsistentWithWord, saveWordSpy });

      await service.saveWord(WORD_A_ID, USER_ID);

      expect(isSegmentConsistentWithWord).not.toHaveBeenCalled();
      expect(saveWordSpy).toHaveBeenCalledWith(USER_ID, WORD_A_ID, null);
    });

    it("sourceSegmentId verilmiş ve tutarlıysa saveWord bu context ile çağrılır", async () => {
      const isSegmentConsistentWithWord = jest.fn(() => Promise.resolve(true));
      const saveWordSpy = jest.fn();
      const service = makeService({ isSegmentConsistentWithWord, saveWordSpy });

      await service.saveWord(WORD_A_ID, USER_ID, SEGMENT_ID);

      expect(isSegmentConsistentWithWord).toHaveBeenCalledWith(SEGMENT_ID, WORD_A_ID);
      expect(saveWordSpy).toHaveBeenCalledWith(USER_ID, WORD_A_ID, SEGMENT_ID);
    });

    it("sourceSegmentId verilmiş ama TUTARSIZSA BadRequestException fırlatır, saveWord'e hiç ulaşmaz", async () => {
      const isSegmentConsistentWithWord = jest.fn(() => Promise.resolve(false));
      const saveWordSpy = jest.fn();
      const service = makeService({ isSegmentConsistentWithWord, saveWordSpy });

      await expect(service.saveWord(WORD_A_ID, USER_ID, SEGMENT_ID)).rejects.toThrow(BadRequestException);
      expect(saveWordSpy).not.toHaveBeenCalled();
    });
  });

  describe("getReviewSession — scheduling + selection kompozisyonu", () => {
    it("hiç review edilmemiş kelime dueIncorrect'ten ÖNCE gelir (tier sırası korunur)", async () => {
      const now = new Date("2026-01-15T00:00:00.000Z");
      const wordA = makeWord(WORD_A_ID, "journey");
      const wordB = makeWord(WORD_B_ID, "habit");
      const savedAtA = new Date("2026-01-01T00:00:00.000Z");
      const savedAtB = new Date("2026-01-10T00:00:00.000Z");

      const eventsByWordId = new Map([[WORD_A_ID, [{ isCorrect: false, reviewedAt: new Date("2026-01-12T00:00:00.000Z") }]]]);

      const service = makeService({
        findSavedWordsForUser: () => Promise.resolve([makeSavedWordRow(wordA, savedAtA), makeSavedWordRow(wordB, savedAtB)]),
        findEventsForUser: () => Promise.resolve(eventsByWordId),
      });

      // now'ı service içinde `new Date()` ile üretiyor — bu testte gerçek clock'a
      // bağımlı olmamak için jest fake timers kullanıyoruz.
      jest.useFakeTimers().setSystemTime(now);
      try {
        const session = await service.getReviewSession(USER_ID);
        expect(session.map((w) => w.word.lemma)).toEqual(["habit", "journey"]);
      } finally {
        jest.useRealTimers();
      }
    });

    it("notDue bir kelime session'a HİÇ dahil edilmez (padding yok)", async () => {
      const now = new Date("2026-01-15T00:00:00.000Z");
      const wordA = makeWord(WORD_A_ID, "journey"); // hiç review edilmemiş → due
      const wordB = makeWord(WORD_B_ID, "habit"); // dün doğru cevaplandı, +1 gün henüz dolmadı → notDue
      const savedAt = new Date("2026-01-01T00:00:00.000Z");

      const eventsByWordId = new Map([[WORD_B_ID, [{ isCorrect: true, reviewedAt: new Date("2026-01-14T12:00:00.000Z") }]]]);

      const service = makeService({
        findSavedWordsForUser: () => Promise.resolve([makeSavedWordRow(wordA, savedAt), makeSavedWordRow(wordB, savedAt)]),
        findEventsForUser: () => Promise.resolve(eventsByWordId),
      });

      jest.useFakeTimers().setSystemTime(now);
      try {
        const session = await service.getReviewSession(USER_ID);
        expect(session.map((w) => w.word.lemma)).toEqual(["journey"]);
      } finally {
        jest.useRealTimers();
      }
    });

    it("5'ten fazla due kelime varsa en fazla REVIEW_SESSION_SIZE (5) döner", async () => {
      const now = new Date("2026-01-15T00:00:00.000Z");
      const savedAt = new Date("2026-01-01T00:00:00.000Z");
      const words = Array.from({ length: 7 }, (_, i) => makeWord(`00000000-0000-4000-9000-0000000000${String(i).padStart(2, "0")}`, `word-${i}`));

      const service = makeService({
        findSavedWordsForUser: () => Promise.resolve(words.map((w) => makeSavedWordRow(w, savedAt))),
        findEventsForUser: () => Promise.resolve(new Map()),
      });

      jest.useFakeTimers().setSystemTime(now);
      try {
        const session = await service.getReviewSession(USER_ID);
        expect(session).toHaveLength(5);
      } finally {
        jest.useRealTimers();
      }
    });

    it("saved kelime sayısı due sayısından az/sadece 2 due varsa TAM 2 döner (asla 5'e pad edilmez)", async () => {
      const now = new Date("2026-01-15T00:00:00.000Z");
      const savedAt = new Date("2026-01-01T00:00:00.000Z");
      const wordA = makeWord(WORD_A_ID, "journey");
      const wordB = makeWord(WORD_B_ID, "habit");

      const service = makeService({
        findSavedWordsForUser: () => Promise.resolve([makeSavedWordRow(wordA, savedAt), makeSavedWordRow(wordB, savedAt)]),
        findEventsForUser: () => Promise.resolve(new Map()),
      });

      jest.useFakeTimers().setSystemTime(now);
      try {
        const session = await service.getReviewSession(USER_ID);
        expect(session).toHaveLength(2);
      } finally {
        jest.useRealTimers();
      }
    });

    it("hiç kayıtlı kelime yoksa boş dizi döner", async () => {
      const service = makeService({ findSavedWordsForUser: () => Promise.resolve([]) });

      const session = await service.getReviewSession(USER_ID);
      expect(session).toEqual([]);
    });
  });

  describe("recordReview", () => {
    it("wordId/userId var olduğunu doğruladıktan sonra event'i repository'ye delege eder", async () => {
      const recordSpy = jest.fn();
      const service = makeService({ recordSpy });

      await service.recordReview(WORD_C_ID, USER_ID, true);

      expect(recordSpy).toHaveBeenCalledWith({ userId: USER_ID, wordId: WORD_C_ID, isCorrect: true });
    });

    it("kelime bulunamazsa NotFoundException fırlatır, event'e hiç ulaşmaz", async () => {
      const recordSpy = jest.fn();
      const service = makeService({ findWordById: () => Promise.resolve(null), recordSpy });

      await expect(service.recordReview(WORD_C_ID, USER_ID, true)).rejects.toThrow();
      expect(recordSpy).not.toHaveBeenCalled();
    });
  });

  describe("getProgress — DTO assembly", () => {
    it("repository sonuçlarını doğru alanlara eşler (6 alan da distinct kelime sayısı semantiği)", async () => {
      const service = makeService({
        getSavedWordCounts: () => Promise.resolve({ total: 10, sinceCount: 3 }),
        getReviewCounts: () => Promise.resolve({ reviewed: 6, reviewedSince: 2, correct: 4, correctSince: 1 }),
      });

      const progress = await service.getProgress(USER_ID);

      expect(progress).toEqual({
        savedCount: 10,
        reviewedCount: 6,
        rememberedCorrectlyCount: 4,
        savedThisWeek: 3,
        reviewedThisWeek: 2,
        rememberedCorrectlyThisWeek: 1,
      });
    });

    it("'since' penceresi olarak yaklaşık şimdi - 7 gün geçirir (her iki repository çağrısına da AYNI değer)", async () => {
      let savedCountsSince: Date | undefined;
      let reviewCountsSince: Date | undefined;
      const service = makeService({
        getSavedWordCounts: (_userId, since) => {
          savedCountsSince = since;
          return Promise.resolve({ total: 0, sinceCount: 0 });
        },
        getReviewCounts: (_userId, since) => {
          reviewCountsSince = since;
          return Promise.resolve({ reviewed: 0, reviewedSince: 0, correct: 0, correctSince: 0 });
        },
      });

      const before = Date.now();
      await service.getProgress(USER_ID);
      const after = Date.now();

      expect(savedCountsSince).toBeDefined();
      expect(reviewCountsSince).toBeDefined();
      expect(savedCountsSince!.getTime()).toBe(reviewCountsSince!.getTime());

      const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
      expect(savedCountsSince!.getTime()).toBeGreaterThanOrEqual(before - sevenDaysMs - 1000);
      expect(savedCountsSince!.getTime()).toBeLessThanOrEqual(after - sevenDaysMs + 1000);
    });
  });
});
