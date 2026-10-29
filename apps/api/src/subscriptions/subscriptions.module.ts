import { Module } from "@nestjs/common";
import { UsersModule } from "../users/users.module";
import { VideosModule } from "../videos/videos.module";
import { FreeVideoGrantsRepository } from "./free-video-grants-repository";
import { RevenueCatClient } from "./revenue-cat-client";
import { SubscriptionsController } from "./subscriptions.controller";
import { SubscriptionsService } from "./subscriptions.service";

@Module({
  imports: [VideosModule, UsersModule],
  controllers: [SubscriptionsController],
  providers: [SubscriptionsService, RevenueCatClient, FreeVideoGrantsRepository],
  exports: [SubscriptionsService],
})
export class SubscriptionsModule {}
