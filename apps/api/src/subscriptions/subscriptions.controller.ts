import { Controller, Get, HttpCode, Param, ParseUUIDPipe, Post, Query, UseGuards } from "@nestjs/common";
import type { PlaybackAccessResponse, SubscriptionStatus, SubscriptionOverview } from "@linguascroll/shared-types";
import { resolveFeedScope } from "../feed/feed-scope";
import { AuthUserId, FirebaseAuthGuard } from "../auth/firebase-auth.guard";
import { SubscriptionsService } from "./subscriptions.service";

/**
 * 2026-10-27 — sadece HTTP. Kimlik SADECE doğrulanmış Firebase token'ından (`@AuthUserId()`);
 * iki endpoint de gövdesiz — istemcinin gönderdiği hiçbir userId yetki kaynağı değil.
 *
 * `POST /videos/:videoId/playback-access` neden VideosController'da değil: karar
 * (abonelik + ücretsiz hak) SubscriptionsService'te ve SubscriptionsModule zaten
 * VideosModule'e bağımlı — endpoint'i VideosController'a koymak döngüsel modül
 * bağımlılığı (Videos → Subscriptions → Videos) yaratırdı. Path, kaynağın (video)
 * REST yapısını koruyor; sadece handler'ın yaşadığı modül farklı.
 *
 * İkisi de 200 (@HttpCode): yeni bir REST kaynağı yaratmıyorlar, bir yetki/durum sorusuna
 * cevap veriyorlar (Nest'in POST varsayılanı 201 burada yanıltıcı olurdu).
 */
@Controller()
@UseGuards(FirebaseAuthGuard)
export class SubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  @Post("videos/:videoId/playback-access")
  @HttpCode(200)
  requestPlaybackAccess(@Param("videoId", new ParseUUIDPipe()) videoId: string, @AuthUserId() userId: string, @Query("scope") scope?: string): Promise<PlaybackAccessResponse> {
    return this.subscriptionsService.requestPlaybackAccess(userId, videoId, resolveFeedScope(scope, undefined));
  }

  @Get("subscriptions/status")
  getStatus(@AuthUserId() userId: string): Promise<SubscriptionOverview> {
    return this.subscriptionsService.getOverview(userId);
  }

  @Post("subscriptions/refresh")
  @HttpCode(200)
  refreshSubscription(@AuthUserId() userId: string): Promise<SubscriptionStatus> {
    return this.subscriptionsService.refreshSubscription(userId);
  }
}
