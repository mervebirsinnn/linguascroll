import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { playableVideoSchema, type PlayableVideo, type TranscriptSegment, type Video } from "@linguascroll/shared-types";
import { UsersService } from "../users/users.service";
import { resolvePlaybackUrl, resolveR2PlaybackUrl } from "./resolve-playback-url";
import { TranscriptSegmentsRepository } from "./transcript-segments-repository";
import { VideoWatchEventsRepository } from "./video-watch-events-repository";
import { VideosRepository } from "./videos-repository";

/**
 * SQL/Drizzle bilmiyor — sadece VideosRepository'nin döndürdüğü Video[]'u alır.
 * Use-case ismi ("getVideoFeed") bilinçli olarak repository'nin persistence-seviyesi
 * ismiyle ("findVideos") aynı değil — iki katman farklı jargon kullanıyor.
 */
@Injectable()
export class VideosService {
  private readonly mediaBaseUrl: string;
  // Chunk 17D — `getOrThrow` DEĞİL: R2 boot-time zorunluluk taşımıyor (bkz.
  // app.module.ts envSchema'daki R2_PUBLIC_BASE_URL.optional() gerekçesi, R2StorageService
  // ile AYNI). Mevcut 16 video storageKey=null olduğu için bu değere hiç ihtiyaç
  // duymadan boot olabilmeli — sadece storageKey dolu bir video GERÇEKTEN resolve
  // edilmeye çalışıldığında (requireR2PublicBaseUrl) eksikse net bir hata verir.
  private readonly r2PublicBaseUrl: string | undefined;

  constructor(
    private readonly videosRepository: VideosRepository,
    private readonly videoWatchEventsRepository: VideoWatchEventsRepository,
    private readonly transcriptSegmentsRepository: TranscriptSegmentsRepository,
    private readonly usersService: UsersService,
    configService: ConfigService,
  ) {
    this.mediaBaseUrl = configService.getOrThrow<string>("PUBLIC_MEDIA_BASE_URL");
    this.r2PublicBaseUrl = configService.get<string>("R2_PUBLIC_BASE_URL");
  }

  async getVideoFeed(): Promise<PlayableVideo[]> {
    const videos = await this.videosRepository.findVideos();
    return videos.map((video) => toPlayableVideo(video, this.mediaBaseUrl, this.r2PublicBaseUrl));
  }

  /**
   * Chunk 8 — frozen feed-plan pagination'ın bir sayfasını resolve ederken
   * kullanılır. `playbackUrl` burada, çağrı anında TAZE üretilir — asla cursor'da
   * donmuş halde taşınmaz (Mux signed URL'lerin TTL'i olacağı varsayımıyla).
   */
  async getPlayableVideosByIds(videoIds: string[]): Promise<PlayableVideo[]> {
    const videos = await this.videosRepository.findVideosByIds(videoIds);
    return videos.map((video) => toPlayableVideo(video, this.mediaBaseUrl, this.r2PublicBaseUrl));
  }

  /**
   * Chunk 10 — FeedService'in resolvePlanRefs'teki batch enrichment adımlarından
   * biri (vocabulary/quiz-grouping ile aynı Promise.all içinde). VideosService
   * "transcript" kavramını burada TEK bir metodla, doğrudan
   * TranscriptSegmentsRepository'ye delege ederek biliyor — ayrı bir
   * TranscriptSegmentsService YOK (bkz. transcript-segments-repository.ts yorumu).
   */
  async getSegmentsForVideos(videoIds: string[]): Promise<Map<string, TranscriptSegment[]>> {
    return this.transcriptSegmentsRepository.findSegmentsForVideos(videoIds);
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
 *
 * Chunk 17D — playbackUrl çözümü koşullu: storageKey != null → R2/Worker URL'i
 * (resolveR2PlaybackUrl), storageKey == null → mevcut muxAssetId/local davranışı
 * (resolvePlaybackUrl, DEĞİŞMEDİ). `muxAssetId` İLE `storageKey` İKİSİ DE burada
 * açıkça destructure edilip `rest`'ten çıkarılıyor — storageKey de muxAssetId gibi
 * bir infra referansı, client'a hiç sızmamalı (playableVideoSchema zaten `.omit()`
 * ediyor, bkz. shared-types/playable-video.ts — burada örtük strip'e güvenmek
 * yerine AYNI açık/deliberate desen korunuyor).
 */
function toPlayableVideo(video: Video, mediaBaseUrl: string, r2PublicBaseUrl: string | undefined): PlayableVideo {
  const { muxAssetId, storageKey, ...rest } = video;
  const playbackUrl = storageKey != null ? resolveR2PlaybackUrl(storageKey, requireR2PublicBaseUrl(r2PublicBaseUrl)) : resolvePlaybackUrl(muxAssetId, mediaBaseUrl);
  return playableVideoSchema.parse({ ...rest, playbackUrl });
}

function requireR2PublicBaseUrl(value: string | undefined): string {
  if (!value) {
    throw new Error("R2_PUBLIC_BASE_URL tanımlı değil ama storageKey dolu bir video (R2-backed) playback URL'i çözülmeye çalışıldı.");
  }
  return value;
}
