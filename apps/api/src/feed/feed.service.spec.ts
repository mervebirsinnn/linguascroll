import type { FeedQuiz, PlayableVideo, VideoVocabularyItem } from "@linguascroll/shared-types";
import { decodeFeedCursor } from "./feed-cursor";
import { FeedService } from "./feed.service";
import type { PersonalizationService } from "../personalization/personalization.service";
import type { QuizzesService } from "../quizzes/quizzes.service";
import type { UsersService } from "../users/users.service";
import type { VideosService } from "../videos/videos.service";
import type { WordsService } from "../words/words.service";

/**
 * FeedService'i NestJS DI container'ı olmadan, doğrudan stub bağımlılıklarla test
 * ediyoruz — mevcut projede zaten yerleşik desen. Bu dosya SADECE composition/
 * pagination/cursor orchestration'ını doğruluyor: personalization'ın kendi sıralama
 * mantığı personalization-ranking.spec.ts'te, cursor'ın kendi encode/decode/verify
 * mantığı feed-cursor.spec.ts'te, gerçek Postgres delete/HTTP davranışı
 * feed.e2e-spec.ts'te. Bu yüzden `personalizationService` stub'ı BİLİNÇLİ olarak
 * identity fonksiyonu (verilen video listesini DEĞİŞTİRMEDEN döner).
 */

const TEST_USER_ID = "00000000-0000-4000-8000-000000000001";
const OTHER_USER_ID = "00000000-0000-4000-8000-000000000002";
const CURSOR_SECRET = "test-secret-do-not-use-in-real-environments-0123456789";

// feedPageSchema, FeedItem'ın id alanlarını gerçek UUID formatında doğruluyor —
// bu yüzden test fixture'ları da "v1"/"q1" gibi okunaklı ama sahte string'ler
// yerine, okunaklılığı numaralarla koruyan gerçek UUID-şekilli id'ler üretiyor.
function uuidFor(namespace: number, n: number): string {
  return `00000000-0000-4000-${String(namespace).padStart(4, "0")}-${String(n).padStart(12, "0")}`;
}
const vId = (n: number): string => uuidFor(1, n);
const qId = (n: number): string => uuidFor(2, n);
const qOptId = (n: number, opt: number): string => uuidFor(3, n * 10 + opt);
const wId = (n: number): string => uuidFor(4, n);

function makeVideo(n: number, topic: PlayableVideo["topic"] = "travel"): PlayableVideo {
  return {
    id: vId(n),
    learningLanguage: "en",
    cefrLevel: "A1",
    topic,
    durationMs: 1000,
    playbackUrl: `https://example.com/${vId(n)}.mp4`,
  };
}

function makeVocabularyItem(n: number, saved: boolean): VideoVocabularyItem {
  return { word: { id: wId(n), language: "en", lemma: `word-${n}`, gloss: `gloss-${n}` }, saved };
}

function makeQuiz(n: number): FeedQuiz {
  return {
    id: qId(n),
    question: `question-${n}`,
    options: [
      { id: qOptId(n, 1), text: "a" },
      { id: qOptId(n, 2), text: "b" },
    ],
  };
}

/**
 * MAX_SESSION_VIDEOS=27'yi TAM dolduran ve MAX_SESSION_FEED_ITEMS=36'ya TAM
 * oturan bir senaryo: 30 video (ilk 27'si kullanılacak, son 3'ü bound testi için
 * fazladan), 9 quiz (27/3 = tam 9, kalan yok). personalizationService identity
 * olduğu için nihai plan sırası aynen bu video sırası + her 3 videoda bir quiz:
 *
 * v1,v2,v3,q1, v4,v5,v6,q2, v7,v8,v9,q3, v10,v11,v12,q4, v13,v14,v15,q5,
 * v16,v17,v18,q6, v19,v20,v21,q7, v22,v23,v24,q8, v25,v26,v27,q9   (36 item, 3 sayfa × 12)
 */
