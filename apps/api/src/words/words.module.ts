import { Module } from "@nestjs/common";
import { UsersModule } from "../users/users.module";
import { SegmentWordGlossesRepository } from "./segment-word-glosses-repository";
import { WordGlossesService } from "./word-glosses.service";
import { WordReviewEventsRepository } from "./word-review-events-repository";
import { WordsController } from "./words.controller";
import { WordsRepository } from "./words-repository";
import { WordsService } from "./words.service";

@Module({
  imports: [UsersModule],
  controllers: [WordsController],
  providers: [WordsService, WordsRepository, WordReviewEventsRepository, SegmentWordGlossesRepository, WordGlossesService],
  exports: [WordsService],
})
export class WordsModule {}
