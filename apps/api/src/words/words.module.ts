import { Module } from "@nestjs/common";
import { UsersModule } from "../users/users.module";
import { WordReviewEventsRepository } from "./word-review-events-repository";
import { WordsController } from "./words.controller";
import { WordsRepository } from "./words-repository";
import { WordsService } from "./words.service";

@Module({
  imports: [UsersModule],
  controllers: [WordsController],
  providers: [WordsService, WordsRepository, WordReviewEventsRepository],
  exports: [WordsService],
})
export class WordsModule {}
