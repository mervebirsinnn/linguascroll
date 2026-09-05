import { BadRequestException, Body, Controller, Delete, Param, ParseUUIDPipe, Put, Query } from "@nestjs/common";
import { saveWordRequestSchema, type SaveWordRequest } from "@linguascroll/shared-types";
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
    const { userId } = this.parseSaveWordRequest(body);
    await this.wordsService.saveWord(wordId, userId);
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

  private parseSaveWordRequest(body: unknown): SaveWordRequest {
    const result = saveWordRequestSchema.safeParse(body);
    if (!result.success) {
      throw new BadRequestException(result.error.flatten());
    }
    return result.data;
  }
}
