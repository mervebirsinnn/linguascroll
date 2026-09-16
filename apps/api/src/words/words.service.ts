import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { savedWordSchema, type SavedWord, type VideoVocabularyItem, type WordsProgress } from "@linguascroll/shared-types";
import { UsersService } from "../users/users.service";
import { computeWordReviewState } from "./review-scheduling";
import { REVIEW_SESSION_SIZE, selectReviewSession, type ReviewCandidate } from "./review-selection";
import { WordReviewEventsRepository } from "./word-review-events-repository";
import { WordsRepository, type SavedWordRow } from "./words-repository";

/** Progress'in "Bu hafta" penceresi — sabit, rolling 7 gün (takvim haftası DEĞİL). Chunk 16 kullanıcı kararı. */
const PROGRESS_WEEK_WINDOW_DAYS = 7;

/**
 * SQL/Drizzle bilmiyor — sadece WordsRepository'nin döndürdüğü Word[]/satırları
 * alır. wordId path'te (kaynağın kendisi) bulunamazsa 404; userId body/query'de
 * (referans verilen bir başka kaynak) bulunamazsa 400 — VideosService.recordWatchEvent
 * / QuizzesService.answerQuiz'teki AYNI kural.
 *
 * Chunk 16 — ayrı bir ReviewService/ProgressService YOK (kullanıcı kararı: "sırf
 * isim olsun diye pass-through abstraction ekleme") — review/progress de
 * "kelime" domain'inin bir parçası, WordsController/Service/Repository'nin
 * mevcut sınırları genişletildi, yeni bir katman eklenmedi.
 */
@Injectable()
export class WordsService {
  constructor(
    private readonly wordsRepository: WordsRepository,
    private readonly wordReviewEventsRepository: WordReviewEventsRepository,
    private readonly usersService: UsersService,
  ) {}

  /**
   * Chunk 16 — `sourceSegmentId` opsiyonel. Verilmişse, GERÇEKTEN bu kelimenin
   * bu segment'in videosuyla ilişkili olduğu doğrulanıyor (tahmini bir context
   * ASLA kabul edilmiyor) — tutarsızsa 400 (client'ın gönderdiği bir referans
   * geçersiz, VideosService.recordWatchEvent'teki "body'de referans verilen
   * kaynak geçersiz → 400" kuralıyla AYNI).
   */
  async saveWord(wordId: string, userId: string, sourceSegmentId?: string | null): Promise<void> {
    await this.assertWordAndUserExist(wordId, userId);

    if (sourceSegmentId) {
      const isConsistent = await this.wordsRepository.isSegmentConsistentWithWord(sourceSegmentId, wordId);
      if (!isConsistent) {
        throw new BadRequestException(
          `"${sourceSegmentId}" segment'i, "${wordId}" kelimesinin ilişkili olduğu bir videoya ait değil`,
        );
      }
    }

    await this.wordsRepository.saveWord(userId, wordId, sourceSegmentId ?? null);
  }

  async unsaveWord(wordId: string, userId: string): Promise<void> {
    await this.assertWordAndUserExist(wordId, userId);
    await this.wordsRepository.unsaveWord(userId, wordId);
  }

  /**
   * Chunk 9 — FeedService'in sayfa resolve ederken çağırdığı batch enrichment.
   * userId'nin var olduğunu burada AYRICA doğrulamıyor — FeedService.getFeed
   * zaten kendi userExists kontrolünü en başta yapmış oluyor (tek kontrol noktası).
   */
  async getVocabularyForVideos(videoIds: string[], userId: string): Promise<Map<string, VideoVocabularyItem[]>> {
    const rows = await this.wordsRepository.findVocabularyForVideos(videoIds, userId);

    const vocabularyByVideoId = new Map<string, VideoVocabularyItem[]>();
    for (const row of rows) {
      const list = vocabularyByVideoId.get(row.videoId) ?? [];
      list.push({ word: row.word, saved: row.saved });
      vocabularyByVideoId.set(row.videoId, list);
    }
    return vocabularyByVideoId;
  }

  /** Chunk 16 — Memory ekranı. Sıralama: en son kaydedilen önce (kullanıcı için en "taze" liste). */
  async getSavedWords(userId: string): Promise<SavedWord[]> {
    await this.assertUserExists(userId);
    const rows = await this.wordsRepository.findSavedWordsForUser(userId);
    return [...rows].sort((a, b) => b.savedAt.getTime() - a.savedAt.getTime()).map(toSavedWord);
  }

  /**
   * Chunk 16 — deterministic review session. `review-scheduling.ts`/
   * `review-selection.ts`'in saf fonksiyonlarını, GERÇEK persistence'la
   * (saved words + review events) birleştiren TEK yer — algoritmanın kendisi
   * burada YOK, sadece çağrılıyor.
   */
  async getReviewSession(userId: string): Promise<SavedWord[]> {
    await this.assertUserExists(userId);

    const savedRows = await this.wordsRepository.findSavedWordsForUser(userId);
    const eventsByWordId = await this.wordReviewEventsRepository.findEventsForUser(userId);
    const now = new Date();

    const rowByWordId = new Map(savedRows.map((row) => [row.word.id, row]));
    const candidates: ReviewCandidate[] = savedRows.map((row) => ({
      wordId: row.word.id,
      savedAt: row.savedAt,
      state: computeWordReviewState(eventsByWordId.get(row.word.id) ?? [], now),
    }));

    const selected = selectReviewSession(candidates, REVIEW_SESSION_SIZE);
    return selected.map((candidate) => toSavedWord(rowByWordId.get(candidate.wordId)!));
  }

  async recordReview(wordId: string, userId: string, correct: boolean): Promise<void> {
    await this.assertWordAndUserExist(wordId, userId);
    await this.wordReviewEventsRepository.record({ userId, wordId, isCorrect: correct });
  }

  /** Chunk 16 — tüm alanlar DISTINCT kelime sayısı (bkz. shared-types/words-progress.ts'in semantik yorumu). */
  async getProgress(userId: string): Promise<WordsProgress> {
    await this.assertUserExists(userId);

    const since = new Date(Date.now() - PROGRESS_WEEK_WINDOW_DAYS * 24 * 60 * 60 * 1000);
    const [savedCounts, reviewCounts] = await Promise.all([
      this.wordsRepository.getSavedWordCounts(userId, since),
      this.wordReviewEventsRepository.getReviewCounts(userId, since),
    ]);

    return {
      savedCount: savedCounts.total,
      reviewedCount: reviewCounts.reviewed,
      rememberedCorrectlyCount: reviewCounts.correct,
      savedThisWeek: savedCounts.sinceCount,
      reviewedThisWeek: reviewCounts.reviewedSince,
      rememberedCorrectlyThisWeek: reviewCounts.correctSince,
    };
  }

  private async assertUserExists(userId: string): Promise<void> {
    const userExists = await this.usersService.userExists(userId);
    if (!userExists) {
      throw new BadRequestException(`"${userId}", var olan bir kullanıcıya ait değil`);
    }
  }

  private async assertWordAndUserExist(wordId: string, userId: string): Promise<void> {
    const word = await this.wordsRepository.findWordById(wordId);
    if (!word) {
      throw new NotFoundException(`Kelime bulunamadı: "${wordId}"`);
    }
    await this.assertUserExists(userId);
  }
}

function toSavedWord(row: SavedWordRow): SavedWord {
  return savedWordSchema.parse({
    word: row.word,
    savedAt: row.savedAt.toISOString(),
    sourceSentence: row.sourceSentence,
  });
}
