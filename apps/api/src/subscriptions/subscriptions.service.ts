import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { PlaybackAccessResponse, SubscriptionStatus } from "@linguascroll/shared-types";
import { UsersService } from "../users/users.service";
import { VideosService } from "../videos/videos.service";
import { FreeVideoGrantsRepository } from "./free-video-grants-repository";
import { RevenueCatClient } from "./revenue-cat-client";

/**
 * 2026-10-27 — hesap başına TOPLAM ücretsiz farklı video sayısı. Günlük YENİLENMEZ
 * (önceki "günde 10" kuralının yerini aldı, kullanıcı kararı). Ücretsiz deneme yok:
 * 10 video ürünün denemesi. 11. farklı video aktif abonelik ister.
 */
export const FREE_VIDEO_CAP = 10;
/** "Abone" sonucunun önbelleklendiği süre — `PersonalizationService`'teki `COLD_START_CACHE_TTL_MS` ile AYNI değer/desen. */
const SUBSCRIBED_CACHE_TTL_MS = 5 * 60 * 1000;
/**
 * "Abone DEĞİL" sonucu ÇOK daha kısa önbelleklenir. RevenueCat hatasında dönen fail-closed
 * `false` de bu kısa süreyle önbelleğe girer — geçici bir kesinti kullanıcıyı uzun süre
 * kilitlemez. Satın alma sonrası bu süre BEKLENMİYOR: mobile `POST /subscriptions/refresh`
 * ile önbelleği atlatıp yeniden doğrulatıyor (bkz. refreshSubscription).
 */
const NOT_SUBSCRIBED_CACHE_TTL_MS = 15 * 1000;

type CacheEntry = { isSubscribed: boolean; expiresAt: number };

/**
 * Feed'in sayfa kesme hesabı (kullanıcı deneyimi için — kesin yetki playback-access'te).
 * `newVideoBudget`: bu sayfada gösterilebilecek, henüz açılmamış video sayısı.
 */
export type FeedAllowance = { unlimited: true } | { unlimited: false; grantedVideoIds: ReadonlySet<string>; newVideoBudget: number };

/**
 * Ücretsiz hak + RevenueCat entitlement'ın TEK karar noktası ("policy tek bir service'te
 * yaşar" deseni — FeedService ne sayacı ne entitlement'ı bilir, sadece `getFeedAllowance`'ın
 * sonucunu uygular).
 *
 * Yetkinin ASIL kontrolü feed'de DEĞİL, oynatma erişiminde (`requestPlaybackAccess`):
 * feed'in kesmesi prefetch, kategori değiştirme, eski cursor gibi yollarla aşılabilir;
 * hak orada, kullanıcı satırı kilitlenerek atomik olarak tüketiliyor (bkz.
 * FreeVideoGrantsRepository.tryGrant). Medya URL'leri kısa ömürlü imza taşıdığı için
 * (VideosService) erişimi olmayan bir videonun kalıcı URL'i de yok.
 *
 * Webhook YOK: entitlement RevenueCat REST'ten sorgulanıyor; her istekte gitmemek için
 * in-memory Map + TTL (PersonalizationService cold-start cache'iyle aynı desen). Tek
 * Render instance'ı varsayımı — çoklu instance'ta önbellek instance başına olur, bu
 * yalnızca refresh sonrası en fazla bir TTL'lik tutarsızlık demek (fail-closed yönde).
 */
@Injectable()
export class SubscriptionsService {
  private readonly subscriptionCache = new Map<string, CacheEntry>();

  private readonly gateEnabled: boolean;

  constructor(
    private readonly videosService: VideosService,
    private readonly usersService: UsersService,
    private readonly freeVideoGrantsRepository: FreeVideoGrantsRepository,
    private readonly revenueCatClient: RevenueCatClient,
    configService: ConfigService,
  ) {
    // Kapı kapalıyken kimse kilitlenmez ve deftere yazılmaz (gerçek ürünler hazır olmadan
    // canlı kullanıcıları kilitlememek için). Açıkken RevenueCat secret'ı + medya imza
    // secret'ı boot'ta zorunlu (app.module.ts envSchema) — eksik yapılandırma sessizce
    // sınırsız erişim açamaz.
    this.gateEnabled = configService.get<string>("SUBSCRIPTION_GATE_ENABLED") === "true";
  }

