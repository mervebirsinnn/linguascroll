import { createHmac } from "node:crypto";
import type { ContentCategory, FeedItem, FeedQuiz, PlayableVideo, TranscriptSegment, VideoVocabularyItem } from "@linguascroll/shared-types";
import { decodeFeedCursor } from "./feed-cursor";
import { FeedService } from "./feed.service";
import type { PersonalizationRepository } from "../personalization/personalization-repository";
import { PersonalizationService } from "../personalization/personalization.service";
import type { QuizzesService } from "../quizzes/quizzes.service";
import type { FreeVideoGrantsRepository } from "../subscriptions/free-video-grants-repository";
import type { RevenueCatClient } from "../subscriptions/revenue-cat-client";
import { SubscriptionsService } from "../subscriptions/subscriptions.service";
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
  /** `VideosService.getVideoFeed`'e geçirilen DB predicate'ini kaydeder (kapsam filtresinin repository'ye taşındığının kanıtı). */
  onGetVideoFeed?: (filter: { category?: ContentCategory }) => void;
  /** QuizzesService.getQuizzesGroupedByVideoId'nin gerçek DB davranışını simüle eder: sourceVideoId → quiz'ler. */
  quizzesByVideoId?: Map<string, FeedQuiz[]>;
  /** Gerçek DB batch-resolve'unu simüle eder: id sırasını KARIŞTIRABİLİR, bazı id'leri hiç DÖNDÜRMEYEBİLİR (silinmiş). */
  resolveVideosByIds?: (ids: string[]) => PlayableVideo[];
  resolveQuizzesByIds?: (ids: string[]) => FeedQuiz[];
  userExists?: boolean;
  /**
   * 2026-10-27 — ücretsiz hak (hesap başına toplam 10). Verilmezse sınırsız (abone / kapı kapalı
   * gibi — mevcut testler etkilenmez). Verilirse GERÇEK SubscriptionsService politikası, bellek-içi
   * bir defterle çalışır: `grantedVideoIds` = bu kullanıcının daha önce açtığı videolar.
   */
  freeQuota?: { grantedVideoIds: string[] };
  personalize?: (candidates: PlayableVideo[]) => PlayableVideo[];
  /** Gerçek PersonalizationService (cold-start, boş affinity) kullanılır: seed'li sıralamanın uçtan uca testi için. */
  realPersonalization?: boolean;
  /** `false`: getFeed'e otomatik varsayılan sessionSeed EKLENMEZ (seed-zorunluluğu testleri için). */
  autoSeed?: boolean;
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

const DEFAULT_TEST_SEED = "00000000000000000000000000000001";

