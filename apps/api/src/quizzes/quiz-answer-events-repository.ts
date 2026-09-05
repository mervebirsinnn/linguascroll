import { Inject, Injectable } from "@nestjs/common";
import { DRIZZLE_DB, type Database } from "../database/database.module";
import { quizAnswerEventsTable } from "./quiz-answer-events.schema";

/**
 * quizzes aggregate'inin (quizzes + quiz_options) parçası değil — ayrı bir
 * aggregate, ayrı repository. QuizzesRepository ile birleştirilmiyor.
 */
@Injectable()
export class QuizAnswerEventsRepository {
  constructor(@Inject(DRIZZLE_DB) private readonly db: Database) {}

  async record(params: { userId: string; selectedOptionId: string; isCorrect: boolean }): Promise<void> {
    await this.db.insert(quizAnswerEventsTable).values(params);
  }
}
