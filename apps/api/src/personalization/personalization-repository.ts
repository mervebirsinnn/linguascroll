import { Inject, Injectable } from "@nestjs/common";
import { topicSchema, type Topic } from "@linguascroll/shared-types";
import { and, eq, gte, sql } from "drizzle-orm";
import { DRIZZLE_DB, type Database } from "../database/database.module";
import { videoWatchEventsTable } from "../videos/video-watch-events.schema";
import { videosTable } from "../videos/videos.schema";

/**
 * Sadece persistence: video_watch_events + videos üzerinde, kullanıcı bazlı
 * topic-affinity aggregate'i. Ranking/exploration policy BİLMİYOR — HTTP
 * exception üretmiyor, o PersonalizationService'in işi.
 */
@Injectable()
export class PersonalizationRepository {
  constructor(@Inject(DRIZZLE_DB) private readonly db: Database) {}

  /**
   * affinity(topic) = SUM(clamp(watchedMs / durationMs, 0, 1)) — her exposure'ın
   * oranı 0..1'e clamp'lenip topic bazında toplanıyor (AVG değil: tekrar izleme
   * bilinçli olarak affinity'yi güçlendirir, bkz. PersonalizationService).
   *
   * durationMs artık DB CHECK ile > 0 garantili (Chunk 7 — bkz. videos.schema.ts)
   * — düz bölme güvenli, NULLIF gibi bir sıfıra-bölme kalkanına gerek yok.
   *
   * Bir topic'in dönen satırlarda hiç bulunmaması "hiç izlenmemiş" (unseen) VE
   * "affinity = 0" anlamına AYNI ANDA gelir — bu ayrım ayrıca DB'ye persist
   * edilmiyor, çağıran taraf (PersonalizationService) map'te "anahtar var mı"
   * kontrolüyle türetiyor.
   */
  async getTopicAffinity(userId: string): Promise<Map<Topic, number>> {
    const rows = await this.db
      .select({
        topic: videosTable.topic,
        affinityScore: sql<number>`SUM(LEAST(GREATEST(${videoWatchEventsTable.watchedMs}::float / ${videosTable.durationMs}, 0), 1))`,
      })
      .from(videoWatchEventsTable)
      .innerJoin(videosTable, eq(videoWatchEventsTable.videoId, videosTable.id))
      .where(eq(videoWatchEventsTable.userId, userId))
      .groupBy(videosTable.topic);

    const affinityByTopic = new Map<Topic, number>();
    for (const row of rows) {
      affinityByTopic.set(topicSchema.parse(row.topic), Number(row.affinityScore));
    }
    return affinityByTopic;
  }

  /**
   * 2026-11-15 — "İzlenmeyenler önce" (bkz. personalization-ranking.ts `prioritizeUnwatched`): `since`'ten
   * bu yana en az bir exposure'ında `minWatchRatio` oranında izlenmiş video id'leri.
   *
   * MAX (SUM değil) bilinçli: soru "bu video bir kez gerçekten izlendi mi?" — 5 kez 1'er saniyelik kaydırma
   * (SUM'la 0.5'i geçebilirdi) "izlendi" sayılmamalı. Oran affinity ile AYNI şekilde 0..1'e clamp'leniyor
   * (loop artefaktı watchedMs > durationMs). Tek, toplu sorgu (GROUP BY video_id) — video başına sorgu yok;
   * mevcut `video_watch_events_user_id_idx` index'i kullanılır, yeni index/migration gerekmiyor.
   */
  async getRecentlyWatchedVideoIds(userId: string, since: Date, minWatchRatio: number): Promise<Set<string>> {
    const rows = await this.db
      .select({ videoId: videoWatchEventsTable.videoId })
      .from(videoWatchEventsTable)
      .innerJoin(videosTable, eq(videoWatchEventsTable.videoId, videosTable.id))
      .where(and(eq(videoWatchEventsTable.userId, userId), gte(videoWatchEventsTable.createdAt, since)))
      .groupBy(videoWatchEventsTable.videoId)
      .having(sql`MAX(LEAST(${videoWatchEventsTable.watchedMs}::float / ${videosTable.durationMs}, 1)) >= ${minWatchRatio}`);

    return new Set(rows.map((row) => row.videoId));
  }
}
