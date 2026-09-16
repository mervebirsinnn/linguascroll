import { BadRequestException, Body, Controller, Delete, Get, HttpCode, Param, ParseUUIDPipe, Post, Put, Query } from "@nestjs/common";
import {
  recordWordReviewRequestSchema,
  saveWordRequestSchema,
  type RecordWordReviewRequest,
  type SavedWord,
  type SaveWordRequest,
  type WordsProgress,
} from "@linguascroll/shared-types";
import { WordsService } from "./words.service";

@Controller("words")
export class WordsController {
  constructor(private readonly wordsService: WordsService) {}

  // wordId path parametresi external input — ParseUUIDPipe malformed UUID'yi
  // service'e hiç ulaşmadan 400 ile reddeder (mevcut videos/quizzes controller
  // deseniyle aynı). PUT = "bu kaydı var et" — idempotent semantiği HTTP
  // metodunun kendisinde görünür (çift PUT güvenli, Service/Repository DB
  // seviyesinde de idempotent).
  @Put(":wordId/saved")
  async saveWord(@Param("wordId", new ParseUUIDPipe()) wordId: string, @Body() body: unknown): Promise<void> {
    const { userId, sourceSegmentId } = this.parseSaveWordRequest(body);
    await this.wordsService.saveWord(wordId, userId, sourceSegmentId);
  }

  // DELETE = "bu kaydın var olmadığından emin ol" — aynı idempotent semantik.
  // userId query'de: DELETE body'si taşımak (çoğu HTTP client/proxy'de) tutarsız
  // davranabiliyor, query param daha konvansiyonel.
  @Delete(":wordId/saved")
  async unsaveWord(
    @Param("wordId", new ParseUUIDPipe()) wordId: string,
    @Query("userId", new ParseUUIDPipe()) userId: string,
  ): Promise<void> {
    await this.wordsService.unsaveWord(wordId, userId);
  }

  /** Chunk 16 — Memory ekranı: kullanıcının TÜM kayıtlı kelime/phrase'leri. */
  @Get("saved")
  getSavedWords(@Query("userId", new ParseUUIDPipe()) userId: string): Promise<SavedWord[]> {
    return this.wordsService.getSavedWords(userId);
  }

  /** Chunk 16 — deterministic review session (en fazla REVIEW_SESSION_SIZE, sadece gerçekten due olanlar). */
  @Get("review")
  getReviewSession(@Query("userId", new ParseUUIDPipe()) userId: string): Promise<SavedWord[]> {
    return this.wordsService.getReviewSession(userId);
  }

  /** answer() ile AYNI desen (quizzes.controller.ts) — bir kaynak YARATMIYOR, bir sonucu kaydediyor, 200. */
  @Post(":wordId/review")
  @HttpCode(200)
  async recordReview(@Param("wordId", new ParseUUIDPipe()) wordId: string, @Body() body: unknown): Promise<void> {
    const { userId, correct } = this.parseRecordReviewRequest(body);
    await this.wordsService.recordReview(wordId, userId, correct);
  }

  /** Chunk 16 — özet ilerleme (streak/XP/gamification YOK, sadece gerçek DISTINCT kelime sayıları). */
  @Get("progress")
  getProgress(@Query("userId", new ParseUUIDPipe()) userId: string): Promise<WordsProgress> {
    return this.wordsService.getProgress(userId);
  }

  private parseSaveWordRequest(body: unknown): SaveWordRequest {
    const result = saveWordRequestSchema.safeParse(body);
    if (!result.success) {
      throw new BadRequestException(result.error.flatten());
    }
    return result.data;
  }

  private parseRecordReviewRequest(body: unknown): RecordWordReviewRequest {
    const result = recordWordReviewRequestSchema.safeParse(body);
    if (!result.success) {
      throw new BadRequestException(result.error.flatten());
    }
    return result.data;
  }
}
