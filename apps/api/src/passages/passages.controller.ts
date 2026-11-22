import { BadRequestException, Body, Controller, Get, HttpCode, Param, ParseUUIDPipe, Post, Query, UseGuards } from "@nestjs/common";
import {
  answerPassageQuestionRequestSchema,
  passagesQuerySchema,
  type AnswerPassageQuestionRequest,
  type PassageAnswerResult,
  type PassagePage,
  type PassagesQuery,
  type ClientPlatform,
} from "@linguascroll/shared-types";
import { AuthUserId, FirebaseAuthGuard } from "../auth/firebase-auth.guard";
import { RequestPlatform } from "../subscriptions/request-platform.decorator";
import { PassagesService } from "./passages.service";

// Kimlik SADECE doğrulanmış Firebase token'ından (query/body'de userId yok) — quizzes.controller ile aynı kural.
@Controller("passages")
@UseGuards(FirebaseAuthGuard)
export class PassagesController {
  constructor(private readonly passagesService: PassagesService) {}

  @Get()
  list(@Query() query: unknown, @AuthUserId() userId: string, @RequestPlatform() platform: ClientPlatform | null): Promise<PassagePage> {
    return this.passagesService.listPassages(userId, this.parseQuery(query), platform);
  }

  // POST ama kaynak YARATMIYOR, bir cevabı kaydedip değerlendiriyor: 200 (quizzes answer ile aynı karar). questionId path
  // parametresi external input — ParseUUIDPipe malformed UUID'yi Postgres'e hiç ulaşmadan 400'e çevirir.
  @Post("questions/:questionId/answer")
  @HttpCode(200)
  answer(
    @Param("questionId", new ParseUUIDPipe()) questionId: string,
    @Body() body: unknown,
    @AuthUserId() userId: string,
    @RequestPlatform() platform: ClientPlatform | null,
  ): Promise<PassageAnswerResult> {
    const { optionId } = this.parseAnswerRequest(body);
    return this.passagesService.answerQuestion(userId, questionId, optionId, platform);
  }

  private parseQuery(query: unknown): PassagesQuery {
    const result = passagesQuerySchema.safeParse(query);
    if (!result.success) {
      throw new BadRequestException(result.error.flatten());
    }
    return result.data;
  }

  private parseAnswerRequest(body: unknown): AnswerPassageQuestionRequest {
    const result = answerPassageQuestionRequestSchema.safeParse(body);
    if (!result.success) {
      throw new BadRequestException(result.error.flatten());
    }
    return result.data;
  }
}
