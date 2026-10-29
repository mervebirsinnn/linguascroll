import { Inject, Injectable } from "@nestjs/common";
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

  // 2026-10-27 — `countDistinctVideosWatchedSince` (günlük ücretsiz limit sayacı) KALDIRILDI:
  // ücretsiz hak artık bu analitik log'dan değil, oynatma erişiminde tüketilen ayrı bir
  // defterden sayılıyor (bkz. subscriptions/free-video-grants-repository.ts). Bu tablo
  // yalnızca izlenme analitiği/personalization sinyali olarak kalıyor.
  async record(params: { userId: string; videoId: string; watchedMs: number }): Promise<void> {
    await this.db.insert(videoWatchEventsTable).values(params);
  }
}
