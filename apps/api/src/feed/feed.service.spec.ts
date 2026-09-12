import type { FeedQuiz, PlayableVideo, TranscriptSegment, VideoVocabularyItem } from "@linguascroll/shared-types";
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
 * MAX_SESSION_VIDEOS=27'yi TAM dolduran ve MAX_SESSION_FEED_ITEMS=33'e TAM oturan
 * bir senaryo (Chunk 14, 4:1 cadence — eskiden 2:1/40 idi): 30 video (ilk 27'si
 * kullanılacak, son 3'ü bound testi için fazladan). 6 quiz — HER 4'lü video
 * grubunun (v1-v4)/(v5-v8)/... EN YENİ (4.) videosundan kaynaklanıyor (grubun
 * en yeni videosuyla eşleşme davranışını doğal olarak sergiler, bkz.
 * findUnusedQuizForGroup). v25-v27 eksik kalır (tamamlanmamış grup), quiz'siz.
 * Nihai plan (personalizationService identity olduğu için bu video sırasıyla
 * BİREBİR aynı):
 *
 * v1,v2,v3,v4,q1, v5,v6,v7,v8,q2, v9,v10,v11,v12,q3, v13,v14,v15,v16,q4,
 * v17,v18,v19,v20,q5, v21,v22,v23,v24,q6, v25,v26,v27
 * (33 item, PAGE_SIZE=12'ye göre: 12+12+9 — 3 sayfa)
 */
function makeFullSessionVideos(): PlayableVideo[] {
  return Array.from({ length: 30 }, (_, i) => makeVideo(i + 1));
}

/** Her (v_{4k-3}..v_{4k}) grubunun EN YENİ (4.) videosuna (v_{4k}) bağlı bir quiz. */
function makeFullSessionQuizzesByVideoId(): Map<string, FeedQuiz[]> {
  const map = new Map<string, FeedQuiz[]>();
  for (let k = 1; k <= 6; k++) {
    map.set(vId(k * 4), [makeQuiz(k)]);
  }
  return map;
}

type ServiceOverrides = {
  videos?: PlayableVideo[];
  /** QuizzesService.getQuizzesGroupedByVideoId'nin gerçek DB davranışını simüle eder: sourceVideoId → quiz'ler. */
  quizzesByVideoId?: Map<string, FeedQuiz[]>;
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
  /** Chunk 10 — VideosService.getSegmentsForVideos stub'ı, vocabulary'yle aynı desen. */
  segmentsByVideoId?: Map<string, TranscriptSegment[]>;
  onGetSegmentsForVideos?: (videoIds: string[]) => void;
  onGetQuizzesGroupedByVideoId?: (videoIds: string[]) => void;
};

function makeFeedService(overrides: ServiceOverrides = {}): FeedService {
  const videos = overrides.videos ?? makeFullSessionVideos();
  const quizzesByVideoId = overrides.quizzesByVideoId ?? makeFullSessionQuizzesByVideoId();
  const videoById = new Map(videos.map((v) => [v.id, v]));
  const allQuizzesById = new Map(Array.from(quizzesByVideoId.values()).flat().map((q) => [q.id, q]));

  const videosService = {
    getVideoFeed: () => Promise.resolve(videos),
    getPlayableVideosByIds: (ids: string[]) =>
      Promise.resolve(
        overrides.resolveVideosByIds
          ? overrides.resolveVideosByIds(ids)
          : ids.map((id) => videoById.get(id)).filter((v): v is PlayableVideo => !!v),
      ),
    getSegmentsForVideos: (videoIds: string[]) => {
      overrides.onGetSegmentsForVideos?.(videoIds);
      return Promise.resolve(overrides.segmentsByVideoId ?? new Map<string, TranscriptSegment[]>());
    },
  } as unknown as VideosService;

  const quizzesService = {
    getQuizzesGroupedByVideoId: (videoIds: string[]) => {
      overrides.onGetQuizzesGroupedByVideoId?.(videoIds);
      const requested = new Set(videoIds);
      const filtered = new Map<string, FeedQuiz[]>();
      for (const [videoId, quizzes] of quizzesByVideoId) {
        if (requested.has(videoId)) {
          filtered.set(videoId, quizzes);
        }
      }
      return Promise.resolve(filtered);
    },
    getFeedQuizzesByIds: (ids: string[]) =>
      Promise.resolve(
        overrides.resolveQuizzesByIds
          ? overrides.resolveQuizzesByIds(ids)
          : ids.map((id) => allQuizzesById.get(id)).filter((q): q is FeedQuiz => !!q),
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
function quizIds(items: ({ type: "video"; video: PlayableVideo } | { type: "quiz"; quiz: FeedQuiz })[]): string[] {
  return items.filter((item): item is { type: "quiz"; quiz: FeedQuiz } => item.type === "quiz").map((item) => item.quiz.id);
}

describe("FeedService.getFeed — session start (cursor yok)", () => {
  it("ilk sayfa tam PAGE_SIZE (12) FeedItem döner, nextCursor non-null", async () => {
    const page = await makeFeedService().getFeed(TEST_USER_ID);

    expect(page.items).toHaveLength(12);
    expect(page.nextCursor).not.toBeNull();
  });

  it("4:1 video:quiz composition korunuyor (ilk sayfa) — Chunk 14", async () => {
    const page = await makeFeedService().getFeed(TEST_USER_ID);
    expect(itemTypes(page.items)).toEqual([
      "video", "video", "video", "video", "quiz",
      "video", "video", "video", "video", "quiz",
      "video", "video",
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

describe("FeedService.getFeed — quiz kaynak-eşleşmesi (Chunk 10, cadence Chunk 14'te 4:1'e güncellendi)", () => {
  it("bir video grubu için eşleşen quiz yoksa, quiz HİÇ gösterilmez (alakasız quiz interleave edilmez)", async () => {
    const videos = [makeVideo(1), makeVideo(2), makeVideo(3), makeVideo(4), makeVideo(5)];
    // Sadece v4 için bir quiz var — (v1-v4) grubu bunu bulur, v5 tek kalır (eksik grup).
    const quizzesByVideoId = new Map([[vId(4), [makeQuiz(1)]]]);
    const service = makeFeedService({ videos, quizzesByVideoId });

    const page = await service.getFeed(TEST_USER_ID);
    expect(itemTypes(page.items)).toEqual(["video", "video", "video", "video", "quiz", "video"]);
    expect(quizIds(page.items)).toEqual([qId(1)]);
  });

  it("bir grupta BİRDEN FAZLA videonun quiz'i varsa, grubun EN YENİSİ tercih edilir (geriye doğru arama en son eşleşende durur)", async () => {
    const videos = [makeVideo(1), makeVideo(2), makeVideo(3), makeVideo(4)];
    // v2 VE v4'te quiz var — grup (v1-v4) TEK bir quiz gösterir, en yeni eşleşen (v4).
    const quizzesByVideoId = new Map([
      [vId(2), [makeQuiz(1)]],
      [vId(4), [makeQuiz(2)]],
    ]);
    const service = makeFeedService({ videos, quizzesByVideoId });

    const page = await service.getFeed(TEST_USER_ID);
    expect(quizIds(page.items)).toEqual([qId(2)]);
  });

  it("grubun en yeni videolarının quiz'i yoksa, grup içinde daha ESKİ bir videonunki kullanılır (geriye doğru arama)", async () => {
    const videos = [makeVideo(1), makeVideo(2), makeVideo(3), makeVideo(4)];
    // SADECE grubun EN ESKİ (ilk) videosunda quiz var — v2/v3/v4'te yok.
    const quizzesByVideoId = new Map([[vId(1), [makeQuiz(1)]]]);
    const service = makeFeedService({ videos, quizzesByVideoId });

    const page = await service.getFeed(TEST_USER_ID);
    expect(quizIds(page.items)).toEqual([qId(1)]);
  });

  it("aynı quiz iki farklı gruba eşleşse bile, aynı feed üretiminde SADECE bir kez gösterilir", async () => {
    const videos = Array.from({ length: 8 }, (_, i) => makeVideo(i + 1)); // 2 tam grup: (v1-v4), (v5-v8)
    const sharedQuiz = makeQuiz(1);
    // Kurgusal ama savunmacı bir senaryo: aynı quiz objesi iki farklı grubun en yeni videosuna bağlı.
    const quizzesByVideoId = new Map([
      [vId(4), [sharedQuiz]],
      [vId(8), [sharedQuiz]],
    ]);
    const service = makeFeedService({ videos, quizzesByVideoId });

    const page = await service.getFeed(TEST_USER_ID);
    // İlk grup quiz'i "kullanır" (usedQuizIds), ikinci grubun TEK adayı da aynı
    // quiz olduğu için ikinci grup quiz'siz kalır — toplamda tek bir gösterim.
    expect(quizIds(page.items)).toEqual([qId(1)]);
  });

  it("QuizzesService.getQuizzesGroupedByVideoId, SADECE bu session'ın bounded video id'leriyle çağrılır", async () => {
    const calls: string[][] = [];
    const service = makeFeedService({ onGetQuizzesGroupedByVideoId: (ids) => calls.push(ids) });
    await service.getFeed(TEST_USER_ID);

    expect(calls).toHaveLength(1);
    expect(calls[0]).toHaveLength(27);
    expect(calls[0]?.[0]).toBe(vId(1));
    expect(calls[0]?.[26]).toBe(vId(27));
  });
});

describe("FeedService.getFeed — pagination continuation", () => {
  it("frozen sırayı koruyarak devam eder (3 sayfa, 33 item, exact bound — Chunk 14'te 4:1 cadence'e göre güncellendi)", async () => {
    const service = makeFeedService();

    const page1 = await service.getFeed(TEST_USER_ID);
    expect(itemTypes(page1.items)).toEqual([
      "video", "video", "video", "video", "quiz", "video", "video", "video", "video", "quiz", "video", "video",
    ]);
    expect(videoIds(page1.items)).toEqual([
      vId(1), vId(2), vId(3), vId(4), vId(5), vId(6), vId(7), vId(8), vId(9), vId(10),
    ]);

    const page2 = await service.getFeed(TEST_USER_ID, page1.nextCursor ?? undefined);
    expect(videoIds(page2.items)).toEqual([
      vId(11), vId(12), vId(13), vId(14), vId(15), vId(16), vId(17), vId(18), vId(19), vId(20),
    ]);

    const page3 = await service.getFeed(TEST_USER_ID, page2.nextCursor ?? undefined);
    expect(itemTypes(page3.items)).toEqual(["quiz", "video", "video", "video", "video", "quiz", "video", "video", "video"]);
    expect(videoIds(page3.items)).toEqual([vId(21), vId(22), vId(23), vId(24), vId(25), vId(26), vId(27)]);

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

    const service = makeFeedService({
      videos,
      quizzesByVideoId: new Map(),
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
    expect(videoIds(page.items)).toEqual([
      vId(1), vId(2), vId(3), vId(4), vId(5), vId(6), vId(7), vId(8), vId(9), vId(10),
    ]);
  });

  it("silinmiş bir frozen item sadece o slot'u atlıyor, diğer item'ların relative sırası bozulmuyor", async () => {
    const service = makeFeedService({
      resolveVideosByIds: (ids) => ids.filter((id) => id !== vId(2)).map((id) => ({ ...makeVideo(1), id })), // v2 "silinmiş"
    });

    const page = await service.getFeed(TEST_USER_ID);
    expect(videoIds(page.items)).toEqual([
      vId(1), vId(3), vId(4), vId(5), vId(6), vId(7), vId(8), vId(9), vId(10),
    ]);
    // İlk sayfa (12 ham slot): v1,v2,v3,v4,q1,v5,v6,v7,v8,q2,v9,v10 — v2 atlanınca
    // 11 item kalır, diğer TÜM item'ların (2 quiz dahil) relative sırası aynen korunur.
    expect(itemTypes(page.items)).toEqual([
      "video", "video", "video", "quiz", "video", "video", "video", "video", "quiz", "video", "video",
    ]);
  });

  it("bir ham sayfanın TAMAMI unavailable ise, next cursor RAW SLOT'a göre ilerliyor (resolve edilen item sayısına göre DEĞİL)", async () => {
    // İlk 12 ham slot'un (position 0-11: v1,v2,v3,v4,q1,v5,v6,v7,v8,q2,v9,v10) TÜM
    // ref'lerini "silinmiş" say — sayfa TAMAMEN boş resolve olmalı ki bridging tetiklensin.
    const deletedVideoIds = new Set([
      vId(1), vId(2), vId(3), vId(4), vId(5), vId(6), vId(7), vId(8), vId(9), vId(10),
    ]);
    const deletedQuizIds = new Set([qId(1), qId(2)]);
    const service = makeFeedService({
      resolveVideosByIds: (ids) => ids.filter((id) => !deletedVideoIds.has(id)).map((id) => ({ ...makeVideo(1), id })),
      resolveQuizzesByIds: (ids) => ids.filter((id) => !deletedQuizIds.has(id)).map((id) => ({ ...makeQuiz(1), id })),
    });

    const page = await service.getFeed(TEST_USER_ID);

    // Sunucu ilk (tamamen boş) dilimi atlayıp ikinci dilimden (position 12-23) döndü.
    expect(page.items.length).toBeGreaterThan(0);
    expect(videoIds(page.items)[0]).toBe(vId(11));

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
    expect(calls[0]?.videoIds).toEqual([
      vId(1), vId(2), vId(3), vId(4), vId(5), vId(6), vId(7), vId(8), vId(9), vId(10),
    ]);
  });

  it("mevcut 4:1 quiz cadence (Chunk 14) ve dedupe, vocabulary enrichment sonrası da regression olmadan korunuyor", async () => {
    const vocabularyByVideoId = new Map<string, VideoVocabularyItem[]>([[vId(1), [makeVocabularyItem(1, true)]]]);
    const service = makeFeedService({ vocabularyByVideoId });

    const page1 = await service.getFeed(TEST_USER_ID);
    expect(itemTypes(page1.items)).toEqual([
      "video", "video", "video", "video", "quiz", "video", "video", "video", "video", "quiz", "video", "video",
    ]);
    const page2 = await service.getFeed(TEST_USER_ID, page1.nextCursor ?? undefined);
    const allIds = [...videoIds(page1.items), ...videoIds(page2.items)];
    expect(new Set(allIds).size).toBe(allIds.length);
  });
});

describe("FeedService.getFeed — transcript segment enrichment (Chunk 10)", () => {
  function makeSegment(n: number): TranscriptSegment {
    return {
      id: uuidFor(5, n),
      ordinal: 1,
      startMs: 0,
      endMs: 1000,
      text: `segment-${n}`,
      englishExplanation: `en-${n}`,
      turkishExplanation: `tr-${n}`,
      learningPoints: [],
    };
  }

  it("her video'nun segments'i VideosService'ten gelen değerle dolduruluyor", async () => {
    const segmentsByVideoId = new Map<string, TranscriptSegment[]>([[vId(1), [makeSegment(1)]]]);
    const service = makeFeedService({ segmentsByVideoId });

    const page = await service.getFeed(TEST_USER_ID);
    const firstVideo = page.items[0];
    if (firstVideo?.type !== "video") {
      throw new Error("Test kurgusu bozuk");
    }
    expect(firstVideo.video.segments).toEqual([makeSegment(1)]);
  });

  it("segment'i olmayan bir video için boş dizi döner (undefined değil)", async () => {
    const service = makeFeedService({ segmentsByVideoId: new Map() });
    const page = await service.getFeed(TEST_USER_ID);
    const firstVideo = page.items[0];
    if (firstVideo?.type !== "video") {
      throw new Error("Test kurgusu bozuk");
    }
    expect(firstVideo.video.segments).toEqual([]);
  });

  it("segment lookup TEK bir batch çağrı — sayfadaki TÜM video id'leriyle (N+1 yok)", async () => {
    const calls: string[][] = [];
    const service = makeFeedService({ onGetSegmentsForVideos: (videoIds) => calls.push(videoIds) });

    await service.getFeed(TEST_USER_ID);

    expect(calls).toHaveLength(1);
    expect(calls[0]).toEqual([vId(1), vId(2), vId(3), vId(4), vId(5), vId(6), vId(7), vId(8), vId(9), vId(10)]);
  });
});
