import { BadRequestException, Body, Controller, HttpCode, Param, ParseUUIDPipe, Post } from "@nestjs/common";
import { answerQuizRequestSchema, type AnswerQuizRequest, type AnswerQuizResponse } from "@linguascroll/shared-types";
import { QuizzesService } from "./quizzes.service";

@Controller("quizzes")
export class QuizzesController {
  constructor(private readonly quizzesService: QuizzesService) {}

  // Nest'in @Post() varsayılanı 201 (Created) — ama bu endpoint bir kaynak
  // YARATMIYOR, bir cevabı değerlendiriyor. 200 semantik olarak doğru.
  //
  // quizId path parametresi external input — ParseUUIDPipe malformed UUID'yi
  // service/repository'ye hiç ulaşmadan 400 ile reddeder (aksi halde Postgres'e
  // geçersiz bir uuid literal'i gider ve query 500 ile patlar).
  @Post(":quizId/answer")
  @HttpCode(200)
  answer(
    @Param("quizId", new ParseUUIDPipe()) quizId: string,
    @Body() body: unknown,
  ): Promise<AnswerQuizResponse> {
    const { optionId, userId } = this.parseAnswerRequest(body);
    return this.quizzesService.answerQuiz(quizId, optionId, userId);
  }

  /** Body'nin unknown → typed geçişi burada olur — controller'ın "HTTP/request validation" sorumluluğu. */
  private parseAnswerRequest(body: unknown): AnswerQuizRequest {
    const result = answerQuizRequestSchema.safeParse(body);
    if (!result.success) {
      throw new BadRequestException(result.error.flatten());
    }
    return result.data;
  }
}
