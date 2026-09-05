import { z } from "zod";
import { feedItemSchema } from "./feed-item";

/**
 * GET /feed'in paginated response contract'ı (Chunk 8). `nextCursor`, client'ın
 * asla içini açmaması/parse etmemesi gereken opaque bir string — server-internal
 * frozen feed-plan referansını + imzasını taşır (bkz. apps/api/src/feed/feed-cursor.ts,
 * mobile'da sadece bir sonraki GET /feed çağrısına aynen geri geçiriliyor).
 *
 * `null` → bu feed session'ının sonuna gelindi. Mobile bunu görünce OTOMATİK
 * olarak cursor'sız yeni bir session BAŞLATMAMALI (Chunk 8 bilinçli kararı):
 * ranking deterministic olduğu için hemen ardından başlayan bir session,
 * affinity neredeyse hiç değişmediği için çarpıcı derecede benzer/aynı içeriği
 * yeniden üretebilir. Yeni session sadece explicit bir kullanıcı eylemiyle
 * (pull-to-refresh / "daha fazla içerik" action) başlamalı.
 */
export const feedPageSchema = z.object({
  items: z.array(feedItemSchema),
  nextCursor: z.string().nullable(),
});

export type FeedPage = z.infer<typeof feedPageSchema>;