function makeFullSessionVideos(): PlayableVideo[] {
  return Array.from({ length: 30 }, (_, i) => makeVideo(i + 1));
}
function makeFullSessionQuizzes(): FeedQuiz[] {
  return Array.from({ length: 9 }, (_, i) => makeQuiz(i + 1));
}

type ServiceOverrides = {
  videos?: PlayableVideo[];
  quizzes?: FeedQuiz[];
  /** Gerçek DB batch-resolve'unu simüle eder: id sırasını KARIŞTIRABİLİR, bazı id'leri hiç DÖNDÜRMEYEBİLİR (silinmiş). */
  resolveVideosByIds?: (ids: string[]) => PlayableVideo[];
  resolveQuizzesByIds?: (ids: string[]) => FeedQuiz[];
  userExists?: boolean;
  personalize?: (candidates: PlayableVideo[]) => PlayableVideo[];
  /**
   * Chunk 9 — WordsService.getVocabularyForVideos stub'ı. Çağrı argümanlarını
   * (`videoIds`, `userId`) da kaydediyor ki testler "tek batch çağrı, doğru
   * argümanlarla" iddiasını doğrulayabilsin. Varsayılan: boş Map (mevcut
   * pagination/composition testleri vocabulary'den habersiz kalmaya devam eder).
   */
  vocabularyByVideoId?: Map<string, VideoVocabularyItem[]>;
  onGetVocabularyForVideos?: (videoIds: string[], userId: string) => void;
};

function makeFeedService(overrides: ServiceOverrides = {}): FeedService {
  const videos = overrides.videos ?? makeFullSessionVideos();
  const quizzes = overrides.quizzes ?? makeFullSessionQuizzes();
  const videoById = new Map(videos.map((v) => [v.id, v]));
  const quizById = new Map(quizzes.map((q) => [q.id, q]));

  const videosService = {
    getVideoFeed: () => Promise.resolve(videos),
    getPlayableVideosByIds: (ids: string[]) =>
      Promise.resolve(
        overrides.resolveVideosByIds
          ? overrides.resolveVideosByIds(ids)
          : ids.map((id) => videoById.get(id)).filter((v): v is PlayableVideo => !!v),
      ),
  } as unknown as VideosService;

  const quizzesService = {
    getQuizFeed: () => Promise.resolve(quizzes),
    getFeedQuizzesByIds: (ids: string[]) =>
      Promise.resolve(
        overrides.resolveQuizzesByIds
          ? overrides.resolveQuizzesByIds(ids)
          : ids.map((id) => quizById.get(id)).filter((q): q is FeedQuiz => !!q),
      ),
  } as unknown as QuizzesService;

  const personalizationService = {
    getPersonalizedVideos: (_userId: string, candidates: PlayableVideo[]) =>
      Promise.resolve(overrides.personalize ? overrides.personalize(candidates) : candidates),
  } as unknown as PersonalizationService;

  const usersService = {
    userExists: () => Promise.resolve(overrides.userExists ?? true),
  } as unknown as UsersService;

  const wordsService = {
    getVocabularyForVideos: (videoIds: string[], userId: string) => {
      overrides.onGetVocabularyForVideos?.(videoIds, userId);
      return Promise.resolve(overrides.vocabularyByVideoId ?? new Map<string, VideoVocabularyItem[]>());
    },
  } as unknown as WordsService;

  const configService = { getOrThrow: () => CURSOR_SECRET } as unknown as import("@nestjs/config").ConfigService;

  return new FeedService(videosService, quizzesService, personalizationService, usersService, wordsService, configService);
}

function itemTypes(items: { type: string }[]): string[] {
  return items.map((item) => item.type);
}
function videoIds(items: ({ type: "video"; video: PlayableVideo } | { type: "quiz"; quiz: FeedQuiz })[]): string[] {
  return items.filter((item): item is { type: "video"; video: PlayableVideo } => item.type === "video").map((item) => item.video.id);
}

