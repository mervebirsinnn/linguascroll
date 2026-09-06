import { z } from "zod";
import { playableVideoSchema } from "./playable-video";
import { transcriptSegmentSchema } from "./transcript-segment";
import { videoVocabularyItemSchema } from "./video-vocabulary-item";

/**
 * FeedPlayableVideo = PlayableVideo (base/catalog) + vocabulary (Chunk 9) +
 * segments (Chunk 10). Basit bir `.extend()` — inheritance/generic abstraction
 * DEĞİL. `vocabulary`/`segments` her zaman bir dizi (kelimesiz/transkriptsiz
 * video için []) — mobile undefined-kontrolü yapmak zorunda kalmasın diye;
 * mobile tarafında boş `segments` = altyazı overlay'i hiç render edilmez.
 *
 * Bu tip SADECE `GET /feed` response'unda var: `FeedService`'in enrichment
 * adımından geçmiş bir projeksiyon. `VideosService`/`VideosRepository` bu
 * tipten HİÇ haberdar değil — onlar hâlâ (ve sadece) base `PlayableVideo`
 * üretir/tüketir (vocabulary'deki Chunk 9 kararıyla aynı cohesion sınırı).
 */
export const feedPlayableVideoSchema = playableVideoSchema.extend({
  vocabulary: z.array(videoVocabularyItemSchema),
  segments: z.array(transcriptSegmentSchema),
});

export type FeedPlayableVideo = z.infer<typeof feedPlayableVideoSchema>;
