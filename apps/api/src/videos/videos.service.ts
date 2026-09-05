import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { playableVideoSchema, type PlayableVideo, type Video } from "@linguascroll/shared-types";
import { UsersService } from "../users/users.service";
import { resolvePlaybackUrl } from "./resolve-playback-url";
import { VideoWatchEventsRepository } from "./video-watch-events-repository";
import { VideosRepository } from "./videos-repository";

/**
 * SQL/Drizzle bilmiyor — sadece VideosRepository'nin döndürdüğü Video[]'u alır.
 * Use-case ismi ("getVideoFeed") bilinçli olarak repository'nin persistence-seviyesi
 * ismiyle ("findVideos") aynı değil — iki katman farklı jargon kullanıyor.
 */
@Injectable()
export class VideosService {
  constructor(
    private readonly videosRepository: VideosRepository,
    private readonly videoWatchEventsRepository: VideoWatchEventsRepository,
    private readonly usersService: UsersService,
  ) {}

  async getVideoFeed(): Promise<PlayableVideo[]> {
    const videos = await this.videosRepository.findVideos();
    return videos.map(toPlayableVideo);
  }

  /**
   * Chunk 8 — frozen feed-plan pagination'ın bir sayfasını resolve ederken
   * kullanılır. `playbackUrl` burada, çağrı anında TAZE üretilir — asla cursor'da
   * donmuş halde taşınmaz (Mux signed URL'lerin TTL'i olacağı varsayımıyla).
   */
  async getPlayableVideosByIds(videoIds: string[]): Promise<PlayableVideo[]> {
    const videos = await this.videosRepository.findVideosByIds(videoIds);
    return videos.map(toPlayableVideo);
  }

  /**
   * videoId (path — kaynağın kendisi) bulunamazsa 404; userId (body — referans
   * verilen bir başka kaynak) bulunamazsa 400. Bu ayrım, QuizzesService'teki
   * "quiz yok → 404, optionId başka quiz'e ait → 400" ayrımıyla aynı kural:
   * path'teki kaynak eksikse 404, body'de referans verilen bir kaynak geçersizse
   * 400. Ham bir Postgres FK violation'ının 500 olarak sızmasını bu iki explicit
   * varlık kontrolü engelliyor — ayrı bir DB-exception-çevirme katmanı yok.
   */
  async recordWatchEvent(videoId: string, userId: string, watchedMs: number): Promise<void> {
    const video = await this.videosRepository.findVideoById(videoId);
    if (!video) {
      throw new NotFoundException(`Video bulunamadı: "${videoId}"`);
    }

    const userExists = await this.usersService.userExists(userId);
    if (!userExists) {
      throw new BadRequestException(`"${userId}", var olan bir kullanıcıya ait değil`);
    }

    await this.videoWatchEventsRepository.record({ userId, videoId, watchedMs });
  }
}

/**
 * Video → PlayableVideo dönüşümü de, repository'nin DB row → Video dönüşümü gibi,
 * doğrudan obje inşa edip "tipler zaten uyuyor" diye güvenmek yerine
 * playableVideoSchema.parse() ile runtime'da doğrulanıyor. Bu, örneğin
 * resolvePlaybackUrl'ün üretebileceği geçersiz bir URL'yi response client'a
 * gitmeden önce yakalar.
 *
 * VideosService kelime kavramından BİLİNÇLİ OLARAK habersiz (bkz. playable-video.ts/
 * feed-playable-video.ts'teki sınır yorumu) — bu yüzden burada `vocabulary` alanı
 * hiç YOK (ne gerçek ne sahte bir placeholder). Gerçek vocabulary/saved-state
 * enrichment'ı sadece FeedService'in ürettiği `FeedPlayableVideo`'da var.
 */
function toPlayableVideo(video: Video): PlayableVideo {
  const { muxAssetId, ...rest } = video;
  return playableVideoSchema.parse({ ...rest, playbackUrl: resolvePlaybackUrl(muxAssetId) });
}
