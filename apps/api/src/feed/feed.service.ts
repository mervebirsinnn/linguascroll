import { BadRequestException, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { feedPageSchema, type FeedItem, type FeedPage, type FeedPreferences, type FeedQuiz, type PlayableVideo } from "@linguascroll/shared-types";
import {
  decodeFeedCursor,
  encodeFeedCursor,
  FEED_CURSOR_VERSION,
  InvalidFeedCursorError,
  MAX_SESSION_FEED_ITEMS,
  type FeedCursorPayload,
  type FeedPlanItemRef,
} from "./feed-cursor";
import { PersonalizationService } from "../personalization/personalization.service";
import { QuizzesService } from "../quizzes/quizzes.service";
import { UsersService } from "../users/users.service";
import { VideosService } from "../videos/videos.service";
import { WordsService } from "../words/words.service";

// Chunk 14: 2:1 → 4:1. Kullanıcı kararı: Chunk 10'un "pekiştirme az önce
// izlenen içerikle olabildiğince yakın olsun" gerekçesi hâlâ geçerli (quiz
// yine SADECE son izlenen gerçek video grubunun kaynağı olan bir segment'ten
// geliyor, bkz. findUnusedQuizForGroup) — ama 2 videoda bir quiz, feed'i bir
// video-feed olarak akıcı hissettirmek yerine sık sık kesiyordu. 4 videoda
// bir quiz, ürünün "önce eğlenceli/akıcı video-feed, quiz PEKİŞTİRME içindir,
// feed'in kendisi değildir" önceliğiyle daha tutarlı.
const VIDEOS_PER_QUIZ = 4;

/** Final `FeedItem` sayısı, sayfa başına (video+quiz karışık). */
const PAGE_SIZE = 12;

/**
 * Bir feed session'ının rank edeceği MAKSİMUM video sayısı — `rankVideos`'un
 * candidate GİRDİSİNİ değil, ÇIKTISINI bound'luyor (bkz. startSession).
 *
 * Bilinçli scalability limitation (Chunk 8): `rankVideos` hâlâ TÜM candidate
 * havuzunu ranklıyor, sadece sonucun ilk 27'si kullanılıyor. Katalog binlerce
 * videoya çıkarsa bu bir top-K/ön-filtre optimizasyonuyla revize edilmeli —
 * şimdi değil.
 *
 * MAX_SESSION_FEED_ITEMS (feed-cursor.ts) ile KARIŞTIRILMAMALI: o, cursor'ın
 * kendi başına uyguladığı ayrı bir invariant. Bugün 27 video + 4:1 quiz cadence
 * (Chunk 14 — eskiden 2:1, bkz. VIDEOS_PER_QUIZ yorumu) teorik olarak EN FAZLA
 * 27 + floor(27/4) = 33 item'a denk düşüyor (assertFitsSessionBound bunu
 * runtime'da doğruluyor) ama bu iki sabit BİLİNÇLİ OLARAK ayrı tutuluyor
 * (Chunk 8 review kararı) — feed-cursor.ts'teki MAX_SESSION_FEED_ITEMS bu üst
 * sınırı YANSITMALI, otomatik türetilmiyor. Cadence her değiştiğinde bu iki
 * yorum VE feed-cursor.ts'teki sabit BİRLİKTE elle güncellenmeli.
 */
const MAX_SESSION_VIDEOS = 27;

/**
 * FeedController
 * → FeedService (userId var mı kontrolü, session start/continue orchestration)
 * → PersonalizationService (video sırası) + QuizzesService/VideosService (composition + batch resolve)
 *
 * Chunk 8: `GET /feed` artık paginated. Akış iki koldan birine ayrılıyor:
 *
 *  - cursor YOK  → startSession: rankVideos + interleaveFeed TEK SEFER çalışır,
 *    sonuç bounded bir "frozen plan"a ({type,id} referansları) indirgenir.
 *  - cursor VAR  → continueSession: cursor decode+verify edilir, frozen plan'dan
 *    devam edilir — rankVideos/interleaveFeed BİR DAHA ÇALIŞMAZ.
 *
 * Her iki kolun da bittiği ortak nokta buildPage: plan'ı PAGE_SIZE'lık ham
 * dilimlere bölüp resolve eder, resolve edilemeyen (silinmiş) slotları atlayarak
 * server-side bounded bridging yapar (bkz. buildPage yorumu).
 */
@Injectable()
export class FeedService {
  private readonly cursorSecret: string;

  constructor(
    private readonly videosService: VideosService,
    private readonly quizzesService: QuizzesService,
    private readonly personalizationService: PersonalizationService,
    private readonly usersService: UsersService,
    private readonly wordsService: WordsService,
    configService: ConfigService,
  ) {
    this.cursorSecret = configService.getOrThrow<string>("FEED_CURSOR_SECRET");
  }

  /**
   * Chunk 15 — `preference` (onboarding'in level/topics'i) SADECE yeni bir
   * session başlatırken (`cursor` YOK) anlamlı — `continueSession` frozen
   * plan'dan devam ettiği için ranking'i bir daha hiç çalıştırmıyor, bu
   * yüzden `preference` continuation isteklerinde SESSİZCE yok sayılıyor
   * (mobile zaten sadece cursor'sız isteklerde gönderiyor, bkz. fetch-feed.ts).
   */
  async getFeed(userId: string, cursor?: string, preference?: FeedPreferences): Promise<FeedPage> {
    const userExists = await this.usersService.userExists(userId);
    if (!userExists) {
      throw new BadRequestException(`"${userId}", var olan bir kullanıcıya ait değil`);
    }

    // Boş string de "cursor yok" sayılır — query param'ın yanlışlıkla `?cursor=`
    // olarak boş gönderilmesi bir 400 değil, yeni bir session başlatır.
    if (cursor) {
      return this.continueSession(userId, cursor);
    }
    return this.startSession(userId, preference);
  }

  private async startSession(userId: string, preference?: FeedPreferences): Promise<FeedPage> {
    const videos = await this.videosService.getVideoFeed();
    const personalizedVideos = await this.personalizationService.getPersonalizedVideos(userId, videos, preference);
    const boundedVideos = personalizedVideos.slice(0, MAX_SESSION_VIDEOS);

    // Chunk 10: quiz seçimi artık "sıradaki quiz" değil, "bounded session'daki
    // GERÇEK videoların kaynak olduğu quiz" — bu yüzden quiz sorgusu, hangi
    // videoların bu session'a dahil olduğu belli OLDUKTAN SONRA, o video
    // id'leriyle yapılıyor (bkz. interleaveFeed).
    const quizzesByVideoId = await this.quizzesService.getQuizzesGroupedByVideoId(
      boundedVideos.map((video) => video.id),
    );

    // interleaveFeed'in çıktısı (ComposedItem[]) PUBLIC FeedItem[] DEĞİL — burada
    // videolar henüz vocabulary/segment-enrich edilmemiş (bkz. ComposedItem yorumu).
    // Bu adım sadece plan'ın {type,id} sırasını üretmek için var, hiçbir zaman
    // client'a serialize edilmiyor.
    const composedItems = interleaveFeed(boundedVideos, quizzesByVideoId);
    const plan = composedItems.map(toFeedPlanItemRef);
    assertFitsSessionBound(plan);

    return this.buildPage(userId, plan, 0);
  }

  private continueSession(userId: string, cursor: string): Promise<FeedPage> {
    let payload: FeedCursorPayload;
    try {
      payload = decodeFeedCursor(cursor, this.cursorSecret);
    } catch (error) {
      if (error instanceof InvalidFeedCursorError) {
        throw new BadRequestException("Geçersiz veya bozulmuş feed cursor'ı");
      }
      throw error;
    }

    // Cursor'ın temsil ettiği personalization session'ı ile request'in userId'si
    // eşleşmeli. Bu authentication DEĞİL (auth henüz yok) — bir consistency
    // invariant'ı: bir userId'nin cursor'ını farklı bir userId ile devam
    // ettirmeye çalışmak iki farklı personalization session'ını karıştırır.
    if (payload.userId !== userId) {
      throw new BadRequestException("Cursor, bu userId'ye ait değil");
    }

    return this.buildPage(userId, payload.plan, payload.position);
  }

  /**
   * Frozen plan'ı `startPosition`'dan itibaren dilimleyip resolve eder. Bir ham
   * dilimdeki TÜM ref'ler unavailable ise (silinmiş video/quiz), o dilimi atlayıp
   * bir sonraki ham dilime geçer — server-side bounded bridging (Chunk 8 §5
   * kararı, mobile'a taşınmadı).
   *
   * KRİTİK: `position` HER ZAMAN ham PAGE_SIZE kadar ilerler, resolve edilen
   * item SAYISINA GÖRE DEĞİL (Chunk 8 review düzeltmesi #2) — örn. slot 0-11 tamamen
   * unavailable, slot 12-23 geçerliyse, response 12-23'ten üretilir ve bir
   * sonraki cursor'ın position'ı 24 olur, 12 değil. Aksi halde bir sonraki
   * request aynı (zaten boş olduğu bilinen) dilimi tekrar döndürürdü.
   *
   * Bounded: plan sabit uzunlukta (≤ MAX_SESSION_FEED_ITEMS) olduğu için bu
   * döngü en fazla ceil(plan.length / PAGE_SIZE) kez çalışır — sonsuz döngü
   * riski yok, plan zaten sonlu ve donmuş.
   */
  private async buildPage(userId: string, plan: FeedPlanItemRef[], startPosition: number): Promise<FeedPage> {
    let position = startPosition;
    let items: FeedItem[] = [];

    while (position < plan.length) {
      const rawSlice = plan.slice(position, position + PAGE_SIZE);
      const resolved = await this.resolvePlanRefs(rawSlice, userId);
      position += PAGE_SIZE;
      if (resolved.length > 0) {
        items = resolved;
        break;
      }
      // resolved boş: bu dilimin TÜMÜ unavailable — döngü bir sonraki dilime geçer.
    }

    const nextCursor =
      position >= plan.length
        ? null
        : encodeFeedCursor({ v: FEED_CURSOR_VERSION, userId, plan, position }, this.cursorSecret);

    return feedPageSchema.parse({ items, nextCursor });
  }

  /**
   * Video ve quiz id'lerini ayrıştırıp EN FAZLA 3 batch query ile çözer
   * (`findVideosByIds`/`findQuizzesByIds`/`getVocabularyForVideos`, hepsi
   * `WHERE id IN (...)` temelli) — id başına ayrı bir `findVideoById`/`findQuizById`
   * loop'u DEĞİL (N+1 önlemi, Chunk 8 review düzeltmesi). Sonuç, `refs`'in
   * (frozen) sırasına göre TEK bir geçişte yeniden dizilir — `IN` sorgusu dönüş
   * sırası garantisi vermediği için bu adım atlanamaz. Resolve edilemeyen
   * (silinmiş) bir ref sessizce atlanır; plan hiç mutate edilmez, diğer
   * ref'lerin relative sırası bozulmaz.
   *
   * Chunk 9: vocabulary/saved-state zenginleştirmesi BİLİNÇLİ OLARAK burada,
   * VideosService'in DIŞINDA yapılıyor (bkz. playable-video.ts/feed-playable-video.ts'teki
   * cohesion kararı) — `VideosService` vocabulary kavramından tamamen habersiz,
   * base `PlayableVideo` üretir (hiç `vocabulary` alanı yok). FeedService bunun
   * üzerine gerçek (userId-aware) vocabulary'yi bindirip public `FeedPlayableVideo`
   * şeklini inşa ediyor. Bu enrichment SADECE bu sayfanın video id'leri için
   * (session'ın tamamı için değil) — Chunk 8'in "sadece bu sayfa için gereken
   * kadar resolve et" disipliniyle tutarlı.
   *
   * Chunk 10: aynı disiplinle, transcript segment'leri de burada, aynı
   * Promise.all içinde batch resolve ediliyor (VideosService.getSegmentsForVideos
   * — id başına sorgu yok). Segment'i olmayan video için `segments: []` (madde
   * 1'deki "transcript'siz video" davranışı).
   */
  private async resolvePlanRefs(refs: readonly FeedPlanItemRef[], userId: string): Promise<FeedItem[]> {
    const videoIds = refs.filter((ref) => ref.type === "video").map((ref) => ref.id);
    const quizIds = refs.filter((ref) => ref.type === "quiz").map((ref) => ref.id);

    const [videos, quizzes, vocabularyByVideoId, segmentsByVideoId] = await Promise.all([
      this.videosService.getPlayableVideosByIds(videoIds),
      this.quizzesService.getFeedQuizzesByIds(quizIds),
      this.wordsService.getVocabularyForVideos(videoIds, userId),
      this.videosService.getSegmentsForVideos(videoIds),
    ]);

    const videoById = new Map(
      videos.map((video) => [
        video.id,
        { ...video, vocabulary: vocabularyByVideoId.get(video.id) ?? [], segments: segmentsByVideoId.get(video.id) ?? [] },
      ]),
    );
    const quizById = new Map(quizzes.map((quiz) => [quiz.id, quiz]));

    const items: FeedItem[] = [];
    for (const ref of refs) {
      if (ref.type === "video") {
        const video = videoById.get(ref.id);
        if (video) {
          items.push({ type: "video", video });
        }
      } else {
        const quiz = quizById.get(ref.id);
        if (quiz) {
          items.push({ type: "quiz", quiz });
        }
      }
    }
    return items;
  }
}

/**
 * `startSession`'ın interleave/plan-üretme adımı için INTERNAL bir temsil —
 * PUBLIC `FeedItem` DEĞİL. Buradaki `video: PlayableVideo` (base, `FeedPlayableVideo`
 * DEĞİL) çünkü bu aşamada henüz vocabulary-enrichment yapılmadı (o, gerçek
 * response'un inşa edildiği `resolvePlanRefs`'te olur). `toFeedPlanItemRef` zaten
 * sadece `.id`'yi okuduğu için bu ayrım plan üretimini hiç etkilemiyor.
 */
type ComposedItem = { type: "video"; video: PlayableVideo } | { type: "quiz"; quiz: FeedQuiz };

function toFeedPlanItemRef(item: ComposedItem): FeedPlanItemRef {
  return item.type === "video" ? { type: "video", id: item.video.id } : { type: "quiz", id: item.quiz.id };
}

/**
 * MAX_SESSION_VIDEOS + 2:1 quiz cadence'in matematiksel olarak
 * MAX_SESSION_FEED_ITEMS'ı aşmadığını runtime'da doğrular. İki sabit bilinçli
 * olarak ayrı dosyalarda/ayrı invariant olarak tutulduğu için (Chunk 8 kararı),
 * biri ileride değişirse diğerinin sessizce ihlal edilmesini önlüyor.
 */
function assertFitsSessionBound(plan: FeedPlanItemRef[]): void {
  if (plan.length > MAX_SESSION_FEED_ITEMS) {
    throw new Error(
      `Feed plan boyutu (${plan.length}) MAX_SESSION_FEED_ITEMS'ı (${MAX_SESSION_FEED_ITEMS}) aşıyor — ` +
        "MAX_SESSION_VIDEOS/VIDEOS_PER_QUIZ sabitleri gözden geçirilmeli.",
    );
  }
}

/**
 * 2 video → 1 quiz (Chunk 10: 3:1'den değişti). Bu bir feed composition
 * policy'si — ne bir DB constraint ne bir domain invariant, sadece burada,
 * tek bir sabit + saf bir fonksiyon.
 *
 * Chunk 10: quiz seçimi artık "havuzdaki sıradaki quiz" DEĞİL — az önce
 * tamamlanan video grubunun GERÇEK kaynağı olan bir quiz aranıyor
 * (`findUnusedQuizForGroup`, en yeni videodan en eskiye). Eşleşen yoksa quiz
 * hiç gösterilmiyor (alakasız bir quiz göstermekten daha doğru — language-
 * learning UX kararı) — bu, "quiz havuzu tükenirse video-only devam" invariant'ının
 * kaynak-bağımlı hali. Aynı feed üretiminde bir quiz asla tekrar kullanılmıyor.
 *
 * Chunk 8: pagination'ı HİÇ bilmiyor — session başında (startSession) bounded
 * video listesi üzerinde TEK SEFER çalışıp tam frozen plan'ı üretiyor; sayfalama
 * bu ÇIKTININ üzerine sonradan bindiriliyor (bkz. buildPage).
 */
function interleaveFeed(videos: PlayableVideo[], quizzesByVideoId: Map<string, FeedQuiz[]>): ComposedItem[] {
  const feed: ComposedItem[] = [];
  const usedQuizIds = new Set<string>();
  let currentGroupVideoIds: string[] = [];

  videos.forEach((video, index) => {
    feed.push({ type: "video", video });
    currentGroupVideoIds.push(video.id);

    const completedVideoGroup = (index + 1) % VIDEOS_PER_QUIZ === 0;
    if (!completedVideoGroup) {
      return;
    }

    const quiz = findUnusedQuizForGroup(currentGroupVideoIds, quizzesByVideoId, usedQuizIds);
    currentGroupVideoIds = [];
    if (!quiz) {
      return;
    }

    feed.push({ type: "quiz", quiz });
    usedQuizIds.add(quiz.id);
  });

  return feed;
}

/**
 * Bir video grubu (en son tamamlanan `VIDEOS_PER_QUIZ` video) için, kaynağı bu
 * gruptaki bir video olan, henüz kullanılmamış bir quiz arar — en YENİ videodan
 * en eskiye doğru (quiz mümkün olduğunca "az önce izlenen"e bağlı olsun diye).
 */
function findUnusedQuizForGroup(
  groupVideoIds: readonly string[],
  quizzesByVideoId: Map<string, FeedQuiz[]>,
  usedQuizIds: ReadonlySet<string>,
): FeedQuiz | undefined {
  for (let i = groupVideoIds.length - 1; i >= 0; i--) {
    const videoId = groupVideoIds[i];
    if (!videoId) {
      continue;
    }
    const candidates = quizzesByVideoId.get(videoId) ?? [];
    const unused = candidates.find((quiz) => !usedQuizIds.has(quiz.id));
    if (unused) {
      return unused;
    }
  }
  return undefined;
}