  /**
   * Bütçe = 10 − KALICI olarak tüketilmiş hak (sadece başarılı playback-access'ler). Önceki
   * sayfalarda gösterilip açılmamış videolar bilinçli olarak DÜŞÜLMÜYOR: prefetch edilen ya da
   * yarıda bırakılan bir sayfa kullanıcıyı erken paywall'a kilitlememeli. Bedeli: bir sonraki
   * sayfa, önceki sayfanın açılmamış videolarıyla birlikte kalan haktan fazla yeni video
   * gösterebilir — fazlası playback-access'te `paywall` alır (mobile videonun yerinde paywall
   * gösterir). Sınır yine aşılamaz; kesin kontrol orada.
   */
  async getFeedAllowance(userId: string, pageVideoIds: readonly string[]): Promise<FeedAllowance> {
    if (!this.gateEnabled || (await this.isSubscribed(userId))) {
      return { unlimited: true };
    }

    const { consumed, grantedVideoIds } = await this.freeVideoGrantsRepository.getUsage(userId, pageVideoIds);
    return { unlimited: false, grantedVideoIds, newVideoBudget: Math.max(0, FREE_VIDEO_CAP - consumed) };
  }

  /**
   * Oynatma erişimi: video yoksa 404, kullanıcı yoksa 400 (path kaynağı → 404, body
   * referansı → 400; VideosService.recordWatchEvent ile aynı kural). Abone değilse
   * ücretsiz hak burada atomik olarak tüketilir; aynı video tekrar hak tüketmez.
   */
  async requestPlaybackAccess(userId: string, videoId: string): Promise<PlaybackAccessResponse> {
    const video = await this.videosService.getPlayableVideoById(videoId);
    if (!video) {
      throw new NotFoundException(`Video bulunamadı: "${videoId}"`);
    }
    await this.assertUserExists(userId);

    if (!this.gateEnabled || (await this.isSubscribed(userId))) {
      return { status: "granted", playbackUrl: video.playbackUrl };
    }

    const result = await this.freeVideoGrantsRepository.tryGrant(userId, videoId, FREE_VIDEO_CAP);
    if (result === "unknown-user") {
      // assertUserExists'ten sonra silinmiş (yarış) — aynı 400.
      throw new BadRequestException(`"${userId}", var olan bir kullanıcıya ait değil`);
    }
    return result === "exhausted" ? { status: "paywall" } : { status: "granted", playbackUrl: video.playbackUrl };
  }

  /**
   * Satın alma/geri yükleme sonrası mobile çağırır: önbellek ATLANIR, RevenueCat yeniden
   * sorgulanır ve sonuç önbelleğe yazılır — sonraki feed/erişim istekleri doğrulanmış
   * durumu hemen görür. Mobildeki "purchased" sonucu tek başına yetki sayılmaz.
   */
  async refreshSubscription(userId: string): Promise<SubscriptionStatus> {
    await this.assertUserExists(userId);
    return { active: await this.isSubscribed(userId, { forceRefresh: true }) };
  }

  private async assertUserExists(userId: string): Promise<void> {
    if (!(await this.usersService.userExists(userId))) {
      throw new BadRequestException(`"${userId}", var olan bir kullanıcıya ait değil`);
    }
  }

  private async isSubscribed(userId: string, options: { forceRefresh?: boolean } = {}): Promise<boolean> {
    const now = Date.now();
    const cached = this.subscriptionCache.get(userId);
    if (!options.forceRefresh && cached && cached.expiresAt > now) {
      return cached.isSubscribed;
    }

    const isSubscribed = await this.revenueCatClient.checkEntitlement(userId);
    this.subscriptionCache.set(userId, {
      isSubscribed,
      expiresAt: now + (isSubscribed ? SUBSCRIBED_CACHE_TTL_MS : NOT_SUBSCRIBED_CACHE_TTL_MS),
    });
    return isSubscribed;
  }
}
