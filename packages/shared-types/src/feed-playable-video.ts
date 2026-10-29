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
 *
 * 2026-10-27 — `playbackUrl` burada NULLABLE: ücretsiz hak (hesap başına toplam 10 farklı
 * video) feed'de değil, oynatma erişimi verilirken tüketiliyor. Feed, kullanıcının o
 * videoya ZATEN erişimi varsa (abone / kapı kapalı / bu video daha önce açılmış) imzalı
 * URL'i doğrudan taşır; yoksa `null` döner ve mobile `POST /videos/:id/playback-access`
 * ile erişim ister (hak orada, atomik olarak tüketilir). Böylece feed'i prefetch etmek
 * ya da kategori değiştirmek hak yakmaz ve sınırı aşamaz.
 */
export const feedPlayableVideoSchema = playableVideoSchema.extend({
  playbackUrl: z.string().url().nullable(),
  vocabulary: z.array(videoVocabularyItemSchema),
  segments: z.array(transcriptSegmentSchema),
});

export type FeedPlayableVideo = z.infer<typeof feedPlayableVideoSchema>;
