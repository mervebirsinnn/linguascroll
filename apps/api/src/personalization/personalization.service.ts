import { Injectable } from "@nestjs/common";
import type { PlayableVideo } from "@linguascroll/shared-types";
import { PersonalizationRepository } from "./personalization-repository";
import { rankVideos } from "./personalization-ranking";

/**
 * Sadece VIDEO personalization policy: topic affinity yorumlanması,
 * deterministic ranking/scheduling, deterministic exploration, dedupe.
 *
 * Quiz composition BİLMİYOR, 3:1 policy uygulamıyor, FeedItem[] üretmiyor —
 * bunlar FeedService'in işi (bkz. feed.service.ts). HTTP concern bilmiyor,
 * kendi userId-var-mı kontrolünü yapmıyor (bu FeedService'in sorumluluğu) —
 * BadRequestException gibi bir exception hiç üretmiyor.
 */
@Injectable()
export class PersonalizationService {
  constructor(private readonly personalizationRepository: PersonalizationRepository) {}

  async getPersonalizedVideos(userId: string, candidates: PlayableVideo[]): Promise<PlayableVideo[]> {
    const affinityByTopic = await this.personalizationRepository.getTopicAffinity(userId);
    return rankVideos(candidates, affinityByTopic);
  }
}
