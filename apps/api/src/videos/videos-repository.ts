import { Inject, Injectable } from "@nestjs/common";
import { videoSchema, type Video } from "@linguascroll/shared-types";
import { eq, inArray } from "drizzle-orm";
import { DRIZZLE_DB, type Database } from "../database/database.module";
import { videosTable } from "./videos.schema";

type VideoRow = typeof videosTable.$inferSelect;

/**
 * Persistence katmanı: sadece DB row → domain Video projeksiyonunu bilir.
 * PlayableVideo'yu, HTTP'yi, controller'ı BİLMEZ — bunlar VideosService'in işi.
 */
@Injectable()
export class VideosRepository {
  constructor(@Inject(DRIZZLE_DB) private readonly db: Database) {}

  async findVideos(): Promise<Video[]> {
    const rows = await this.db.select().from(videosTable);
    return rows.map(toVideo);
  }

  /**
   * watch-event kaydından önce videoId'nin gerçekten var olduğunu doğrulamak için
   * — böylece var olmayan bir videoId, ham bir Postgres FK violation'ı olarak
   * 500'e değil, VideosService'te kontrollü bir 404'e dönüşür.
   */
  async findVideoById(videoId: string): Promise<Video | null> {
    const [row] = await this.db.select().from(videosTable).where(eq(videosTable.id, videoId));
    return row ? toVideo(row) : null;
  }

  /**
   * Chunk 8 — frozen feed-plan pagination'ın bir sayfasındaki video ref'lerini
   * TEK bir `WHERE id IN (...)` sorgusuyla çözer (N+1 önlemi: id başına ayrı bir
   * `findVideoById` çağrısı YOK). Sonuç sırası `videoIds`'in sırasıyla AYNI OLMAK
   * ZORUNDA DEĞİL — çağıran taraf (FeedService) kendi frozen sırasına göre
   * yeniden diziyor. Artık var olmayan (silinmiş) bir id, sonuçta sessizce
   * eksik kalır — bu, "unavailable slot'u atla" davranışının veri katmanındaki
   * doğal karşılığı.
   */
  async findVideosByIds(videoIds: string[]): Promise<Video[]> {
    if (videoIds.length === 0) {
      return [];
    }
    const rows = await this.db.select().from(videosTable).where(inArray(videosTable.id, videoIds));
    return rows.map(toVideo);
  }
}

/**
 * DB row → Video: açık, elle yazılmış bir projeksiyon. `as` ile unchecked cast
 * YAPILMIYOR — videoSchema.parse() hem doğruluyor hem de string'i cefrLevel'ın
 * literal union tipine güvenli şekilde daraltıyor. createdAt bilinçli olarak
 * destructure ile dışarıda bırakılıyor: domain Video contract'ının parçası değil
 * (chunk 1 kararı), bu satır o kararı görünür kılıyor.
 */
function toVideo(row: VideoRow): Video {
  const { createdAt, ...rest } = row;
  return videoSchema.parse(rest);
}
