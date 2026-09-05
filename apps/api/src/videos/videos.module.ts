import { Module } from "@nestjs/common";
import { UsersModule } from "../users/users.module";
import { VideoWatchEventsRepository } from "./video-watch-events-repository";
import { VideosController } from "./videos.controller";
import { VideosRepository } from "./videos-repository";
import { VideosService } from "./videos.service";

@Module({
  imports: [UsersModule],
  controllers: [VideosController],
  providers: [VideosService, VideosRepository, VideoWatchEventsRepository],
  exports: [VideosService],
})
export class VideosModule {}
