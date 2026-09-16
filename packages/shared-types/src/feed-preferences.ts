import { z } from "zod";
import { cefrLevelSchema } from "./video";
import { topicSchema } from "./video";

/**
 * Chunk 15 — onboarding'in ürettiği, cold-start ranking'i etkileyen (ama
 * FİLTRELEMEYEN — bkz. personalization-ranking.ts) tercih sinyali. Mevcut
 * `cefrLevelSchema`/`topicSchema`'yı REUSE ediyor — yeni bir taxonomy YOK.
 *
 * Hem mobile'ın AsyncStorage-okuma validasyonu (bkz. onboarding/storage.ts)
 * HEM API'nin `GET /feed` query-param validasyonu (bkz. feed-preference-query.ts)
 * AYNI şemayı kullanıyor — `languageCodeSchema`'nın zaten kurduğu "shared
 * primitive" deseniyle tutarlı.
 *
 * `level: null` = "seçmedi/atladı" (CEFR skalasında geçerli bir değer DEĞİL,
 * bilinçli olarak ayrı bir "bilinmiyor" durumu). `topics: []` = "hiç seçmedi" —
 * ikisi de meşru, hard-filter TETİKLEMEYEN durumlar.
 */
export const feedPreferencesSchema = z.object({
  level: cefrLevelSchema.nullable(),
  topics: z.array(topicSchema),
});

export type FeedPreferences = z.infer<typeof feedPreferencesSchema>;
