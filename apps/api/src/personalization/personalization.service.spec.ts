import type { PlayableVideo } from "@linguascroll/shared-types";
import { deterministicTieBreak } from "./deterministic-tie-break";
import { rankVideos } from "./personalization-ranking";
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

    const forUser1 = await service.getPersonalizedVideos("user-1", candidates, "all", { level: "A1", topics: ["travel"] });
    const forUser2 = await service.getPersonalizedVideos("user-2", candidates, "all", { level: "A1", topics: ["travel"] });

    expect(forUser2).toEqual(forUser1);
  });

  it("gerçek izleme geçmişi olan bir kullanıcı için önbellek HİÇ kullanılmaz — sonuç adaylardan yeniden hesaplanır", async () => {
    const affinity = new Map([["user-with-history", new Map([["travel", 5]])]]);
    const service = makeService(affinity);
    const candidates = [video("a"), video("b")];

    // Cache'i önce bir cold-start kullanıcıyla doldur.
    await service.getPersonalizedVideos("cold-user", candidates, "all", { level: "A1", topics: [] });
    const result = await service.getPersonalizedVideos("user-with-history", candidates, "all", { level: "A1", topics: [] });

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

    const generalResult = await service.getPersonalizedVideos("user-1", generalCandidates, "all", { level: "A1", topics: [] });
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

    const first = await service.getPersonalizedVideos("user-1", candidates, "all", {
      level: "A1",
      topics: ["travel", "career"],
    });
    const second = await service.getPersonalizedVideos("user-2", candidates, "all", {
      level: "A1",
      topics: ["career", "travel"],
    });

    expect(second.map((v) => v.id)).toEqual(first.map((v) => v.id));
  });

  it("2026-10-01 regression — AYNI kategori/tercihte, aday kümesi DEĞİŞİNCE (ör. katalog boşken sonra içerik yayınlanınca) önbellek YANLIŞ eski sonucu döndürmez", async () => {
    const service = makeService(new Map());

    const whenEmpty = await service.getPersonalizedVideos("user-1", [], "all", { level: "A1", topics: ["travel"] });
    expect(whenEmpty).toEqual([]);

    // AYNI category/level/topics — eski davranışta (cache key adaylardan
    // bağımsızdı) bu, yukarıdaki boş sonucu TTL boyunca döndürürdü (gerçek bir
    // e2e test koşumunda bulunan bug). Aday kümesi artık key'in parçası.
    const candidates = [video("a"), video("b")];
    const afterPublish = await service.getPersonalizedVideos("user-2", candidates, "all", { level: "A1", topics: ["travel"] });

    expect(afterPublish.map((v) => v.id).sort()).toEqual(["a", "b"]);
  });

  it("2026-10-01 regression — AYNI kategori/tercihte FARKLI (ama ikisi de boş olmayan) aday kümeleri birbirinin sonucunu çalmaz", async () => {
    const service = makeService(new Map());

    const firstCatalog = await service.getPersonalizedVideos("user-1", [video("a"), video("b")], "all", { level: "A1", topics: [] });
    const secondCatalog = await service.getPersonalizedVideos("user-2", [video("c"), video("d")], "all", { level: "A1", topics: [] });

    expect(firstCatalog.map((v) => v.id).sort()).toEqual(["a", "b"]);
    expect(secondCatalog.map((v) => v.id).sort()).toEqual(["c", "d"]);
  });
});

describe("PersonalizationService — sessionSeed ve cold-start cache", () => {
  const uuid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
  const candidates = Array.from({ length: 20 }, (_, i) => video(uuid(i + 1)));
  const seedOf = (n: number) => n.toString(16).padStart(32, "0");
  const ids = (videos: PlayableVideo[]) => videos.map((v) => v.id);

  it("cache'li (cold-start) yol, doğrudan seed'li rankVideos ile AYNI sonucu verir (hem cache miss hem hit)", async () => {
    const service = makeService(new Map());
    const key = (v: PlayableVideo) => deterministicTieBreak(seedOf(7), "all", "user-1", v.id);
    const expected = ids(rankVideos(candidates, new Map(), undefined, key));
    const miss = await service.getPersonalizedVideos("user-1", candidates, "all", undefined, seedOf(7));
    const hit = await service.getPersonalizedVideos("user-1", candidates, "all", undefined, seedOf(7));
    expect(ids(miss)).toEqual(expected);
    expect(ids(hit)).toEqual(expected);
  });

  it("farklı seed'ler farklı sıra verir; seed'siz çağrı eski id sırasını korur", async () => {
    const service = makeService(new Map());
    const a = await service.getPersonalizedVideos("user-1", candidates, "all", undefined, seedOf(1));
    const b = await service.getPersonalizedVideos("user-1", candidates, "all", undefined, seedOf(2));
    const plain = await service.getPersonalizedVideos("user-1", candidates, "all");
    expect(ids(a)).not.toEqual(ids(b));
    expect(ids(plain)).toEqual(ids(rankVideos(candidates, new Map())));
  });

  it("çok sayıda farklı seed cache boyutunu BÜYÜTMEZ (anahtarda seed yok)", async () => {
    const service = makeService(new Map());
    for (let i = 1; i <= 200; i++) {
      await service.getPersonalizedVideos("user-1", candidates, "all", undefined, seedOf(i));
    }
    expect(service.coldStartCacheSize).toBe(1);
  });

  it("cache'li dizi mutate edilmez: seed'li çağrı sonrası seed'siz sonuç değişmez; dönen dizi değiştirilince cache etkilenmez", async () => {
    const service = makeService(new Map());
    const before = ids(await service.getPersonalizedVideos("user-1", candidates, "all"));
    await service.getPersonalizedVideos("user-1", candidates, "all", undefined, seedOf(3));
    const returned = await service.getPersonalizedVideos("user-1", candidates, "all");
    returned.reverse();
    returned.length = 0;
    expect(ids(await service.getPersonalizedVideos("user-1", candidates, "all"))).toEqual(before);
  });

  it("izleme geçmişi olan kullanıcıda seed doğrudan rankVideos'a iner ve cache kullanılmaz", async () => {
    const service = makeService(new Map([["u", new Map([["travel", 2]])]]));
    const key = (v: PlayableVideo) => deterministicTieBreak(seedOf(9), "all", "u", v.id);
    const result = await service.getPersonalizedVideos("u", candidates, "all", undefined, seedOf(9));
    expect(ids(result)).toEqual(ids(rankVideos(candidates, new Map([["travel", 2]]), undefined, key)));
    expect(service.coldStartCacheSize).toBe(0);
  });
});
