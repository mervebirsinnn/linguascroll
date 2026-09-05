import { z } from "zod";
import { videoSchema } from "./video";

/**
 * PlayableVideo = client'ın bir videoyu gerçekten oynatmak için ihtiyaç duyduğu
 * BASE (user-independent, catalog) contract. Video (core/domain contract) DEĞİL:
 *
 * - muxAssetId çıkarılır (.omit) — bu bir infra referansı, client'a hiç sızmamalı.
 * - playbackUrl eklenir — API'nin gerçek Mux entegrasyonu geldiğinde imzalı bir
 *   oynatma URL'si üreteceği alan (şimdilik mock/statik bir URL).
 *
 * `vocabulary` BİLİNÇLİ OLARAK BURADA YOK (Chunk 9 review düzeltmesi): bir
 * videonun vocabulary'si + "BU kullanıcı hangisini kaydetmiş" bilgisi
 * user-specific bir enrichment — bunu bu base contract'a `[]` gibi sahte bir
 * placeholder'la eklemek semantik olarak yanlıştı: `[]` "bu videonun kelimesi
 * yok" demek, "bu endpoint enrichment yapmıyor" demek değil. Gerçek vocabulary
 * taşıyan projeksiyon `FeedPlayableVideo` (bkz. feed-playable-video.ts) —
 * SADECE FeedService'in enrichment'ından geçmiş response'larda var.
 *
 * Buraya "client için pratik olur" diye rastgele alan eklenmemeli — her yeni alan
 * "bu, videoyu oynatmak için gerçekten gerekli mi" testinden geçmeli. Altyazı,
 * kelime zaman damgası gibi başka domain kaygıları kendi response tiplerini alır.
 */
export const playableVideoSchema = videoSchema
  .omit({ muxAssetId: true })
  .extend({ playbackUrl: z.string().url() });

export type PlayableVideo = z.infer<typeof playableVideoSchema>;
