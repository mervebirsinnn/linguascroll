import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { VideosService } from "../videos/videos.service";
import { RevenueCatClient } from "./revenue-cat-client";

/**
 * Takvim günü (UTC) başına ücretsiz farklı video sayısı — hesabın ilk gününden
 * itibaren, her gün yenilenir. 2026-10-03 — "ilk gün tamamen ücretsiz" kuralı
 * kaldırıldı (kullanıcı kararı): ücretsiz katman günde 10 video, sınıra gelince
 * paywall'da 7 günlük deneme teklifi çıkar (deneme Play Console'da aboneliğin
 * teklifi olarak tanımlanır, backend'de ayrı mantık yok).
 */
const DAILY_FREE_VIDEO_CAP = 10;
/**
 * Bir video, bu süreden (ms) az izlenmişse ücretsiz hakkı YAKMAZ — kısa bir
 * scroll-geçişi (yanlışlıkla/hızlı kaydırma) bir "izleme" sayılmasın diye.
 * Video süresine göre yüzdelik bir eşik KASITLI OLARAK kullanılmıyor (gereksiz
 * karmaşıklık, bkz. plan) — sabit, basit bir saniye eşiği yeterli.
 */
const MIN_WATCH_MS_TO_COUNT = 3000;
/** "Abone" sonucunun önbelleklendiği süre — `PersonalizationService`'teki `COLD_START_CACHE_TTL_MS` ile AYNI değer/desen. */
const SUBSCRIBED_CACHE_TTL_MS = 5 * 60 * 1000;
/**
 * "Abone DEĞİL" sonucu ÇOK daha kısa önbelleklenir: kullanıcı paywall'da az önce satın aldıysa
 * (mobil feed'i hemen yeniliyor) 5 dakika boyunca hâlâ "abone değil" görünüp kilitli kalmamalı.
 * RevenueCat hatasında dönen fail-closed `false` de bu kısa süreyle önbelleğe girer — geçici bir
 * RevenueCat kesintisi kullanıcıyı uzun süre kilitlemez.
 */
const NOT_SUBSCRIBED_CACHE_TTL_MS = 15 * 1000;

type CacheEntry = { isSubscribed: boolean; expiresAt: number };

/**
 * 2026-10-01 — ücretsiz günlük video limiti + RevenueCat entitlement kontrolünün
 * TEK karar noktası. `FeedService` sadece `getPaywallGate(userId)`'i çağırır,
 * günlük-sayaç/entitlement mantığının HİÇBİRİNİ bilmez (aynı
 * "policy tek bir service'te yaşar" deseni — bkz. PersonalizationService'in
 * ranking'i FeedService'ten gizlemesi).
 *
 * Webhook YOK v1'de: RevenueCat'in entitlement durumu her `getPaywallGate`
 * çağrısında CANLI sorgulanır (bkz. RevenueCatClient), ama gereksiz yere her
 * feed isteğinde RevenueCat'e gitmemek için `PersonalizationService`'in
 * cold-start cache'iyle AYNI in-memory Map + TTL deseni kullanılıyor.
 */
@Injectable()
export class SubscriptionsService {
  private readonly subscriptionCache = new Map<string, CacheEntry>();

  private readonly gateEnabled: boolean;

  constructor(
    private readonly videosService: VideosService,
    private readonly revenueCatClient: RevenueCatClient,
    configService: ConfigService,
  ) {
    this.gateEnabled = configService.get<string>("SUBSCRIPTION_GATE_ENABLED") === "true";
  }

  async getPaywallGate(userId: string): Promise<{ gated: boolean }> {
    // 2026-10-03 — satın alma akışı (RevenueCat mobil SDK, Faz B) hazır olmadan
    // günlük limit canlıya çıkarsa kullanıcılar ücretsiz hakkı bitince çıkış
    // yolu olmayan bir ekranda kalır. Bu yüzden kapı VARSAYILAN KAPALI: backend
    // güvenle deploy edilebilir, Faz B bitince Render'da
    // SUBSCRIPTION_GATE_ENABLED=true ile açılır. Kapalıyken ne DB sayımı ne de
    // RevenueCat çağrısı yapılır.
    if (!this.gateEnabled) {
      return { gated: false };
    }

    if (await this.isSubscribed(userId)) {
      return { gated: false };
    }

    const startOfUtcDay = new Date();
    startOfUtcDay.setUTCHours(0, 0, 0, 0);
    const watchedToday = await this.videosService.countDistinctVideosWatchedByUserSince(userId, startOfUtcDay, MIN_WATCH_MS_TO_COUNT);

    return { gated: watchedToday >= DAILY_FREE_VIDEO_CAP };
  }

  private async isSubscribed(userId: string): Promise<boolean> {
    const cached = this.subscriptionCache.get(userId);
    const now = Date.now();
    if (cached && cached.expiresAt > now) {
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
