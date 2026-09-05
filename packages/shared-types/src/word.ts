import { z } from "zod";
import { languageCodeSchema } from "./primitives/language-code";

/**
 * MVP contract (Chunk 9) — bilinçli olarak küçük. `frequencyRank` kaldırıldı:
 * bugün hiçbir behavior tarafından tüketilmiyor, gerçek bir "hangi kelimeler
 * önce gösterilsin" ihtiyacı doğmadan bu alanı geri getirmiyoruz.
 *
 * `gloss` — küratör tarafından yazılmış, kısa, user-facing bir açıklama/anlam.
 * Bir dictionary-provider response'u DEĞİL. MVP boyunca TEK, SABİT bir açıklama
 * dilinde tutuluyor — `glossLanguage`, kullanıcının native-language tercihi veya
 * herhangi bir localization framework'ü bilinçli olarak yok (AnonymousUser'da
 * zaten bir "hangi dile çevrilsin" bilgisi yok — bu problemi şimdi açmıyoruz).
 */
export const wordSchema = z.object({
  id: z.string().uuid(),
  language: languageCodeSchema,
  lemma: z.string(),
  gloss: z.string(),
});

export type Word = z.infer<typeof wordSchema>;
