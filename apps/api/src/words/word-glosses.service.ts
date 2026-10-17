import { Injectable } from "@nestjs/common";
import type { VideoWordGlosses } from "@linguascroll/shared-types";
import { SegmentWordGlossesRepository } from "./segment-word-glosses-repository";

/** Offline CLI yeni anlam ürettiğinde (process yeniden başlamadan) görünmesi için üst sınır. */
export const WORD_GLOSSES_CACHE_TTL_MS = 10 * 60 * 1000;

/**
 * Anlamlar offline üretilen, runtime'da değişmeyen veri — her istekte DB'ye
 * gitmemek için basit bir in-memory TTL cache. Dış cache servisi (Redis vb.)
 * YOK: bugün tek instance ve veri küçük (video başına birkaç KB).
 * BOŞ sonuç cache'lenmiyor: henüz üretilmemiş bir video, CLI çalışınca TTL'i
 * beklemeden görünmeli.
 */
@Injectable()
export class WordGlossesService {
  private readonly cache = new Map<string, { glosses: VideoWordGlosses; expiresAt: number }>();

  constructor(private readonly repository: SegmentWordGlossesRepository) {}

  async getForVideo(videoId: string, now: number = Date.now()): Promise<VideoWordGlosses> {
    const cached = this.cache.get(videoId);
    if (cached && cached.expiresAt > now) {
      return cached.glosses;
    }
    const glosses = await this.repository.findForVideo(videoId);
    if (Object.keys(glosses).length > 0) {
      this.cache.set(videoId, { glosses, expiresAt: now + WORD_GLOSSES_CACHE_TTL_MS });
    }
    return glosses;
  }
}
