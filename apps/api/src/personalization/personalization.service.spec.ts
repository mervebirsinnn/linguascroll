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

  it("tercih (topics) sırası anlamsız — AYNI aday kümesi + farklı sırayla verilen AYNI topic seti aynı önbellek girdisini kullanır", async () => {
    // 2026-10-01 — AYNI candidates kullanılıyor (bkz. aşağıdaki "farklı aday
    // kümeleri birbirinin sonucunu çalmaz" testi): bu test SADECE "topics
    // sırası key'i etkiliyor mu" sorusunu izole ediyor — aday kümesi artık
    // cache key'in bir parçası (gerçek bug fix'i), bu yüzden FARKLI candidates
    // vermek bu testin iddiasını (topics sırası) artık doğru ölçmezdi.
    const service = makeService(new Map());
    const candidates = [video("a"), video("b")];

    const first = await service.getPersonalizedVideos("user-1", candidates, "general", {
      level: "A1",
      topics: ["travel", "career"],
    });
    const second = await service.getPersonalizedVideos("user-2", candidates, "general", {
      level: "A1",
      topics: ["career", "travel"],
    });

    expect(second.map((v) => v.id)).toEqual(first.map((v) => v.id));
  });

  it("2026-10-01 regression — AYNI kategori/tercihte, aday kümesi DEĞİŞİNCE (ör. katalog boşken sonra içerik yayınlanınca) önbellek YANLIŞ eski sonucu döndürmez", async () => {
    const service = makeService(new Map());

    const whenEmpty = await service.getPersonalizedVideos("user-1", [], "general", { level: "A1", topics: ["travel"] });
    expect(whenEmpty).toEqual([]);

    // AYNI category/level/topics — eski davranışta (cache key adaylardan
    // bağımsızdı) bu, yukarıdaki boş sonucu TTL boyunca döndürürdü (gerçek bir
    // e2e test koşumunda bulunan bug). Aday kümesi artık key'in parçası.
    const candidates = [video("a"), video("b")];
    const afterPublish = await service.getPersonalizedVideos("user-2", candidates, "general", { level: "A1", topics: ["travel"] });

    expect(afterPublish.map((v) => v.id).sort()).toEqual(["a", "b"]);
  });

  it("2026-10-01 regression — AYNI kategori/tercihte FARKLI (ama ikisi de boş olmayan) aday kümeleri birbirinin sonucunu çalmaz", async () => {
    const service = makeService(new Map());

    const firstCatalog = await service.getPersonalizedVideos("user-1", [video("a"), video("b")], "general", { level: "A1", topics: [] });
    const secondCatalog = await service.getPersonalizedVideos("user-2", [video("c"), video("d")], "general", { level: "A1", topics: [] });

    expect(firstCatalog.map((v) => v.id).sort()).toEqual(["a", "b"]);
    expect(secondCatalog.map((v) => v.id).sort()).toEqual(["c", "d"]);
  });
});
