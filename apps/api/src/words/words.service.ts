import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import type { VideoVocabularyItem } from "@linguascroll/shared-types";
import { UsersService } from "../users/users.service";
import { WordsRepository } from "./words-repository";

/**
 * SQL/Drizzle bilmiyor — sadece WordsRepository'nin döndürdüğü Word[]/satırları
 * alır. wordId path'te (kaynağın kendisi) bulunamazsa 404; userId body/query'de
 * (referans verilen bir başka kaynak) bulunamazsa 400 — VideosService.recordWatchEvent
 * / QuizzesService.answerQuiz'teki AYNI kural.
 */
@Injectable()
export class WordsService {
  constructor(
    private readonly wordsRepository: WordsRepository,
    private readonly usersService: UsersService,
  ) {}

  async saveWord(wordId: string, userId: string): Promise<void> {
    await this.assertWordAndUserExist(wordId, userId);
    await this.wordsRepository.saveWord(userId, wordId);
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

  private async assertWordAndUserExist(wordId: string, userId: string): Promise<void> {
    const word = await this.wordsRepository.findWordById(wordId);
    if (!word) {
      throw new NotFoundException(`Kelime bulunamadı: "${wordId}"`);
    }

    const userExists = await this.usersService.userExists(userId);
    if (!userExists) {
      throw new BadRequestException(`"${userId}", var olan bir kullanıcıya ait değil`);
    }
  }
}
