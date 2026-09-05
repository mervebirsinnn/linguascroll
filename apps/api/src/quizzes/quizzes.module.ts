import { Module } from "@nestjs/common";
import { UsersModule } from "../users/users.module";
import { QuizAnswerEventsRepository } from "./quiz-answer-events-repository";
import { QuizzesController } from "./quizzes.controller";
import { QuizzesRepository } from "./quizzes-repository";
import { QuizzesService } from "./quizzes.service";

@Module({
  imports: [UsersModule],
  controllers: [QuizzesController],
  providers: [QuizzesService, QuizzesRepository, QuizAnswerEventsRepository],
  exports: [QuizzesService],
})
export class QuizzesModule {}
