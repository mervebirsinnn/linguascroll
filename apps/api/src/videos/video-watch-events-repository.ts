import { Inject, Injectable } from "@nestjs/common";
import { and, eq, gte, sql } from "drizzle-orm";
import { DRIZZLE_DB, type Database } from "../database/database.module";
import { videoWatchEventsTable } from "./video-watch-events.schema";

/**
 * videos aggregate'inin PARÇASI değil (bir video kendi watch-event'lerine sahip
 * değil, VideosRepository'nin bildiği tablo değil) — ayrı bir repository, ayrı
 * bir aggregate. Feature-klasörü olarak VideosModule'de yaşıyor çünkü konusu
 * video, ama VideosRepository ile birleştirilmiyor.
 */
@Injectable()
export class VideoWatchEventsRepository {
  constructor(@Inject(DRIZZLE_DB) private readonly db: Database) {}

  async record(params: { userId: string; videoId: string; watchedMs: number }): Promise<void> {
    await this.db.insert(videoWatchEventsTable).values(params);
  }

  /**
   * 2026-10-01 — ücretsiz günlük video limiti (bkz. subscriptions modülü) için:
   * `since`'ten bu yana FARKLI kaç video izlenmiş (`COUNT(DISTINCT video_id)`,
   * aynı videoyu scroll-back ile tekrar izlemek yeni bir hak YAKMAZ).
   * `minWatchedMs` eşiği (bkz. çağıranın sabiti) kısa bir scroll-geçişinin bir
   * hak yakmasını engelliyor — `personalization-repository.ts`'teki
   * `getTopicAffinity` ile AYNI sorgu stili (Drizzle `sql` + `.where(eq(userId))`).
   */
  async countDistinctVideosWatchedSince(userId: string, since: Date, minWatchedMs: number): Promise<number> {
    const [row] = await this.db
      .select({ count: sql<number>`COUNT(DISTINCT ${videoWatchEventsTable.videoId})` })
      .from(videoWatchEventsTable)
      .where(
        and(
          eq(videoWatchEventsTable.userId, userId),
          gte(videoWatchEventsTable.watchedMs, minWatchedMs),
          gte(videoWatchEventsTable.createdAt, since),
        ),
      );
    return Number(row?.count ?? 0);
  }
}
