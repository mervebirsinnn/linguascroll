import { z } from "zod";
import { languageCodeSchema } from "./primitives/language-code";

/** CEFR ölçeği (Avrupa Ortak Dil Referans Çerçevesi) — dış standart, keyfi bir seçim değil. */
const cefrLevelSchema = z.enum(["A1", "A2", "B1", "B2", "C1", "C2"]);

/**
 * topic = content-interest kategorisi, curriculum/öğrenim sıralaması DEĞİL.
 * CEFR'den bilinçli olarak bağımsız: her kategori teorik olarak her CEFR
 * seviyesinde içerik barındırabilir (Chunk 7 personalization'ının "kullanıcının
 * zevkini CEFR seviyesinden ayrıştırabilme" varsayımı buna dayanıyor).
 *
 * v1'de her video TAM OLARAK bir topic taşır (multi-tag YOK). Yeni bir topic
 * eklemek bilinçli olarak code + migration gerektirir — dinamik bir categories
 * tablosu/admin CRUD'u YOK, cefrLevel ile aynı desen.
 */
export const topicSchema = z.enum(["dating", "travel", "career", "lifestyle", "humor"]);
export type Topic = z.infer<typeof topicSchema>;

export const videoSchema = z.object({
  id: z.string().uuid(),
  learningLanguage: languageCodeSchema,
  cefrLevel: cefrLevelSchema,

  // muxAssetId, Mux'a özgü bir altyapı referansı. Video (core/domain contract) içinde
  // kalıyor çünkü v1 roadmap'i video teslimini doğrudan Mux'a devrediyor, ama client'a
  // hiç sızmıyor: PlayableVideo (bkz. playable-video.ts) bu alanı .omit() ile çıkarıp
  // yerine imzalı bir playbackUrl koyuyor. API sınırını geçen her response PlayableVideo
  // kullanmalı, Video'yu doğrudan değil.
  muxAssetId: z.string(),

  topic: topicSchema,

  // "playable" bir video için 0 süre domain olarak imkansız bir durum (Chunk 7
  // kararı) — .nonnegative() değil .positive(). DB'de aynı sıkılık CHECK ile
  // (videos.schema.ts) ayrıca zorlanıyor.
  durationMs: z.number().int().positive(),
});

export type Video = z.infer<typeof videoSchema>;
