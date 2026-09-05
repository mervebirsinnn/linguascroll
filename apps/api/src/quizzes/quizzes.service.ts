import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { feedQuizSchema, type AnswerQuizResponse, type FeedQuiz } from "@linguascroll/shared-types";
import { UsersService } from "../users/users.service";
import type { Quiz } from "./quiz";
import { QuizAnswerEventsRepository } from "./quiz-answer-events-repository";
import { QuizzesRepository } from "./quizzes-repository";

/**
 * SQL/Drizzle bilmiyor — sadece QuizzesRepository'nin döndürdüğü Quiz[]/Quiz'i
 * alır. 404/400, Nest'in kendi yerleşik exception sınıflarıyla sinyalleniyor —
 * ayrı bir custom exception hiyerarşisi kurulmuyor.
 */
@Injectable()
export class QuizzesService {
  constructor(
    private readonly quizzesRepository: QuizzesRepository,
    private readonly quizAnswerEventsRepository: QuizAnswerEventsRepository,
    private readonly usersService: UsersService,
  ) {}

  async getQuizFeed(): Promise<FeedQuiz[]> {
    const quizzes = await this.quizzesRepository.findQuizFeed();
    return quizzes.map(toFeedQuiz);
  }

  /** Chunk 8 — frozen feed-plan pagination'ın bir sayfasını resolve ederken kullanılır. */
  async getFeedQuizzesByIds(quizIds: string[]): Promise<FeedQuiz[]> {
    const quizzes = await this.quizzesRepository.findQuizzesByIds(quizIds);
    return quizzes.map(toFeedQuiz);
  }

  async answerQuiz(quizId: string, optionId: string, userId: string): Promise<AnswerQuizResponse> {
    const quiz = await this.quizzesRepository.findQuizById(quizId);
    if (!quiz) {
      throw new NotFoundException(`Quiz bulunamadı: "${quizId}"`);
    }

    const selectedOption = quiz.options.find((option) => option.id === optionId);
    if (!selectedOption) {
      throw new BadRequestException(`"${optionId}", "${quizId}" quiz'ine ait bir option değil`);
    }

    // userId (body — referans verilen bir başka kaynak) bulunamazsa 400 — quizId
    // path'te olduğu ve bulunamadığında 404 verdiği için bu iki kontrol farklı
    // semantiğe sahip (bkz. VideosService.recordWatchEvent'teki aynı kural).
    const userExists = await this.usersService.userExists(userId);
    if (!userExists) {
      throw new BadRequestException(`"${userId}", var olan bir kullanıcıya ait değil`);
    }

    const correctOption = quiz.options.find((option) => option.isCorrect);
    if (!correctOption) {
      // quizSchema.parse (repository sınırında) zaten "tam olarak bir doğru cevap"
      // invariant'ını garanti ediyor — bu satıra teorik olarak hiç girilmemeli.
      // Yine de sessizce yanlış bir sonuç dönmek yerine açıkça patlıyoruz.
      throw new Error(`Quiz "${quizId}" için doğru cevap bulunamadı — veri bütünlüğü sorunu`);
    }

    // Learning-signal kaydı, AYNI request/use-case içinde: server'ın kendi
    // hesapladığı selectedOption.isCorrect'ten yazılıyor — client hiçbir zaman
    // kendi "isCorrect" iddiasını göndermiyor (answerQuizRequestSchema'da böyle
    // bir alan yok). Ayrı bir /events çağrısı yapmıyoruz — bu, cevabın
    // değerlendirilip event'in hiç yazılmaması gibi bir double-write/partial-
    // failure riskini ortadan kaldırıyor.
    await this.quizAnswerEventsRepository.record({
      userId,
      selectedOptionId: selectedOption.id,
      isCorrect: selectedOption.isCorrect,
    });

    return { correct: selectedOption.isCorrect, correctOptionId: correctOption.id };
  }
}

function toFeedQuiz(quiz: Quiz): FeedQuiz {
  return feedQuizSchema.parse({
    id: quiz.id,
    question: quiz.question,
    options: quiz.options.map(({ id, text }) => ({ id, text })),
  });
}
