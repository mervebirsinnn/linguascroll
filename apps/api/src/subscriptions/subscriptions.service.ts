import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { PlaybackAccessResponse, SubscriptionStatus, SubscriptionOverview, FeedScope } from "@linguascroll/shared-types";
import { scopeToCategoryFilter } from "../feed/feed-scope";
import { UsersService } from "../users/users.service";
import { VideosService } from "../videos/videos.service";
import { FreeVideoGrantsRepository } from "./free-video-grants-repository";
import { RevenueCatClient } from "./revenue-cat-client";

/** Her hesap ve akış için 10 kalıcı ücretsiz video. İzleme sayısı erişimi azaltmaz. */
export const FREE_VIDEO_CAP = 10;
/** "Abone" sonucunun önbelleklendiği süre — `PersonalizationService`'teki `COLD_START_CACHE_TTL_MS` ile AYNI değer/desen. */
const SUBSCRIBED_CACHE_TTL_MS = 60 * 1000;
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

  /** Seçki akış başına atomik olarak sabitlenir. Eski izleme/hak defteri sayılmaz.
   * Dönen id'ler, tekrar izlenebilen tüm ücretsiz videolardır; yeni video bütçesi yoktur. */
  async getFeedAllowance(userId: string, _pageVideoIds: readonly string[], scope: FeedScope = "all"): Promise<FeedAllowance> {
    if (!this.gateEnabled || (await this.isSubscribed(userId))) {
      return { unlimited: true };
    }

    const catalog = await this.videosService.getVideoFeed({ category: scopeToCategoryFilter(scope) });
    const selected = await this.freeVideoGrantsRepository.getOrCreatePreview(userId, scope, catalog.map((v) => v.id).sort(), FREE_VIDEO_CAP);
    return { unlimited: false, grantedVideoIds: selected, newVideoBudget: 0 };
  }

  /** İmzalı URL yalnızca seçkideki video veya doğrulanmış abonelik için verilir.
   * scope istemciden gelse bile kategorisi backend'de doğrulanır. */
  async requestPlaybackAccess(userId: string, videoId: string, scope: FeedScope = "all"): Promise<PlaybackAccessResponse> {
    const video = await this.videosService.getPlayableVideoById(videoId);
    if (!video) {
      throw new NotFoundException(`Video bulunamadı: "${videoId}"`);
    }
    await this.assertUserExists(userId);

    if (!this.gateEnabled || (await this.isSubscribed(userId))) {
      return { status: "granted", playbackUrl: video.playbackUrl };
    }

    if (scope !== "all" && video.category !== scope) throw new BadRequestException("Video bu akışa ait değil");
    const allowance = await this.getFeedAllowance(userId, [videoId], scope);
    return allowance.unlimited || allowance.grantedVideoIds.has(videoId)
      ? { status: "granted", playbackUrl: video.playbackUrl }
      : { status: "paywall" };
  }

  /**
   * Satın alma/geri yükleme sonrası mobile çağırır: önbellek ATLANIR, RevenueCat yeniden
   * sorgulanır ve sonuç önbelleğe yazılır — sonraki feed/erişim istekleri doğrulanmış
   * durumu hemen görür. Mobildeki "purchased" sonucu tek başına yetki sayılmaz.
   */
  async refreshSubscription(userId: string): Promise<SubscriptionStatus> {
    await this.assertUserExists(userId);
    const subscription = await this.revenueCatClient.readSubscription(userId);
    this.cacheSubscription(userId, subscription.active, subscription.expiresAt);
    return { active: subscription.active };
  }

  async getOverview(userId: string): Promise<SubscriptionOverview> {
    await this.assertUserExists(userId);
    const base = { gateEnabled: this.gateEnabled, freeVideoLimit: FREE_VIDEO_CAP, consumedFreeVideos: 0, remainingFreeVideos: FREE_VIDEO_CAP };
    try {
      const subscription = await this.revenueCatClient.readSubscription(userId);
      this.cacheSubscription(userId, subscription.active, subscription.expiresAt);
      return { ...base, verification: "verified", subscription };
    } catch {
      return { ...base, verification: "unavailable", subscription: null };
    }
  }

  private cacheSubscription(userId: string, active: boolean, expiresAt: string | null = null): void {
    const now = Date.now();
    // Uzun yaşayan sunucuda kullanıcı başına Map sınırsız büyümez.
    if (this.subscriptionCache.size >= 5000) {
      for (const [id, entry] of this.subscriptionCache) if (entry.expiresAt <= now) this.subscriptionCache.delete(id);
      if (this.subscriptionCache.size >= 5000) this.subscriptionCache.delete(this.subscriptionCache.keys().next().value!);
    }
    const ttl = active ? SUBSCRIBED_CACHE_TTL_MS : NOT_SUBSCRIBED_CACHE_TTL_MS;
    this.subscriptionCache.set(userId, { isSubscribed: active, expiresAt: Math.min(now + ttl, active && expiresAt ? Date.parse(expiresAt) : Infinity) });
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
    this.cacheSubscription(userId, isSubscribed);
    return isSubscribed;
  }
}
