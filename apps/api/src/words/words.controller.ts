import { BadRequestException, Body, Controller, Delete, Get, HttpCode, Param, ParseUUIDPipe, Post, Put, Query, UseGuards } from "@nestjs/common";
import {
  recordWordReviewRequestSchema,
  saveWordRequestSchema,
  type RecordWordReviewRequest,
  type SavedWord,
  type VideoWordGlosses,
  type SaveWordRequest,
  type WordsProgress,
} from "@linguascroll/shared-types";
import { AuthUserId, FirebaseAuthGuard } from "../auth/firebase-auth.guard";
import { WordGlossesService } from "./word-glosses.service";
import { WordsService } from "./words.service";

/**
 * 2026-10-27 — kullanıcıya ait route'lar `FirebaseAuthGuard` ile korunuyor; kimlik SADECE
 * doğrulanmış token'dan (`@AuthUserId()`) geliyor — query/body'deki userId kaldırıldı.
 * `GET /words/glosses` kullanıcıya ait değil (videonun altyazı kelime anlamları), açık kalıyor.
 */
@Controller("words")
export class WordsController {
  constructor(
    private readonly wordsService: WordsService,
    private readonly wordGlossesService: WordGlossesService,
  ) {}

  // wordId path parametresi external input — ParseUUIDPipe malformed UUID'yi
  // service'e hiç ulaşmadan 400 ile reddeder (mevcut videos/quizzes controller
  // deseniyle aynı). PUT = "bu kaydı var et" — idempotent semantiği HTTP
  // metodunun kendisinde görünür (çift PUT güvenli, Service/Repository DB
  // seviyesinde de idempotent).
  @Put(":wordId/saved")
  @UseGuards(FirebaseAuthGuard)
  async saveWord(@Param("wordId", new ParseUUIDPipe()) wordId: string, @Body() body: unknown, @AuthUserId() userId: string): Promise<void> {
    const { sourceSegmentId } = this.parseSaveWordRequest(body);
    await this.wordsService.saveWord(wordId, userId, sourceSegmentId);
  }

  // DELETE = "bu kaydın var olmadığından emin ol" — aynı idempotent semantik.
  @Delete(":wordId/saved")
  @UseGuards(FirebaseAuthGuard)
  async unsaveWord(@Param("wordId", new ParseUUIDPipe()) wordId: string, @AuthUserId() userId: string): Promise<void> {
    await this.wordsService.unsaveWord(wordId, userId);
  }

  /**
   * Altyazı kelime anlamları (videonun tüm segment'leri tek yanıtta). `saved`/
   * `review` gibi sabit path'lerle çakışmaz: ":wordId/..." route'ları iki segment.
   */
  @Get("glosses")
  getVideoWordGlosses(@Query("videoId", new ParseUUIDPipe()) videoId: string): Promise<VideoWordGlosses> {
    return this.wordGlossesService.getForVideo(videoId);
  }

  /** Chunk 16 — Memory ekranı: kullanıcının TÜM kayıtlı kelime/phrase'leri. */
  @Get("saved")
  @UseGuards(FirebaseAuthGuard)
  getSavedWords(@AuthUserId() userId: string): Promise<SavedWord[]> {
    return this.wordsService.getSavedWords(userId);
  }

  /** Chunk 16 — deterministic review session (en fazla REVIEW_SESSION_SIZE, sadece gerçekten due olanlar). */
  @Get("review")
  @UseGuards(FirebaseAuthGuard)
  getReviewSession(@AuthUserId() userId: string): Promise<SavedWord[]> {
    return this.wordsService.getReviewSession(userId);
  }

  /** answer() ile AYNI desen (quizzes.controller.ts) — bir kaynak YARATMIYOR, bir sonucu kaydediyor, 200. */
  @Post(":wordId/review")
  @HttpCode(200)
  @UseGuards(FirebaseAuthGuard)
  async recordReview(@Param("wordId", new ParseUUIDPipe()) wordId: string, @Body() body: unknown, @AuthUserId() userId: string): Promise<void> {
    const { correct } = this.parseRecordReviewRequest(body);
    await this.wordsService.recordReview(wordId, userId, correct);
  }

  /** Chunk 16 — özet ilerleme (streak/XP/gamification YOK, sadece gerçek DISTINCT kelime sayıları). */
  @Get("progress")
  @UseGuards(FirebaseAuthGuard)
  getProgress(@AuthUserId() userId: string): Promise<WordsProgress> {
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
