import { Injectable } from "@nestjs/common";
import type { FeedPreferences, FeedScope, PlayableVideo } from "@linguascroll/shared-types";
import { PersonalizationRepository } from "./personalization-repository";
import { deterministicTieBreak } from "./deterministic-tie-break";
import { applyTieBreakOrdering, prioritizeUnwatched, rankVideos } from "./personalization-ranking";

/**
 * Cold-start (izleme geçmişi olmayan) kullanıcılar için `rankVideos` sonucu
 * bu sürede (ms) önbellekte tutulur. 2026-09-30 — gerçek k6 yük testinde
 * bulunan bir performans sorunundan: `startSession` HER yeni feed session'ında
 * (her k6 VU-iterasyonu = 1 session) tam kataloğu Node'un TEK thread'inde
 * senkron olarak sıralıyordu; 250+ eşzamanlı kullanıcıda bu, DB bağlantı
 * havuzunu büyütmenin hiç ÇÖZMEDİĞİ (ayrıca doğrulandı) bir event-loop
 * doygunluğuna yol açıyordu. 5 dakika, yeni yayınlanan içeriğin cold-start
 * sıralamasına yansıma gecikmesi ile önbellek isabet oranı arasında bilinçli
 * bir denge — kesin bir invalidate-on-publish mekanizması (yayın script'leri
 * API process'inin DIŞINDan, doğrudan Postgres'e yazıyor, bkz. publish-content.ts/
 * publish-animation.ts) şu an için gereksiz bir karmaşıklık olurdu.
 */
const COLD_START_CACHE_TTL_MS = 5 * 60 * 1000;

/**
 * 2026-11-15 — "İzlenmeyenler önce" eşiği (bkz. `prioritizeUnwatched`). 7 gün: uygulamayı her gün açan
 * kullanıcı bir hafta boyunca aynı videoyu baştan görmez; bir hafta sonra video "tekrar" olarak öne
 * dönebilir (dil öğreniminde aralıklı tekrar istenen bir şey). %50: videonun en az yarısı OYNATILMIŞSA
 * "izlendi" sayılır — birkaç saniyelik geçiş/kaydırma sayılmaz, o video izlenmemiş gibi yine öne gelebilir.
 */
const RECENTLY_WATCHED_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;
const RECENTLY_WATCHED_MIN_RATIO = 0.5;

type CacheEntry = { videos: PlayableVideo[]; expiresAt: number };

/**
 * Sadece VIDEO personalization policy: topic affinity yorumlanması,
 * deterministic ranking/scheduling, deterministic exploration, dedupe.
 *
 * Quiz composition BİLMİYOR, 3:1 policy uygulamıyor, FeedItem[] üretmiyor —
 * bunlar FeedService'in işi (bkz. feed.service.ts). HTTP concern bilmiyor,
 * kendi userId-var-mı kontrolünü yapmıyor (bu FeedService'in sorumluluğu) —
 * BadRequestException gibi bir exception hiç üretmiyor.
 *
 * Chunk 15 — `preference` (opsiyonel) saydam şekilde `rankVideos`'a taşınıyor,
 * bu katman kendi başına HİÇBİR yorum/politika eklemiyor (boost/hard-filter
 * kararlarının TAMAMI personalization-ranking.ts'te).
 *
 * 2026-09-30 — cold-start önbellekleme eklendi (yukarıdaki COLD_START_CACHE_TTL_MS
 * yorumuna bkz.). `rankVideos`'un kendisi (personalization-ranking.ts) SAF ve
 * DETERMİNİSTİK kaldı — önbellekleme bilinçli olarak SADECE bu servis
 * katmanında, çağıranların/testlerin ranking algoritmasını hâlâ hiçbir
 * önbellek etkisi olmadan doğrudan test edebilmesi için.
 */
@Injectable()
export class PersonalizationService {
  private readonly coldStartCache = new Map<string, CacheEntry>();

  constructor(private readonly personalizationRepository: PersonalizationRepository) {}

  /** Test gözlemi: cold-start cache girdi sayısı (seed cardinality'sinin cache'i büyütmediğini doğrulamak için). */
  get coldStartCacheSize(): number {
    return this.coldStartCache.size;
  }

