import { Inject, Injectable } from "@nestjs/common";
import { topicSchema, type Topic } from "@linguascroll/shared-types";
import { eq, sql } from "drizzle-orm";
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
}
