import { Inject, Injectable } from "@nestjs/common";
import type { VideoFeedbackRequest } from "@linguascroll/shared-types";
import { eq } from "drizzle-orm";
import { DRIZZLE_DB, type Database } from "../database/database.module";
import { videosTable } from "../videos/videos.schema";
import { videoFeedbackTable } from "./video-feedback.schema";
@Injectable()
export class FeedbackRepository {
  constructor(@Inject(DRIZZLE_DB) private readonly db: Database) {}
  async save(userId: string, videoId: string, input: VideoFeedbackRequest): Promise<boolean> {
    return this.db.transaction(async (tx) => {
      const [video] = await tx.select({ id: videosTable.id }).from(videosTable).where(eq(videosTable.id, videoId));
      if (!video) return false;
      await tx.insert(videoFeedbackTable).values({ userId, videoId, ...input }).onConflictDoUpdate({ target: [videoFeedbackTable.userId, videoFeedbackTable.videoId, videoFeedbackTable.reason], set: { comment: input.comment, updatedAt: new Date() } });
      return true;
    });
  }
}