function makeFeedService(overrides: ServiceOverrides = {}): FeedService {
  const videos = overrides.videos ?? makeFullSessionVideos();
  const quizzesByVideoId = overrides.quizzesByVideoId ?? makeFullSessionQuizzesByVideoId();
  const videoById = new Map(videos.map((v) => [v.id, v]));
  const allQuizzesById = new Map(Array.from(quizzesByVideoId.values()).flat().map((q) => [q.id, q]));

  const videosService = {
    // Gerçek repository davranışını simüle eder: `category` predicate'i varsa SADECE eşleşen satırlar döner
    // (kapsam dışı satırlar application katmanına hiç gelmez); yoksa hepsi.
    getVideoFeed: (filter: { category?: ContentCategory } = {}) => {
      overrides.onGetVideoFeed?.(filter);
      return Promise.resolve(videos.filter((video) => !filter.category || (video.category ?? "general") === filter.category));
    },
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

  const personalizationService = overrides.realPersonalization
    ? new PersonalizationService({ getTopicAffinity: () => Promise.resolve(new Map()) } as unknown as PersonalizationRepository)
    : ({
        getPersonalizedVideos: (_userId: string, candidates: PlayableVideo[]) =>
          Promise.resolve(overrides.personalize ? overrides.personalize(candidates) : candidates),
      } as unknown as PersonalizationService);

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

  const subscriptionsService = overrides.freeQuota
    ? makeQuotaSubscriptionsService(overrides.freeQuota.grantedVideoIds, usersService, videosService)
    : ({ getFeedAllowance: () => Promise.resolve({ unlimited: true }) } as unknown as SubscriptionsService);

  const service = new FeedService(videosService, quizzesService, personalizationService, usersService, wordsService, subscriptionsService, configService);
  if (overrides.autoSeed === false) {
    return service;
  }
  // Mevcut testlerin çoğu seed'le ilgilenmez: cursor'suz çağrılara varsayılan bir seed eklenir
  // (cursor'lu çağrılara DOKUNULMAZ — seed cursor'dan okunur).
  const originalGetFeed = service.getFeed.bind(service);
  service.getFeed = (userId, cursor, preference, scope, sessionSeed, continuous) =>
    originalGetFeed(userId, cursor, preference, scope, sessionSeed ?? (cursor ? undefined : DEFAULT_TEST_SEED), continuous);
  return service;
}

function makeQuotaSubscriptionsService(grantedVideoIds: string[], usersService: UsersService, videosService: VideosService): SubscriptionsService {
  const granted = new Set(grantedVideoIds);
  const repository = {
    getOrCreatePreview: async (_userId: string, _scope: string, candidates: string[]) => new Set(candidates.slice(0, 10)),
    getUsage: (_userId: string, candidates: readonly string[]) =>
      Promise.resolve({ consumed: granted.size, grantedVideoIds: new Set(candidates.filter((id) => granted.has(id))) }),
  } as unknown as FreeVideoGrantsRepository;
  const revenueCatClient = { checkEntitlement: () => Promise.resolve(false) } as unknown as RevenueCatClient;
  const config = { get: (key: string) => (key === "SUBSCRIPTION_GATE_ENABLED" ? "true" : undefined) } as unknown as import("@nestjs/config").ConfigService;
  return new SubscriptionsService(videosService, usersService, repository, revenueCatClient, config);
}

function itemTypes(items: { type: string }[]): string[] {
  return items.map((item) => item.type);
}
// 2026-10-01 — `FeedItem`'ın kendisi kullanılıyor (manuel re-declare DEĞİL):
// `paywall` gibi gelecekteki yeni bir üye burada otomatik olarak kapsanır,
// bu iki filtre fonksiyonu her yeni variant'ta elle güncellenmek zorunda kalmaz.
function videoIds(items: FeedItem[]): string[] {
  return items.filter((item): item is Extract<FeedItem, { type: "video" }> => item.type === "video").map((item) => item.video.id);
}
function quizIds(items: FeedItem[]): string[] {
  return items.filter((item): item is Extract<FeedItem, { type: "quiz" }> => item.type === "quiz").map((item) => item.quiz.id);
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

/**
 * Gerçek cihaz smoke test'inde bildirilen şüphe: "quiz kartları hemen önce
 * izlenen videoyla ilgisiz görünüyor". Bu describe bloğu, o şüphenin bir
 * PLACEMENT bug'ı (quiz, henüz izlenmemiş/session'da hiç olmayan bir videoyu
 * test ediyor) mi yoksa değil mi olduğunu KOD SEVİYESİNDE, deterministik
 * olarak sabitliyor — quiz.sourceTranscriptSegmentId → segment → video
 * ilişkisi `QuizzesRepository.findQuizzesForVideos`'un video_id JOIN'i
 * üzerinden kurulur (bkz. quizzes-repository.ts) ve `quizzesByVideoId`'nin
 * KEY'i zaten bu gerçek ilişkinin production'daki TEK doğruluk kaynağı — bu
 * yüzden test fixture'ında "quiz X, video Y'den geliyor" bilgisini AYNI Map'in
 * yapısından (`quizzesByVideoId`) okumak, gerçek repository'nin davranışını
 * simüle etmenin doğru yolu (bkz. makeFeedService'in `quizzesByVideoId` stub'ı).
 *
 * Sonuç (bu suite yazılırken doğrulandı, ayrıca gerçek Postgres verisiyle de
 * elle çapraz kontrol edildi): mevcut kod bu invariant'ı ZATEN sağlıyor — bir
 * placement bug'ı YOK. Bu testler regression'a karşı bunu SABİTLİYOR.
 */
describe("FeedService.getFeed — quiz placement invariant (video → segment → quiz → feed plan)", () => {
  type FlatItem = { type: "video" | "quiz"; id: string };

  async function collectFullSession(service: FeedService, userId: string): Promise<FlatItem[]> {
    const flat: FlatItem[] = [];
    let cursor: string | undefined;
    for (;;) {
      const page = await service.getFeed(userId, cursor);
      for (const item of page.items) {
        // Bu describe bloğundaki testler hiç `freeQuota` vermiyor (varsayılan
        // sınırsız) — bir paywall item'ı burada ASLA görünmemeli, görünürse test
        // kurgusu bozuk demektir.
        if (item.type === "paywall") {
          throw new Error("Test kurgusu bozuk: bu suite'te paywall item'ı beklenmiyor");
        }
        flat.push(item.type === "video" ? { type: "video", id: item.video.id } : { type: "quiz", id: item.quiz.id });
      }
      if (!page.nextCursor) {
        break;
      }
      cursor = page.nextCursor;
    }
    return flat;
  }

  /**
   * `quizzesByVideoId`'nin KENDİSİ zaten "quiz X, video Y'den geliyor"
   * bilgisinin production'daki JOIN'ini simüle ediyor (bkz. yukarıdaki
   * describe yorumu) — bu yüzden ters çevirip quizId → sourceVideoId'ye
   * indirgemek, testin "beklenen" tarafı için gerçek veriyi TEKRAR ÜRETMEK
   * değil, aynı fixture'dan OKUMAK.
   */
  function invertToSourceVideoIdByQuizId(quizzesByVideoId: Map<string, FeedQuiz[]>): Map<string, string> {
    const bySourceVideo = new Map<string, string>();
    for (const [videoId, quizzes] of quizzesByVideoId) {
      for (const quiz of quizzes) {
        bySourceVideo.set(quiz.id, videoId);
      }
    }
    return bySourceVideo;
  }

  it("madde 1-4: HER quiz'in kaynak videosu, aynı frozen session'da o quiz'den ÖNCE görünmüş olmalı", async () => {
    const quizzesByVideoId = makeFullSessionQuizzesByVideoId();
    const service = makeFeedService({ quizzesByVideoId });
    const flat = await collectFullSession(service, TEST_USER_ID);
    const sourceVideoIdByQuizId = invertToSourceVideoIdByQuizId(quizzesByVideoId);

    // Sanity — bu test gerçekten en az bir quiz içermiyorsa aşağıdaki döngü
    // hiçbir şey doğrulamamış olur, bu da testi anlamsız kılar.
    expect(flat.filter((item) => item.type === "quiz")).not.toHaveLength(0);

    const seenVideoIds = new Set<string>();
    for (const item of flat) {
      if (item.type === "video") {
        seenVideoIds.add(item.id);
        continue;
      }
      const sourceVideoId = sourceVideoIdByQuizId.get(item.id);
      // Madde 4 (zayıf hali): quiz'in kaynağı bu test fixture'ında TANIMLI olmalı —
      // tanımsızsa bu, "session'da hiç olmayan bir videoyu test eden quiz" durumunun
      // ta kendisi olurdu.
      expect(sourceVideoId).toBeDefined();
      // Madde 3: kaynak video, bu quiz'e gelene kadar ZATEN görülmüş (session'ın
      // BAŞINDAN BU quiz'in pozisyonuna kadar flatten edilmiş listede mevcut).
      expect(seenVideoIds.has(sourceVideoId as string)).toBe(true);
    }
  });

  it("madde 5-6: bir grup TAMAMLANMADAN (VIDEOS_PER_QUIZ videoya ulaşmadan) hiçbir quiz emit edilmez — quiz her zaman kaynağından SONRA gelir", async () => {
    // Sadece grubun SON videosunda (v4) bir quiz var — bu quiz, grup
    // tamamlanana (v1..v4 hepsi emit edilene) kadar asla erken çıkmamalı.
    const videos = [makeVideo(1), makeVideo(2), makeVideo(3), makeVideo(4), makeVideo(5)];
    const quizzesByVideoId = new Map([[vId(4), [makeQuiz(1)]]]);
    const service = makeFeedService({ videos, quizzesByVideoId });

    const flat = await collectFullSession(service, TEST_USER_ID);
    const quizIndex = flat.findIndex((item) => item.type === "quiz");
    const sourceVideoIndex = flat.findIndex((item) => item.type === "video" && item.id === vId(4));

    expect(quizIndex).toBeGreaterThan(-1);
    expect(sourceVideoIndex).toBeGreaterThan(-1);
    expect(quizIndex).toBeGreaterThan(sourceVideoIndex);
  });

  it("madde 4: session bound'unun (MAX_SESSION_VIDEOS) DIŞINDA kalan bir video için quiz sorgusu asla yapılmaz", async () => {
    // 30 video verilse de sadece ilk 27'si session'a dahil (bkz. MAX_SESSION_VIDEOS) —
    // v28/v29/v30, QuizzesService.getQuizzesGroupedByVideoId'ye giden id listesinde
    // hiç YER ALMAMALI, aksi halde bu videoların (session'da hiç görünmeyen)
    // quiz'lerinin yanlışlıkla eşleşme ihtimali doğardı.
    const calls: string[][] = [];
    const service = makeFeedService({ onGetQuizzesGroupedByVideoId: (ids) => calls.push(ids) });
    await collectFullSession(service, TEST_USER_ID);

    expect(calls).toHaveLength(1);
    expect(calls[0]).not.toContain(vId(28));
    expect(calls[0]).not.toContain(vId(29));
    expect(calls[0]).not.toContain(vId(30));
  });
});



describe("Feed ücretsiz seçki — her akışta sabit 10 video", () => {
  it("önceki tüketimden bağımsız tam 10 video ve ardından Premium döner", async () => {
    const service = makeFeedService({ freeQuota: { grantedVideoIds: ["old1", "old2", "old3"] } });
    const first = await service.getFeed(TEST_USER_ID);
    const rest = first.nextCursor ? await service.getFeed(TEST_USER_ID, first.nextCursor) : { items: [], nextCursor: null };
    const items = [...first.items, ...rest.items];
    expect(videoIds(items)).toHaveLength(10);
    expect(items[items.length - 1]).toEqual({ type: "paywall" });
    expect(rest.nextCursor).toBeNull();
    expect(videoIds((await service.getFeed(TEST_USER_ID)).items)).toEqual(videoIds(first.items));
    expect(items.filter((i) => i.type === "video").every((i) => i.video.playbackUrl !== null)).toBe(true);
  });

  it("her sekme kendi kategorisinden ayrı 10 video sunar", async () => {
    const videos = Array.from({length: 15}, (_, i) => [
      {...makeVideo(i + 1), category: "animation" as const},
      {...makeVideo(i + 101), category: "ielts" as const},
    ]).flat();
    const service = makeFeedService({ videos, freeQuota: {grantedVideoIds: []}, quizzesByVideoId: new Map() });
    for (const scope of ["all", "animation", "ielts"] as const) {
      const page = await service.getFeed(TEST_USER_ID, undefined, undefined, scope);
      expect(videoIds(page.items)).toHaveLength(10);
      expect(page.items.at(-1)).toEqual({type: "paywall"});
      if(scope !== "all") expect(page.items.filter((i) => i.type === "video").every((i) => i.video.category === scope)).toBe(true);
    }
  });
});

describe("Feed kapsamı (scope): all | animation | ielts", () => {
  // `cefrLevel` kategoriden bağımsız: fixture'lar bilerek farklı gerçek seviyeler taşıyor.
  const general = (n: number): PlayableVideo => makeVideo(n);
  const animation = (n: number): PlayableVideo => ({ ...makeVideo(n), category: "animation" });
  const ielts = (n: number, cefrLevel: PlayableVideo["cefrLevel"] = "C1"): PlayableVideo => ({ ...makeVideo(n), category: "ielts", cefrLevel });
  const noQuizzes = { quizzesByVideoId: new Map<string, FeedQuiz[]>() };
  const mixed = [general(1), animation(2), ielts(3), general(4), animation(5), ielts(6)];
  // id'ler kategoriler arasında İÇ İÇE geçer (3i+1/2/3): ranking aynı topic içinde id sırasıyla ilerlediği
  // için ardışık id blokları, session sınırı (27 video) yüzünden son kategoriyi tamamen dışarıda bırakırdı —
  // bu bir fixture artifact'ıdır (üretimde id'ler rastgele UUID), ürün davranışı değil.
  const bigCatalog = Array.from({ length: 16 }, (_, i) => [general(3 * i + 1), animation(3 * i + 2), ielts(3 * i + 3)]).flat();

  it("scope verilmezse ve all'da: general + animation + ielts HEPSİ gelir (Akış bütün kategorileri gösterir)", async () => {
    const service = makeFeedService({ videos: mixed, ...noQuizzes });
    const byDefault = videoIds((await service.getFeed(TEST_USER_ID)).items).sort();
    const explicitAll = videoIds((await service.getFeed(TEST_USER_ID, undefined, undefined, "all")).items).sort();
    expect(byDefault).toEqual(mixed.map((v) => v.id).sort());
    expect(explicitAll).toEqual(byDefault);
  });

  it("animation yalnızca animasyon, ielts yalnızca IELTS getirir; kategori sızmaz", async () => {
    const service = makeFeedService({ videos: mixed, ...noQuizzes });
    expect(videoIds((await service.getFeed(TEST_USER_ID, undefined, undefined, "animation")).items).sort()).toEqual([vId(2), vId(5)]);
    expect(videoIds((await service.getFeed(TEST_USER_ID, undefined, undefined, "ielts")).items).sort()).toEqual([vId(3), vId(6)]);
  });

  it("kapsam filtresi REPOSITORY'ye taşınır: all için predicate YOK, animation/ielts için DB predicate'i var", async () => {
    const filters: { category?: ContentCategory }[] = [];
    const service = makeFeedService({ videos: mixed, ...noQuizzes, onGetVideoFeed: (filter) => filters.push(filter) });
    await service.getFeed(TEST_USER_ID);
    await service.getFeed(TEST_USER_ID, undefined, undefined, "animation");
    await service.getFeed(TEST_USER_ID, undefined, undefined, "ielts");
    expect(filters).toEqual([{ category: undefined }, { category: "animation" }, { category: "ielts" }]);
  });

  it("personalization'a kapsam dışı aday HİÇ verilmez (animation kapsamında adaylar sadece animasyon)", async () => {
    let received: PlayableVideo[] = [];
    const service = makeFeedService({
      videos: mixed,
      ...noQuizzes,
      personalize: (candidates) => {
        received = candidates;
        return candidates;
      },
    });
    await service.getFeed(TEST_USER_ID, undefined, undefined, "animation");
    expect(received.map((v) => v.id).sort()).toEqual([vId(2), vId(5)]);
  });

  it("level tercihi bir FİLTRE değil sıralama sinyalidir: ielts kapsamında kategori dışı sızdırmaz, seviye yüzünden de elemez; gerçek cefrLevel korunur", async () => {
    const service = makeFeedService({ videos: [ielts(1, "C2"), ielts(2, "B1"), ielts(3, "A2"), general(4)], ...noQuizzes });
    const page = await service.getFeed(TEST_USER_ID, undefined, { level: "B1", topics: [] }, "ielts");
    expect(videoIds(page.items).sort()).toEqual([vId(1), vId(2), vId(3)]);
    expect(page.items.flatMap((item) => (item.type === "video" ? [item.video.cefrLevel] : [])).sort()).toEqual(["A2", "B1", "C2"]);
  });

  it.each(["animation", "ielts"] as const)("%s sayfalaması duplicate/skip üretmez, kategori sızdırmaz; cursor scope taşır", async (scope) => {
    const service = makeFeedService({ videos: bigCatalog, ...noQuizzes });
    const first = await service.getFeed(TEST_USER_ID, undefined, undefined, scope);
    expect(first.nextCursor).not.toBeNull();
    expect(decodeFeedCursor(first.nextCursor!, CURSOR_SECRET).scope).toBe(scope);
    const second = await service.getFeed(TEST_USER_ID, first.nextCursor!, undefined, scope);
    const seen = videoIds([...first.items, ...second.items]);
    expect(new Set(seen).size).toBe(seen.length);
    expect([...seen].sort()).toEqual(bigCatalog.filter((v) => v.category === scope).map((v) => v.id).sort());
  });

  it("all sayfalaması duplicate/skip üretmez ve oturum üç kategoriden de içerik barındırabilir", async () => {
    const service = makeFeedService({ videos: bigCatalog, ...noQuizzes });
    const first = await service.getFeed(TEST_USER_ID, undefined, undefined, "all");
    expect(decodeFeedCursor(first.nextCursor!, CURSOR_SECRET).scope).toBe("all");
    const second = await service.getFeed(TEST_USER_ID, first.nextCursor!, undefined, "all");
    const seen = videoIds([...first.items, ...second.items]);
    expect(new Set(seen).size).toBe(seen.length);
    const categoryById = new Map(bigCatalog.map((v) => [v.id, v.category ?? "general"]));
    expect(new Set(seen.map((id) => categoryById.get(id))).size).toBe(3);
  });

  it.each([
    ["all", "animation"],
    ["all", "ielts"],
    ["animation", "all"],
    ["ielts", "all"],
    ["animation", "ielts"],
    ["ielts", "animation"],
  ] as const)("%s scope'unda üretilmiş cursor %s isteğinde 400 ile reddedilir", async (issuedFor, requested) => {
    const service = makeFeedService({ videos: bigCatalog, ...noQuizzes });
    const first = await service.getFeed(TEST_USER_ID, undefined, undefined, issuedFor);
    await expect(service.getFeed(TEST_USER_ID, first.nextCursor!, undefined, requested)).rejects.toThrow("feed kapsamına ait değil");
  });

  it("eski (v1) bir cursor kontrollü 400 üretir, 500 değil", async () => {
    const service = makeFeedService({ videos: mixed, ...noQuizzes });
    const legacy = { v: 1, userId: TEST_USER_ID, category: "animation", plan: [], position: 0 };
    const b64 = Buffer.from(JSON.stringify(legacy), "utf-8").toString("base64url");
    const signature = createHmac("sha256", CURSOR_SECRET).update(b64).digest("base64url");
    await expect(service.getFeed(TEST_USER_ID, `${b64}.${signature}`, undefined, "animation")).rejects.toThrow("Geçersiz veya bozulmuş feed cursor'ı");
  });
});

describe("FeedService.getFeed — session-scoped shuffle (sessionSeed, cursor v3)", () => {
  const SEED_A = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
  const SEED_B = "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";
  // 30 video, hepsi aynı topic + aynı CEFR → hepsi "eşit öncelikli": sıra tamamen seed'e bağlı.
  const videos = Array.from({ length: 30 }, (_, i) => makeVideo(i + 1));
  const noQuizzes = { quizzesByVideoId: new Map<string, FeedQuiz[]>() };
  const seeded = () => makeFeedService({ videos, ...noQuizzes, realPersonalization: true, autoSeed: false });

  async function allPages(service: FeedService, seed: string): Promise<string[][]> {
    const pages: string[][] = [];
    let page = await service.getFeed(TEST_USER_ID, undefined, undefined, "all", seed);
    for (;;) {
      pages.push(videoIds(page.items));
      if (!page.nextCursor) return pages;
      page = await service.getFeed(TEST_USER_ID, page.nextCursor, undefined, "all");
    }
  }

  it("seed'siz cursor'suz (eski client) istek 200 döner; sunucu seed'i üretip v3 cursor'a yazar; her seed'siz istek yeni seed alır (retry sırası garanti DEĞİL)", async () => {
    const service = seeded();
    const a = await service.getFeed(TEST_USER_ID);
    const b = await service.getFeed(TEST_USER_ID);
    const payloadA = decodeFeedCursor(a.nextCursor!, CURSOR_SECRET);
    const payloadB = decodeFeedCursor(b.nextCursor!, CURSOR_SECRET);
    expect(payloadA.v).toBe(3);
    expect((payloadA as { sessionSeed: string }).sessionSeed).toMatch(/^[0-9a-f]{32}$/);
    // Dökümante edilmiş davranış: seed'siz isteklerin aynı sırayı vereceği GARANTİ EDİLMEZ (her istek yeni sunucu seed'i).
    expect((payloadB as { sessionSeed: string }).sessionSeed).not.toBe((payloadA as { sessionSeed: string }).sessionSeed);
  });

  it("eski client: sunucu seed'li v3 cursor ile ikinci/üçüncü sayfaya devam edebilir; duplicate/skip yok", async () => {
    const service = seeded();
    const seen: string[] = [];
    let page = await service.getFeed(TEST_USER_ID); // seed YOK
    for (;;) {
      seen.push(...videoIds(page.items));
      if (!page.nextCursor) break;
      page = await service.getFeed(TEST_USER_ID, page.nextCursor); // eski client yalnızca cursor gönderir
    }
    expect(seen).toHaveLength(27);
    expect(new Set(seen).size).toBe(27);
  });

  it("yeni client'ın seed'i korunur: cursor'daki seed gönderilen seed'dir", async () => {
    const page = await seeded().getFeed(TEST_USER_ID, undefined, undefined, "all", SEED_A);
    expect((decodeFeedCursor(page.nextCursor!, CURSOR_SECRET) as { sessionSeed: string }).sessionSeed).toBe(SEED_A);
  });

  it("aynı seed → aynı plan; retry aynı ilk sayfayı döndürür", async () => {
    const service = seeded();
    const first = await service.getFeed(TEST_USER_ID, undefined, undefined, "all", SEED_A);
    const retry = await service.getFeed(TEST_USER_ID, undefined, undefined, "all", SEED_A);
    expect(videoIds(retry.items)).toEqual(videoIds(first.items));
    expect(await allPages(service, SEED_A)).toEqual(await allPages(service, SEED_A));
  });

  it("farklı seed → (eşit öncelikli yeterli aday varken) farklı sıra; aynı sıra id sırasından da farklı", async () => {
    const service = seeded();
    const a = (await allPages(service, SEED_A)).flat();
    const b = (await allPages(service, SEED_B)).flat();
    expect(a).not.toEqual(b);
    expect(a).not.toEqual([...a].sort());
  });

  it("seed'li iki+ sayfa duplicate/skip üretmez: plan 27 video, sayfalar birleşince tam plan", async () => {
    const pages = await allPages(seeded(), SEED_A);
    const seen = pages.flat();
    expect(seen).toHaveLength(27);
    expect(new Set(seen).size).toBe(27);
  });

  it("devam sayfalarında ranking yeniden hesaplanmaz: personalization yalnızca cursor'suz istekte çağrılır", async () => {
    let calls = 0;
    const service = makeFeedService({ videos, ...noQuizzes, autoSeed: false, personalize: (c) => (calls++, c) });
    const first = await service.getFeed(TEST_USER_ID, undefined, undefined, "all", SEED_A);
    await service.getFeed(TEST_USER_ID, first.nextCursor!, undefined, "all");
    expect(calls).toBe(1);
  });

  it("nextCursor imzalı v3 payload'ında seed'i ve scope'u taşır", async () => {
    const page = await seeded().getFeed(TEST_USER_ID, undefined, undefined, "all", SEED_A);
    const payload = decodeFeedCursor(page.nextCursor!, CURSOR_SECRET);
    expect(payload).toMatchObject({ v: 3, userId: TEST_USER_ID, scope: "all", sessionSeed: SEED_A });
  });

  it("cursor + aynı seed (query) kabul edilir; query'de seed yoksa cursor'daki kullanılır; FARKLI seed → 400", async () => {
    const service = seeded();
    const first = await service.getFeed(TEST_USER_ID, undefined, undefined, "all", SEED_A);
    expect((decodeFeedCursor(first.nextCursor!, CURSOR_SECRET) as { sessionSeed: string }).sessionSeed).toBe(SEED_A);

    const sameSeed = await service.getFeed(TEST_USER_ID, first.nextCursor!, undefined, "all", SEED_A);
    const noSeed = await service.getFeed(TEST_USER_ID, first.nextCursor!, undefined, "all");
    expect(videoIds(sameSeed.items)).toEqual(videoIds(noSeed.items));
    await expect(service.getFeed(TEST_USER_ID, first.nextCursor!, undefined, "all", SEED_B)).rejects.toThrow("sessionSeed");
  });

  it("farklı scope + cursor → 400", async () => {
    const service = seeded();
    const first = await service.getFeed(TEST_USER_ID, undefined, undefined, "all", SEED_A);
    await expect(service.getFeed(TEST_USER_ID, first.nextCursor!, undefined, "ielts")).rejects.toThrow("kapsamına");
  });
});

describe("FeedService.getFeed — @deprecated v2 cursor rollout uyumluluğu", () => {
  const videos = Array.from({ length: 30 }, (_, i) => makeVideo(i + 1));
  const noQuizzes = { quizzesByVideoId: new Map<string, FeedQuiz[]>() };
  const sign = (payload: unknown): string => {
    const b64 = Buffer.from(JSON.stringify(payload), "utf-8").toString("base64url");
    return `${b64}.${createHmac("sha256", CURSOR_SECRET).update(b64).digest("base64url")}`;
  };

  /** v3 session'dan donmuş planı alıp v2 (seed'siz) cursor'a çevirir — eski API'nin ürettiği şekil. */
  async function makeV2Cursor(service: FeedService, position: number, overrides: Record<string, unknown> = {}): Promise<{ cursor: string; v3Next: string }> {
    const first = await service.getFeed(TEST_USER_ID, undefined, undefined, "all", "a".repeat(32));
    const v3 = decodeFeedCursor(first.nextCursor!, CURSOR_SECRET);
    const cursor = sign({ v: 2, userId: TEST_USER_ID, scope: "all", plan: v3.plan, position, ...overrides });
    return { cursor, v3Next: first.nextCursor! };
  }

  it("geçerli v2 cursor continuation başarılı: aynı frozen plan, v3 continuation ile BİREBİR aynı sayfa", async () => {
    const service = makeFeedService({ videos, ...noQuizzes, realPersonalization: true, autoSeed: false });
    const { cursor, v3Next } = await makeV2Cursor(service, 12);
    const viaV2 = await service.getFeed(TEST_USER_ID, cursor, undefined, "all");
    const viaV3 = await service.getFeed(TEST_USER_ID, v3Next, undefined, "all");
    expect(videoIds(viaV2.items)).toEqual(videoIds(viaV3.items));
    expect(viaV2.items.length).toBeGreaterThan(0);
  });

  it("v2 continuation ranking'i/shuffle'ı HİÇ çağırmaz ve sonraki cursor v2 kalır (sahte seed uydurulmaz); son sayfada null", async () => {
    let rankCalls = 0;
    const service = makeFeedService({ videos, ...noQuizzes, autoSeed: false, personalize: (c) => (rankCalls++, c) });
    const { cursor } = await makeV2Cursor(service, 12);
    expect(rankCalls).toBe(1); // yalnızca v2 cursor'ı üretmek için açılan v3 session'ı
    const second = await service.getFeed(TEST_USER_ID, cursor, undefined, "all");
    expect(rankCalls).toBe(1);
    const next = decodeFeedCursor(second.nextCursor!, CURSOR_SECRET);
    expect(next.v).toBe(2);
    expect(next.position).toBe(24);
    const third = await service.getFeed(TEST_USER_ID, second.nextCursor!, undefined, "all");
    expect(rankCalls).toBe(1);
    expect(third.nextCursor).toBeNull();
  });

  it("v2 ile query'deki sessionSeed yok sayılır (v2 yeni shuffle'a açılamaz) ve YENİ session başlatılamaz: cursor'suz istek her zaman v3 üretir", async () => {
    const service = makeFeedService({ videos, ...noQuizzes, realPersonalization: true, autoSeed: false });
    const { cursor } = await makeV2Cursor(service, 12);
    const withSeed = await service.getFeed(TEST_USER_ID, cursor, undefined, "all", "b".repeat(32));
    expect(decodeFeedCursor(withSeed.nextCursor!, CURSOR_SECRET).v).toBe(2);
    const fresh = await service.getFeed(TEST_USER_ID);
    expect(decodeFeedCursor(fresh.nextCursor!, CURSOR_SECRET).v).toBe(3);
  });

  it("bozuk v2 imza → 400; farklı user'ın v2 cursor'ı → 400; farklı scope'taki v2 cursor → 400", async () => {
    const service = makeFeedService({ videos, ...noQuizzes, realPersonalization: true, autoSeed: false });
    const { cursor } = await makeV2Cursor(service, 12);
    const [b64, signature] = cursor.split(".");
    await expect(service.getFeed(TEST_USER_ID, `${b64}.${(signature as string).slice(2)}zz`, undefined, "all")).rejects.toThrow("Geçersiz veya bozulmuş feed cursor'ı");
    await expect(service.getFeed(OTHER_USER_ID, cursor, undefined, "all")).rejects.toThrow("Cursor, bu userId'ye ait değil");
    await expect(service.getFeed(TEST_USER_ID, cursor, undefined, "ielts")).rejects.toThrow("kapsamına");
  });

  it("v2 payload'ı sessionSeed taşıyorsa (v2 etiketli ama seed'li) reddedilir", async () => {
    const service = makeFeedService({ videos, ...noQuizzes, realPersonalization: true, autoSeed: false });
    const { cursor } = await makeV2Cursor(service, 12, { sessionSeed: "a".repeat(32) });
    await expect(service.getFeed(TEST_USER_ID, cursor, undefined, "all")).rejects.toThrow("Geçersiz veya bozulmuş feed cursor'ı");
  });
});


describe("Premium kesintisiz akış", () => {
  it("27 video sınırında bitmez; sonraki partiler bütün katalogdan devam eder", async () => {
    const catalog = Array.from({length: 70}, (_, i) => makeVideo(i + 1, i < 27 ? "travel" : "career"));
    const service = makeFeedService({videos: catalog, quizzesByVideoId: new Map()});
    let page = await service.getFeed(TEST_USER_ID, undefined, {level: "B1", topics: ["travel", "career", "dating", "humor"]}, "all", DEFAULT_TEST_SEED, true);
    const ids = new Set<string>();
    for(let n=0; n<12; n++) {
      expect(page.items.length).toBeGreaterThan(0); expect(page.nextCursor).not.toBeNull();
      for(const id of videoIds(page.items)) ids.add(id);
      const sameRequest = await service.getFeed(TEST_USER_ID, page.nextCursor!);
      expect(sameRequest).toEqual(await service.getFeed(TEST_USER_ID, page.nextCursor!));
      page = sameRequest;
    }
    expect(ids.size).toBe(70);
    expect(page.items.some((i) => i.type === "paywall")).toBe(false);
  });

  it("kategori bittiğinde diğer kategorilere geçer; boş kategoriden de içerik bulur", async () => {
    const catalog = [ {...makeVideo(1), category: "ielts" as const}, {...makeVideo(2), category: "general" as const} ];
    const service = makeFeedService({videos:catalog, quizzesByVideoId:new Map()});
    const first = await service.getFeed(TEST_USER_ID, undefined, undefined, "ielts", DEFAULT_TEST_SEED, true);
    expect(videoIds(first.items)).toEqual([vId(1)]);
    const next = await service.getFeed(TEST_USER_ID, first.nextCursor!, undefined, "ielts");
    expect(videoIds(next.items)).toEqual([vId(2)]); expect(next.nextCursor).not.toBeNull();
    const emptyCategory = await service.getFeed(TEST_USER_ID, undefined, undefined, "animation", DEFAULT_TEST_SEED, true);
    expect(videoIds(emptyCategory.items)).toHaveLength(2); expect(emptyCategory.nextCursor).not.toBeNull();
  });

  it("kategori 27'den büyükse kategori bitene kadar başka kategoriye geçmez", async () => {
    const catalog = [...Array.from({length:60},(_,i)=>({...makeVideo(i+1),category:"ielts" as const})), {...makeVideo(99),category:"general" as const}];
    const service = makeFeedService({videos:catalog,quizzesByVideoId:new Map()});
    let page = await service.getFeed(TEST_USER_ID,undefined,undefined,"ielts",DEFAULT_TEST_SEED,true);
    const ids: string[] = [];
    while(ids.length<60) {
      expect(page.items.every((i)=>i.type !== "video" || i.video.category === "ielts")).toBe(true);
      ids.push(...videoIds(page.items));
      page = await service.getFeed(TEST_USER_ID,page.nextCursor!,undefined,"ielts");
    }
    expect(new Set(ids).size).toBe(60);
    expect(page.items.some((i)=>i.type === "video" && i.video.category === "general")).toBe(true);
  });

  it("continuous istemek ücretsiz kullanıcıya sınırsız erişim açmaz", async () => {
    const service = makeFeedService({freeQuota:{grantedVideoIds:[]}});
    const first = await service.getFeed(TEST_USER_ID, undefined, undefined, "all", DEFAULT_TEST_SEED, true);
    expect(first.nextCursor).toBeNull();
    expect(videoIds(first.items)).toHaveLength(10);
    expect(first.items.at(-1)).toEqual({type:"paywall"});
  });
});
