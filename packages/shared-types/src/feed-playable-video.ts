import { z } from "zod";
import { playableVideoSchema } from "./playable-video";
import { videoVocabularyItemSchema } from "./video-vocabulary-item";

/**
 * FeedPlayableVideo = PlayableVideo (base/catalog) + vocabulary (Chunk 9). Basit
 * bir `.extend()` — inheritance/generic abstraction DEĞİL. `vocabulary` her
 * zaman bir dizi (kelimesiz video için []) — mobile undefined-kontrolü yapmak
 * zorunda kalmasın diye.
 *
 * Bu tip SADECE `GET /feed` response'unda var: `FeedService`'in enrichment
 * adımından geçmiş, user-aware ("BU kullanıcı hangisini kaydetmiş") bir
 * projeksiyon. `VideosService`/`VideosRepository` bu tipten HİÇ haberdar değil —
 * onlar hâlâ (ve sadece) base `PlayableVideo` üretir/tüketir.
 */
export const feedPlayableVideoSchema = playableVideoSchema.extend({
  vocabulary: z.array(videoVocabularyItemSchema),
});

export type FeedPlayableVideo = z.infer<typeof feedPlayableVideoSchema>;