describe("FeedService.getFeed — session start (cursor yok)", () => {
  it("ilk sayfa tam PAGE_SIZE (12) FeedItem döner, nextCursor non-null", async () => {
    const page = await makeFeedService().getFeed(TEST_USER_ID);

    expect(page.items).toHaveLength(12);
    expect(page.nextCursor).not.toBeNull();
  });

  it("3:1 video:quiz composition korunuyor (ilk sayfa)", async () => {
    const page = await makeFeedService().getFeed(TEST_USER_ID);
    expect(itemTypes(page.items)).toEqual([
      "video", "video", "video", "quiz",
      "video", "video", "video", "quiz",
      "video", "video", "video", "quiz",
    ]);
  });

  it("var olmayan userId için exception fırlatır", async () => {
    await expect(makeFeedService({ userExists: false }).getFeed(TEST_USER_ID)).rejects.toThrow();
  });

  it("MAX_SESSION_VIDEOS=27'yi aşan candidate'ler bounded — 30 video verilse de plan'da sadece ilk 27'si var", async () => {
    const service = makeFeedService();
    let page = await service.getFeed(TEST_USER_ID);
    let allVideoIds = videoIds(page.items);
    let cursor = page.nextCursor;
    while (cursor) {
      page = await service.getFeed(TEST_USER_ID, cursor);
      allVideoIds = allVideoIds.concat(videoIds(page.items));
      cursor = page.nextCursor;
    }
    expect(allVideoIds).toHaveLength(27);
    expect(allVideoIds).not.toContain(vId(28));
    expect(allVideoIds).not.toContain(vId(29));
    expect(allVideoIds).not.toContain(vId(30));
  });
});

describe("FeedService.getFeed — pagination continuation", () => {
  it("frozen sırayı koruyarak devam eder (3 sayfa, 36 item, exact bound)", async () => {
    const service = makeFeedService();

    const page1 = await service.getFeed(TEST_USER_ID);
    expect(itemTypes(page1.items)).toEqual([
      "video", "video", "video", "quiz", "video", "video", "video", "quiz", "video", "video", "video", "quiz",
    ]);
    expect(videoIds(page1.items)).toEqual([vId(1), vId(2), vId(3), vId(4), vId(5), vId(6), vId(7), vId(8), vId(9)]);

    const page2 = await service.getFeed(TEST_USER_ID, page1.nextCursor ?? undefined);
    expect(videoIds(page2.items)).toEqual([vId(10), vId(11), vId(12), vId(13), vId(14), vId(15), vId(16), vId(17), vId(18)]);

    const page3 = await service.getFeed(TEST_USER_ID, page2.nextCursor ?? undefined);
    expect(videoIds(page3.items)).toEqual([vId(19), vId(20), vId(21), vId(22), vId(23), vId(24), vId(25), vId(26), vId(27)]);

    // Son sayfa → nextCursor null (Chunk 8 kararı).
    expect(page3.nextCursor).toBeNull();
  });

  it("sayfalar arasında aynı video hiç tekrar etmiyor (global dedupe zaten session start'ta tek sefer oluşuyor)", async () => {
    const service = makeFeedService();
    const page1 = await service.getFeed(TEST_USER_ID);
    const page2 = await service.getFeed(TEST_USER_ID, page1.nextCursor ?? undefined);
    const page3 = await service.getFeed(TEST_USER_ID, page2.nextCursor ?? undefined);

    const allIds = [...videoIds(page1.items), ...videoIds(page2.items), ...videoIds(page3.items)];
    expect(new Set(allIds).size).toBe(allIds.length);
  });

  it("personalization'ın verdiği ARBİTRER (exploration-benzeri) sıra pagination boyunca birebir korunuyor", async () => {
    // personalizationService alfabetik/numerik olmayan bir sıra döndürüyor —
    // pagination bunu hiç yeniden sıralamamalı, sadece dilimlemeli.
    const scrambledOrder = [vId(5), vId(1), vId(9), vId(3), vId(7), vId(2), vId(8), vId(4), vId(6)];
    const videos = [1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => makeVideo(n));
    const quizzes = [makeQuiz(1), makeQuiz(2), makeQuiz(3)];

    const service = makeFeedService({
      videos,
      quizzes,
      personalize: (candidates) => scrambledOrder.map((id) => candidates.find((v) => v.id === id)!),
    });

    const page = await service.getFeed(TEST_USER_ID);
    expect(videoIds(page.items)).toEqual(scrambledOrder.slice(0, 9));
  });

  it("cursor userId mismatch → exception (farklı bir userId ile devam ettirilemez)", async () => {
    const service = makeFeedService();
    const page1 = await service.getFeed(TEST_USER_ID);

    await expect(service.getFeed(OTHER_USER_ID, page1.nextCursor ?? undefined)).rejects.toThrow();
  });
});