  /**
   * `sessionSeed` verilirse eşit öncelikli adayların (aynı topic + aynı CEFR distance) tie-break sırası
   * `deterministicTieBreak(seed, scope, userId, videoId)` ile belirlenir; verilmezse eski video.id tie-break'i.
   *
   * Cold-start cache'i SEED'DEN BAĞIMSIZ (id tie-break'li) sonucu tutar ve anahtarında seed YOKTUR — aksi halde
   * her session ayrı bir girdi üretip cache'i sınırsız büyütürdü. Seed, cache çıktısının KOPYASI üzerinde
   * uygulanır (cache'li dizi asla mutate edilmez).
   */
  async getPersonalizedVideos(
    userId: string,
    candidates: PlayableVideo[],
    scope: FeedScope,
    preference?: FeedPreferences,
    sessionSeed?: string,
  ): Promise<PlayableVideo[]> {
    // KAPSAM: bu sıralama YENİ bir session'ın planı için geçerli (cursor'suz istek). Kesintisiz akışta
    // (FeedService.nextContinuousPlan) sıralama yine buradan gelir ama ardından son videoya göre
    // DÖNDÜRÜLÜR; izlenenler o partide sona düşmeyebilir. Bilinçli olarak bu değişikliğin dışında —
    // kesintisiz akışın algoritması ayrı bir konu (bkz. PR açıklaması).
    //
    // 2026-11-15 — iki okuma PARALEL (aynı kullanıcının iki bağımsız aggregate'i; sıralı await session
    // başlangıcına gereksiz bir round-trip eklerdi). "İzlenmeyenler önce" en SONDA, sıralamanın kendisine
    // dokunmadan uygulanır (bkz. prioritizeUnwatched) — cold-start cache'i bu yüzden kişiye özel veri tutmaz.
    const [affinityByTopic, recentlyWatchedIds] = await Promise.all([
      this.personalizationRepository.getTopicAffinity(userId),
      this.personalizationRepository.getRecentlyWatchedVideoIds(userId, new Date(Date.now() - RECENTLY_WATCHED_WINDOW_MS), RECENTLY_WATCHED_MIN_RATIO),
    ]);
    const tieBreakKey = sessionSeed ? (video: PlayableVideo) => deterministicTieBreak(sessionSeed, scope, userId, video.id) : undefined;

    // Cold start DEĞİLSE (gerçek izleme geçmişi varsa) önbellek hiç devreye
    // girmez — bu kullanıcının sıralaması gerçekten kişiye özel, paylaşılamaz.
    if (affinityByTopic.size > 0) {
      return prioritizeUnwatched(rankVideos(candidates, affinityByTopic, preference, tieBreakKey), recentlyWatchedIds);
    }

    const cacheKey = buildColdStartCacheKey(scope, preference, candidates);
    const cached = this.coldStartCache.get(cacheKey);
    const now = Date.now();
    let baseRanking: PlayableVideo[];
    if (cached && cached.expiresAt > now) {
      baseRanking = cached.videos;
    } else {
      baseRanking = rankVideos(candidates, affinityByTopic, preference);
      this.coldStartCache.set(cacheKey, { videos: baseRanking, expiresAt: now + COLD_START_CACHE_TTL_MS });
    }

    // Cache'li diziyi ASLA doğrudan döndürmeyiz/mutate etmeyiz: seed varsa applyTieBreakOrdering yeni dizi üretir,
    // yoksa prioritizeUnwatched açık bir kopya döner (izlenen yoksa da kopya — cache'li dizi dışarı sızmaz).
    return prioritizeUnwatched(tieBreakKey ? applyTieBreakOrdering(baseRanking, preference, tieBreakKey) : baseRanking, recentlyWatchedIds);
  }
}

/**
 * Cold-start sonucu `candidates` (kategoriye göre zaten filtrelenmiş, bkz.
 * FeedService.startSession) + `preference.topics`/`preference.level`'a bağlı
 * (affinityByTopic her zaman boş — ayrıca bir cache-key bileşeni olmasına
 * gerek yok). `topics` sırası anlamsız (bir Set) — key'in kararlı olması için
 * sıralanıyor, aksi halde AYNI seçim farklı sırayla gelince (örn. client'tan)
 * yanlışlıkla farklı cache key üretilip isabet oranı gereksiz düşerdi.
 *
 * 2026-10-01 — gerçek bug (bir e2e test koşumunda bulundu, bkz. git log):
 * `candidates`'ın KENDİSİ cache key'e dahil DEĞİLDİ — sadece scope/level/
 * topics'e bakılıyordu. Aynı kombinasyona (ör. "general"/tercihsiz) farklı
 * zamanlarda farklı bir aday kümesiyle (örn. yeni içerik yayınlandıktan sonra,
 * ya da katalog hiç yokken) gelindiğinde, ESKİ aday kümesinden hesaplanmış
 * sonuç TTL boyunca döndürülüyordu — bu "gecikmeli yansıma" (yukarıdaki
 * COLD_START_CACHE_TTL_MS yorumunda kabul edilen ödünleşim) DEĞİL, doğrudan
 * YANLIŞ bir sonuç (en uç hali: katalog boşken cache'lenen boş sonuç, içerik
 * yayınlandıktan SONRA bile dönüyordu). Adayların id'lerinden türetilen bir
 * fingerprint (sayı + sıralanmış id'lerin join'i) key'e eklenince, aday kümesi
 * her değiştiğinde cache doğal olarak miss ediyor — gerçek performans
 * gerekçesi (aynı "sığ" kataloğa art arda gelen cold-start istekleri) hâlâ
 * korunuyor, sadece artık YANLIŞ bir eşleşme riski yok.
 */
function buildColdStartCacheKey(scope: FeedScope, preference: FeedPreferences | undefined, candidates: readonly PlayableVideo[]): string {
  const level = preference?.level ?? "none";
  const topics = [...(preference?.topics ?? [])].sort().join(",");
  const candidateFingerprint = `${candidates.length}:${[...candidates.map((v) => v.id)].sort().join(",")}`;
  return `${scope}::${level}::${topics}::${candidateFingerprint}`;
}
