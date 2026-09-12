import { Controller, Get, ParseUUIDPipe, Query } from "@nestjs/common";
import type { FeedPage } from "@linguascroll/shared-types";
import { parseFeedPreferenceQuery } from "./feed-preference-query";
import { FeedService } from "./feed.service";

@Controller("feed")
export class FeedController {
  constructor(private readonly feedService: FeedService) {}

  // userId query param'ı external input — ParseUUIDPipe eksik/malformed UUID'yi
  // service'e hiç ulaşmadan 400 ile reddeder (query param hiç yoksa da aynı
  // pipe malformed sayıp 400 döner). "Gerçekten var olan bir user mı" kontrolü
  // burada değil, FeedService'te (persistence'a bakması gerektiği için).
  //
  // Chunk 8: `cursor` opsiyonel, ham (validasyonsuz) bir string olarak geçiyor —
  // onun tek anlamlı "şekli" imza+Zod ile FeedService'in çağırdığı feed-cursor.ts
  // decode'unda doğrulanıyor; burada ayrı bir ön-kontrol (UUID gibi basit bir
  // format kontrolü) YOK çünkü cursor'ın böyle basit bir şekli yok — duplicate
  // validation'dan kaçınıyoruz.
  //
  // Chunk 15: `level`/`topics` da AYNI şekilde ham string — `userId`'nin
  // AKSİNE burada bir Pipe/400 YOK, `parseFeedPreferenceQuery` malformed
  // değerleri sessizce yok sayıyor (bkz. o dosyanın yorumu).
  @Get()
  getFeed(
    @Query("userId", new ParseUUIDPipe()) userId: string,
    @Query("cursor") cursor?: string,
    @Query("level") level?: string,
    @Query("topics") topics?: string,
  ): Promise<FeedPage> {
    return this.feedService.getFeed(userId, cursor, parseFeedPreferenceQuery(level, topics));
  }
}
