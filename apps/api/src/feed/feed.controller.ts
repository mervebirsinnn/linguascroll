import { Controller, Get, ParseUUIDPipe, Query } from "@nestjs/common";
import type { FeedPage } from "@linguascroll/shared-types";
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
  @Get()
  getFeed(
    @Query("userId", new ParseUUIDPipe()) userId: string,
    @Query("cursor") cursor?: string,
  ): Promise<FeedPage> {
    return this.feedService.getFeed(userId, cursor);
  }
}