describe("FeedService.getFeed — batch resolution & content-change davranışı", () => {
  it("batch resolve KARIŞIK sırada dönse bile final output frozen plan sırasını koruyor", async () => {
    const service = makeFeedService({
      resolveVideosByIds: (ids) => [...ids].reverse().map((id) => ({ ...makeVideo(1), id })), // ters sırada dön
      resolveQuizzesByIds: (ids) => ids.map((id) => ({ ...makeQuiz(1), id })),
    });

    const page = await service.getFeed(TEST_USER_ID);
    // Batch sonucu ters gelse de, response frozen ref sırasında (v1,v2,v3,...) kalmalı.
    expect(videoIds(page.items)).toEqual([vId(1), vId(2), vId(3), vId(4), vId(5), vId(6), vId(7), vId(8), vId(9)]);
  });

  it("silinmiş bir frozen item sadece o slot'u atlıyor, diğer item'ların relative sırası bozulmuyor", async () => {
    const service = makeFeedService({
      resolveVideosByIds: (ids) => ids.filter((id) => id !== vId(2)).map((id) => ({ ...makeVideo(1), id })), // v2 "silinmiş"
    });

    const page = await service.getFeed(TEST_USER_ID);
    expect(videoIds(page.items)).toEqual([vId(1), vId(3), vId(4), vId(5), vId(6), vId(7), vId(8), vId(9)]);
    // İlk sayfa (12 ham slot): v1,v2,v3,q1,v4,v5,v6,q2,v7,v8,v9,q3 — v2 atlanınca
    // 11 item kalır, diğer TÜM item'ların (3 quiz dahil) relative sırası aynen korunur.
    expect(itemTypes(page.items)).toEqual([
      "video", "video", "quiz", "video", "video", "video", "quiz", "video", "video", "video", "quiz",
    ]);
  });

  it("bir ham sayfanın TAMAMI unavailable ise, next cursor RAW SLOT'a göre ilerliyor (resolve edilen item sayısına göre DEĞİL)", async () => {
    // İlk 12 ham slot'un (position 0-11: v1,v2,v3,q1,v4,v5,v6,q2,v7,v8,v9,q3) TÜM
    // ref'lerini "silinmiş" say — sayfa TAMAMEN boş resolve olmalı ki bridging tetiklensin.
    const deletedVideoIds = new Set([vId(1), vId(2), vId(3), vId(4), vId(5), vId(6), vId(7), vId(8), vId(9)]);
    const deletedQuizIds = new Set([qId(1), qId(2), qId(3)]);
    const service = makeFeedService({
      resolveVideosByIds: (ids) => ids.filter((id) => !deletedVideoIds.has(id)).map((id) => ({ ...makeVideo(1), id })),
      resolveQuizzesByIds: (ids) => ids.filter((id) => !deletedQuizIds.has(id)).map((id) => ({ ...makeQuiz(1), id })),
    });

    const page = await service.getFeed(TEST_USER_ID);

    // Sunucu ilk (tamamen boş) dilimi atlayıp ikinci dilimden (position 12-23) döndü.
    expect(page.items.length).toBeGreaterThan(0);
    expect(videoIds(page.items)[0]).toBe(vId(10));

    // Kritik doğrulama: nextCursor'ın position'ı 24 olmalı (12 + 12), 12 DEĞİL —
    // aksi halde bir sonraki istek aynı (bilinen-boş) dilimi tekrar döndürürdü.
    expect(page.nextCursor).not.toBeNull();
    const decoded = decodeFeedCursor(page.nextCursor as string, CURSOR_SECRET);
    expect(decoded.position).toBe(24);
  });

  it("plan'ın TAMAMI (sondan sona) unavailable ise items boş, nextCursor null döner — sonsuz döngüye girmez", async () => {
    const service = makeFeedService({
      resolveVideosByIds: () => [],
      resolveQuizzesByIds: () => [],
    });

    const page = await service.getFeed(TEST_USER_ID);
    expect(page.items).toEqual([]);
    expect(page.nextCursor).toBeNull();
  });
});

