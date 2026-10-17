import { z } from "zod";

/**
 * Feed session shuffle seed'i: mobile'ın JS process'i başına BİR kez ürettiği 128-bit değer, 32 küçük harf
 * hex karakter. Tam uzunluk + sabit alfabe wire sınırında (query ve cursor payload'ı) abuse yüzeyini kapatır:
 * `.length(32)` regex'ten ÖNCE çalıştığı için uzun bir girdi regex'e hiç ulaşmaz.
 */
export const sessionSeedSchema = z
  .string()
  .length(32)
  .regex(/^[0-9a-f]+$/);
export type SessionSeed = z.infer<typeof sessionSeedSchema>;
