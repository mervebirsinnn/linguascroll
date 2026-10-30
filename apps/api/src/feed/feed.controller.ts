import { BadRequestException, Controller, Get, Query, UseGuards } from "@nestjs/common";
import type { FeedPage } from "@linguascroll/shared-types";
import { AuthUserId, FirebaseAuthGuard } from "../auth/firebase-auth.guard";
import { resolveFeedScope } from "./feed-scope";
import { parseSessionSeedQuery } from "./feed-session-seed";
import { parseFeedPreferenceQuery } from "./feed-preference-query";
import { FeedService } from "./feed.service";

@Controller("feed")
@UseGuards(FirebaseAuthGuard)
export class FeedController {
  constructor(private readonly feedService: FeedService) {}

  // 2026-10-27 — kimlik SADECE doğrulanmış Firebase token'ından (`@AuthUserId()`); eski
  // `userId` query param'ı KALDIRILDI (istemcinin gönderdiği bir UUID yetki kaynağı olamaz).
  //
  // Chunk 8: `cursor` opsiyonel, ham (validasyonsuz) bir string olarak geçiyor —
  // onun tek anlamlı "şekli" imza+Zod ile FeedService'in çağırdığı feed-cursor.ts
  // decode'unda doğrulanıyor; burada ayrı bir ön-kontrol (UUID gibi basit bir
  // format kontrolü) YOK çünkü cursor'ın böyle basit bir şekli yok — duplicate
  // validation'dan kaçınıyoruz.
  //
  // Chunk 15: `level`/`topics` da AYNI şekilde ham string — burada bir Pipe/400 YOK, `parseFeedPreferenceQuery` malformed
  // değerleri sessizce yok sayıyor (bkz. o dosyanın yorumu).
  @Get()
  getFeed(
    @AuthUserId() userId: string,
    @Query("cursor") cursor?: string,
    @Query("level") level?: string,
    @Query("topics") topics?: string,
    @Query("scope") scope?: string,
    /** @deprecated Yalnızca yayındaki eski mobile build'ler için (bkz. resolveFeedScope); yeni client `scope` gönderir. */
    @Query("category") legacyCategory?: string,
    // Session-scoped shuffle seed'i: cursor'suz istekte zorunlu (FeedService), cursor'lu istekte imzalı
    // cursor'daki değerle aynı olmalı. `unknown`: tekrarlı param (dizi) da Zod'da 400'e düşsün.
    @Query("sessionSeed") sessionSeed?: unknown,
    @Query("continuous") continuous?: unknown,
  ): Promise<FeedPage> {
    if (continuous !== undefined && continuous !== "true" && continuous !== "false") throw new BadRequestException("Geçersiz continuous değeri");
    return this.feedService.getFeed(
      userId,
      cursor,
      parseFeedPreferenceQuery(level, topics),
      resolveFeedScope(scope, legacyCategory),
      parseSessionSeedQuery(sessionSeed),
      continuous === "true",
    );
  }
}