describe("FeedService.getFeed — vocabulary enrichment (Chunk 9)", () => {
  it("her video'nun vocabulary'si WordsService'ten gelen değerle dolduruluyor (VideosService her zaman [] döner)", async () => {
    const vocabularyByVideoId = new Map<string, VideoVocabularyItem[]>([
      [vId(1), [makeVocabularyItem(1, true)]],
      [vId(2), [makeVocabularyItem(2, false)]],
    ]);
    const service = makeFeedService({ vocabularyByVideoId });

    const page = await service.getFeed(TEST_USER_ID);
    const firstVideo = page.items[0];
    const secondVideo = page.items[1];
    if (firstVideo?.type !== "video" || secondVideo?.type !== "video") {
      throw new Error("Test kurgusu bozuk: ilk iki item video olmalıydı");
    }

    expect(firstVideo.video.vocabulary).toEqual([{ word: expect.objectContaining({ id: wId(1) }), saved: true }]);
    expect(secondVideo.video.vocabulary).toEqual([{ word: expect.objectContaining({ id: wId(2) }), saved: false }]);
  });

  it("vocabulary'si olmayan bir video için boş dizi döner (undefined değil)", async () => {
    const service = makeFeedService({ vocabularyByVideoId: new Map() });
    const page = await service.getFeed(TEST_USER_ID);
    const firstVideo = page.items[0];
    if (firstVideo?.type !== "video") {
      throw new Error("Test kurgusu bozuk");
    }
    expect(firstVideo.video.vocabulary).toEqual([]);
  });

  it("vocabulary lookup TEK bir batch çağrı — sayfadaki TÜM video id'leri ile, userId ile birlikte", async () => {
    const calls: { videoIds: string[]; userId: string }[] = [];
    const service = makeFeedService({ onGetVocabularyForVideos: (videoIds, userId) => calls.push({ videoIds, userId }) });

    await service.getFeed(TEST_USER_ID);

    expect(calls).toHaveLength(1);
    expect(calls[0]?.userId).toBe(TEST_USER_ID);
    expect(calls[0]?.videoIds).toEqual([vId(1), vId(2), vId(3), vId(4), vId(5), vId(6), vId(7), vId(8), vId(9)]);
  });

  it("mevcut 3:1 quiz cadence ve dedupe, vocabulary enrichment sonrası da regression olmadan korunuyor", async () => {
    const vocabularyByVideoId = new Map<string, VideoVocabularyItem[]>([[vId(1), [makeVocabularyItem(1, true)]]]);
    const service = makeFeedService({ vocabularyByVideoId });

    const page1 = await service.getFeed(TEST_USER_ID);
    expect(itemTypes(page1.items)).toEqual([
      "video", "video", "video", "quiz", "video", "video", "video", "quiz", "video", "video", "video", "quiz",
    ]);
    const page2 = await service.getFeed(TEST_USER_ID, page1.nextCursor ?? undefined);
    const allIds = [...videoIds(page1.items), ...videoIds(page2.items)];
    expect(new Set(allIds).size).toBe(allIds.length);
  });
});
