import { Module } from "@nestjs/common";
import { UsersModule } from "../users/users.module";
import { VideosModule } from "../videos/videos.module";
import { RevenueCatClient } from "./revenue-cat-client";
import { SubscriptionsService } from "./subscriptions.service";

@Module({
  imports: [UsersModule, VideosModule],
  providers: [SubscriptionsService, RevenueCatClient],
  exports: [SubscriptionsService],
})
export class SubscriptionsModule {}
