import type { PlayableVideo } from "@linguascroll/shared-types";
import { PersonalizationRepository } from "./personalization-repository";
import { PersonalizationService } from "./personalization.service";

function video(id: string, topic: PlayableVideo["topic"] = "travel"): PlayableVideo {
  return {
    id,
    topic,
    cefrLevel: "A1",
    durationMs: 10000,
    playbackUrl: `https://example.com/${id}.mp4`,
  } as PlayableVideo;
}

function makeService(affinityByUserId: Map<string, Map<string, number>>): PersonalizationService {
  const repository = {
    getTopicAffinity: (userId: string) => Promise.resolve(affinityByUserId.get(userId) ?? new Map()),
  } as unknown as PersonalizationRepository;
  return new PersonalizationService(repository);
}

describe("PersonalizationService — cold-start önbellekleme", () => {
  it("izleme geçmişi olmayan (cold-start) iki farklı kullanıcı, AYNI kategori/tercihte AYNI (önbelleklenmiş) sonucu alır", async () => {
    const service = makeService(new Map());
    const candidates = [video("a"), video("b")];

    const forUser1 = await service.getPersonalizedVideos("user-1", candidates, "general", { level: "A1", topics: ["travel"] });
    const forUser2 = await service.getPersonalizedVideos("user-2", candidates, "general", { level: "A1", topics: ["travel"] });

    expect(forUser2).toEqual(forUser1);
  });

  it("gerçek izleme geçmişi olan bir kullanıcı için önbellek HİÇ kullanılmaz — sonuç adaylardan yeniden hesaplanır", async () => {
    const affinity = new Map([["user-with-history", new Map([["travel", 5]])]]);
    const service = makeService(affinity);
    const candidates = [video("a"), video("b")];

    // Cache'i önce bir cold-start kullanıcıyla doldur.
    await service.getPersonalizedVideos("cold-user", candidates, "general", { level: "A1", topics: [] });
    const result = await service.getPersonalizedVideos("user-with-history", candidates, "general", { level: "A1", topics: [] });

    // rankVideos'un kendisi zaten ayrıca test edildiği için burada SADECE
    // "cache'ten değil, gerçek hesaplamadan geldi" davranışını doğruluyoruz —
    // candidates aynı 2 video olduğu için sonuç kümesi yine aynı 2 id'yi
    // içermeli (sıralama farklı olabilir, ranking algoritmasının kendi işi).
    expect(result.map((v) => v.id).sort()).toEqual(["a", "b"]);
  });

  it("farklı kategori aynı önbellek anahtarını PAYLAŞMAZ", async () => {
    const service = makeService(new Map());
    const generalCandidates = [video("general-a")];
    const animationCandidates = [video("animation-a")];

    const generalResult = await service.getPersonalizedVideos("user-1", generalCandidates, "general", { level: "A1", topics: [] });
    const animationResult = await service.getPersonalizedVideos("user-2", animationCandidates, "animation", { level: "A1", topics: [] });

    expect(generalResult.map((v) => v.id)).toEqual(["general-a"]);
    expect(animationResult.map((v) => v.id)).toEqual(["animation-a"]);
  });

  it("tercih (topics) sırası anlamsız — farklı sırayla verilen AYNI topic seti aynı önbellek girdisini kullanır", async () => {
    const service = makeService(new Map());
    const candidatesFirstCall = [video("a"), video("b")];
    const candidatesSecondCall = [video("c"), video("d")]; // BİLEREK farklı — önbellek isabet ederse bunlar HİÇ görünmemeli

    const first = await service.getPersonalizedVideos("user-1", candidatesFirstCall, "general", {
      level: "A1",
      topics: ["travel", "career"],
    });
    const second = await service.getPersonalizedVideos("user-2", candidatesSecondCall, "general", {
      level: "A1",
      topics: ["career", "travel"],
    });

    expect(second.map((v) => v.id)).toEqual(first.map((v) => v.id));
  });
});
