import { randomBytes } from "node:crypto";
import { BadRequestException } from "@nestjs/common";
import { sessionSeedSchema } from "@linguascroll/shared-types";

/**
 * `GET /feed`'in HTTP sınırı: `sessionSeed` query param'ını doğrular (HTTP concern, service'e girmez).
 * Yoksa `undefined` (seed'siz cursor'suz istek geçerlidir: FeedService sunucu seed'i üretir; bkz. generateServerSessionSeed).
 * VARSA ve tam 32 küçük-harf hex değilse (boş string ve tekrarlı param/dizi dahil) kontrollü 400.
 */
export function parseSessionSeedQuery(raw: unknown): string | undefined {
  if (raw === undefined) return undefined;
  const parsed = sessionSeedSchema.safeParse(raw);
  if (!parsed.success) throw new BadRequestException("Geçersiz sessionSeed (32 karakterlik küçük harf hex bekleniyor)");
  return parsed.data;
}

/**
 * Seed göndermeyen (eski mobile build) cursor'suz istekler için sunucu seed'i: 128-bit, `sessionSeedSchema` biçiminde.
 * Üretilen seed v3 imzalı cursor'a yazılır, böylece pagination aynı frozen plan üzerinde sürer. Bu istekler için
 * "retry aynı sırayı verir" GARANTİSİ YOKTUR: her seed'siz cursor'suz istek yeni bir seed alır (client seed
 * gönderirse retry deterministiktir).
 */
export function generateServerSessionSeed(): string {
  return randomBytes(16).toString("hex");
}
