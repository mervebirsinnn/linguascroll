import { Module } from "@nestjs/common";
import { SubscriptionsModule } from "../subscriptions/subscriptions.module";
import { UsersModule } from "../users/users.module";
import { PassageAnswersRepository } from "./passage-answers-repository";
import { PassagesController } from "./passages.controller";
import { PassagesRepository } from "./passages-repository";
import { PassagesService } from "./passages.service";

// UsersModule: FirebaseAuthGuard'ın UsersService'i için (quizzes ile aynı). SubscriptionsModule: erişim kararı (hasFullAccess).
@Module({
  imports: [UsersModule, SubscriptionsModule],
  controllers: [PassagesController],
  providers: [PassagesService, PassagesRepository, PassageAnswersRepository],
})
export class PassagesModule {}
