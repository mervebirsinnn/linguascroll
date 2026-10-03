import { Injectable } from "@nestjs/common";
import type { ContentCategory, FeedPreferences, PlayableVideo } from "@linguascroll/shared-types";
import { PersonalizationRepository } from "./personalization-repository";
import { rankVideos } from "./personalization-ranking";

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

  async getPersonalizedVideos(
    userId: string,
    candidates: PlayableVideo[],
    category: ContentCategory,
    preference?: FeedPreferences,
  ): Promise<PlayableVideo[]> {
    const affinityByTopic = await this.personalizationRepository.getTopicAffinity(userId);

    // Cold start DEĞİLSE (gerçek izleme geçmişi varsa) önbellek hiç devreye
    // girmez — bu kullanıcının sıralaması gerçekten kişiye özel, paylaşılamaz.
    if (affinityByTopic.size > 0) {
      return rankVideos(candidates, affinityByTopic, preference);
    }

    const cacheKey = buildColdStartCacheKey(category, preference, candidates);
    const cached = this.coldStartCache.get(cacheKey);
    const now = Date.now();
    if (cached && cached.expiresAt > now) {
      return cached.videos;
    }

    const videos = rankVideos(candidates, affinityByTopic, preference);
    this.coldStartCache.set(cacheKey, { videos, expiresAt: now + COLD_START_CACHE_TTL_MS });
    return videos;
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
 * `candidates`'ın KENDİSİ cache key'e dahil DEĞİLDİ — sadece category/level/
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
function buildColdStartCacheKey(category: ContentCategory, preference: FeedPreferences | undefined, candidates: readonly PlayableVideo[]): string {
  const level = preference?.level ?? "none";
  const topics = [...(preference?.topics ?? [])].sort().join(",");
  const candidateFingerprint = `${candidates.length}:${[...candidates.map((v) => v.id)].sort().join(",")}`;
  return `${category}::${level}::${topics}::${candidateFingerprint}`;
}
