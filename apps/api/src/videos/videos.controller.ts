import { BadRequestException, Body, Controller, Param, ParseUUIDPipe, Post, UseGuards } from "@nestjs/common";
import { recordVideoWatchEventRequestSchema, type RecordVideoWatchEventRequest } from "@linguascroll/shared-types";
import { AuthUserId, FirebaseAuthGuard } from "../auth/firebase-auth.guard";
import { VideosService } from "./videos.service";

// 2026-10-27 — kimlik SADECE doğrulanmış Firebase token'ından (body'deki userId kaldırıldı).
@Controller("videos")
@UseGuards(FirebaseAuthGuard)
export class VideosController {
  constructor(private readonly videosService: VideosService) {}

  // 2026-10-27 — `GET /videos` KALDIRILDI: tüm kataloğu oynatılabilir URL'leriyle, hak
  // kontrolü olmadan dönüyordu (ücretsiz sınırı deliyordu); mobile kullanmıyordu.
  // Oynatma URL'i artık yalnızca feed (erişimi zaten olan videolar için) ve
  // `POST /videos/:id/playback-access` (bkz. subscriptions/subscriptions.controller.ts) üzerinden.

  // videoId path parametresi external input — ParseUUIDPipe malformed UUID'yi
  // service/repository'ye hiç ulaşmadan 400 ile reddeder (bkz. quizzes.controller.ts'teki
  // aynı desen). Varsayılan POST durumu 201 (Created) burada semantik olarak doğru:
  // bu endpoint gerçekten yeni bir kaynak (bir watch-event satırı) yaratıyor.
  @Post(":videoId/watch-events")
  recordWatchEvent(
    @Param("videoId", new ParseUUIDPipe()) videoId: string,
    @Body() body: unknown,
    @AuthUserId() userId: string,
  ): Promise<void> {
    const { watchedMs } = this.parseWatchEventRequest(body);
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
