import { BadRequestException, Body, Controller, Get, Param, ParseUUIDPipe, Post } from "@nestjs/common";
import {
  recordVideoWatchEventRequestSchema,
  type PlayableVideo,
  type RecordVideoWatchEventRequest,
} from "@linguascroll/shared-types";
import { VideosService } from "./videos.service";

@Controller("videos")
export class VideosController {
  constructor(private readonly videosService: VideosService) {}

  @Get()
  getVideos(): Promise<PlayableVideo[]> {
    return this.videosService.getVideoFeed();
  }

  // videoId path parametresi external input — ParseUUIDPipe malformed UUID'yi
  // service/repository'ye hiç ulaşmadan 400 ile reddeder (bkz. quizzes.controller.ts'teki
  // aynı desen). Varsayılan POST durumu 201 (Created) burada semantik olarak doğru:
  // bu endpoint gerçekten yeni bir kaynak (bir watch-event satırı) yaratıyor.
  @Post(":videoId/watch-events")
  recordWatchEvent(
    @Param("videoId", new ParseUUIDPipe()) videoId: string,
    @Body() body: unknown,
  ): Promise<void> {
    const { userId, watchedMs } = this.parseWatchEventRequest(body);
    return this.videosService.recordWatchEvent(videoId, userId, watchedMs);
  }

  private parseWatchEventRequest(body: unknown): RecordVideoWatchEventRequest {
    const result = recordVideoWatchEventRequestSchema.safeParse(body);
    if (!result.success) {
      throw new BadRequestException(result.error.flatten());
    }
    return result.data;
  }
}
