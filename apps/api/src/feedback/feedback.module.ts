import { BadRequestException, Body, Controller, HttpCode, Injectable, Module, NotFoundException, Param, ParseUUIDPipe, Post, UseGuards } from "@nestjs/common";
import { videoFeedbackRequestSchema, type VideoFeedbackRequest } from "@linguascroll/shared-types";
import { AuthUserId, FirebaseAuthGuard } from "../auth/firebase-auth.guard";
import { AuthModule } from "../auth/auth.module";
import { FeedbackRepository } from "./feedback-repository";
@Injectable()
class FeedbackService {
  constructor(private readonly repository: FeedbackRepository) {}
  async save(userId: string, videoId: string, input: VideoFeedbackRequest) {
    if (!(await this.repository.save(userId, videoId, input))) throw new NotFoundException("Video bulunamadı");
    return { saved: true };
  }
}
@Controller("videos")
@UseGuards(FirebaseAuthGuard)
class FeedbackController {
  constructor(private readonly service: FeedbackService) {}
  @Post(":videoId/feedback")
  @HttpCode(200)
  save(@AuthUserId() userId: string, @Param("videoId", new ParseUUIDPipe()) videoId: string, @Body() body: unknown) {
    const parsed = videoFeedbackRequestSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.flatten());
    return this.service.save(userId, videoId, parsed.data);
  }
}
@Module({ imports: [AuthModule], controllers: [FeedbackController], providers: [FeedbackRepository, FeedbackService] })
export class FeedbackModule {}
