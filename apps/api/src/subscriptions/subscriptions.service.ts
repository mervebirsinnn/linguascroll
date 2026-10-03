import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { UsersService } from "../users/users.service";
import { VideosService } from "../videos/videos.service";
import { RevenueCatClient } from "./revenue-cat-client";

/** Hesap açıldıktan sonraki ilk 24 saat tamamen ücretsiz (alışkanlık oluşsun diye) — kullanıcı kararı. */
const FIRST_DAY_FREE_MS = 24 * 60 * 60 * 1000;
/** 2. günden itibaren, takvim günü (UTC) başına ücretsiz farklı video sayısı. */
const DAILY_FREE_VIDEO_CAP = 10;
/**
 * Bir video, bu süreden (ms) az izlenmişse ücretsiz hakkı YAKMAZ — kısa bir
 * scroll-geçişi (yanlışlıkla/hızlı kaydırma) bir "izleme" sayılmasın diye.
 * Video süresine göre yüzdelik bir eşik KASITLI OLARAK kullanılmıyor (gereksiz
 * karmaşıklık, bkz. plan) — sabit, basit bir saniye eşiği yeterli.
 */
const MIN_WATCH_MS_TO_COUNT = 3000;
/** RevenueCat entitlement kontrolünün önbelleklendiği süre — `PersonalizationService`'teki `COLD_START_CACHE_TTL_MS` (personalization.service.ts) ile AYNI değer/desen. */
const SUBSCRIPTION_CACHE_TTL_MS = 5 * 60 * 1000;

type CacheEntry = { isSubscribed: boolean; expiresAt: number };

/**
 * 2026-10-01 — ücretsiz günlük video limiti + RevenueCat entitlement kontrolünün
 * TEK karar noktası. `FeedService` sadece `getPaywallGate(userId)`'i çağırır,
 * gün-1-ücretsiz/günlük-sayaç/entitlement mantığının HİÇBİRİNİ bilmez (aynı
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
    private readonly usersService: UsersService,
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

    const createdAt = await this.usersService.getCreatedAt(userId);
    // `createdAt` yoksa (var olmayan userId) FeedService zaten `userExists`'i
    // bu noktadan ÖNCE kontrol etmiş oluyor — buraya teorik olarak hiç
    // girilmemeli, yine de fail-safe: gate uygulanmaz (FeedService'in kendi
    // 400'ü zaten devreye girecek).
    if (!createdAt) {
      return { gated: false };
    }

    if (Date.now() - createdAt.getTime() < FIRST_DAY_FREE_MS) {
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
    this.subscriptionCache.set(userId, { isSubscribed, expiresAt: now + SUBSCRIPTION_CACHE_TTL_MS });
    return isSubscribed;
  }
}
