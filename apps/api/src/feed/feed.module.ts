import { Module } from "@nestjs/common";
import { PersonalizationModule } from "../personalization/personalization.module";
import { QuizzesModule } from "../quizzes/quizzes.module";
import { UsersModule } from "../users/users.module";
import { VideosModule } from "../videos/videos.module";
import { WordsModule } from "../words/words.module";
import { FeedController } from "./feed.controller";
import { FeedService } from "./feed.service";

@Module({
  imports: [VideosModule, QuizzesModule, PersonalizationModule, UsersModule, WordsModule],
  controllers: [FeedController],
  providers: [FeedService],
})
export class FeedModule {}
