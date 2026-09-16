import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { CefrLevel, PlayableVideo, Topic } from "@linguascroll/shared-types";
import { COLD_START_TOPIC_ORDER, rankVideos, VIDEOS_PER_EXPLORATION } from "./personalization-ranking";

/**
 * rankVideos, DB/Nest/HTTP bilmeyen saf bir fonksiyon — bu yüzden bu testler hiçbir
 * DI/mock kurmadan, doğrudan girdi/çıktı üzerinden çalışıyor. PersonalizationRepository'nin
 * gerçek Postgres testleri personalization-repository.integration.spec.ts'te; burada
 * SADECE scheduling/exploration/determinism policy'si doğrulanıyor.
 */
function makeVideo(id: string, topic: Topic, durationMs = 1000, cefrLevel: CefrLevel = "A1"): PlayableVideo {
  return {
    id,
    learningLanguage: "en",
    cefrLevel,
    topic,
    durationMs,
    playbackUrl: `https://example.com/${id}.mp4`,
  };
}

/** Çıktının topic dizisindeki en uzun ardışık aynı-topic koşusu — "clustering" ölçütü. */
function longestConsecutiveRun(topics: readonly Topic[]): number {
  let longest = 0;
  let current = 0;
  let previous: Topic | undefined;
  for (const topic of topics) {
    current = topic === previous ? current + 1 : 1;
    longest = Math.max(longest, current);
    previous = topic;
  }
  return longest;
}

describe("rankVideos", () => {
  it("cold start (boş affinity map): kanonik COLD_START_TOPIC_ORDER'a göre başlar", () => {
    const candidates = COLD_START_TOPIC_ORDER.map((topic) => makeVideo(topic, topic));

    const result = rankVideos(candidates, new Map());

    expect(result.map((video) => video.topic)).toEqual([...COLD_START_TOPIC_ORDER]);
  });

  it("aynı candidates + aynı affinityByTopic → her zaman aynı output (determinism)", () => {
    const candidates = [
      makeVideo("v1", "travel"),
      makeVideo("v2", "career"),
      makeVideo("v3", "travel"),
      makeVideo("v4", "humor"),
      makeVideo("v5", "dating"),
      makeVideo("v6", "lifestyle"),
    ];
    const affinity = new Map<Topic, number>([
      ["travel", 5],
      ["career", 1],
    ]);

    const first = rankVideos(candidates, affinity);
    const second = rankVideos(candidates, affinity);

    expect(second).toEqual(first);
  });

  it("kaynak kodu RNG kullanmıyor (Math.random() çağrısı yok)", () => {
    // Çağrı sözdizimini arıyoruz ("Math.random(") — dosyadaki tasarım yorumu
    // ("RNG/Math.random yok") kasıtlı olarak bu regex'i tetiklemiyor.
    const source = readFileSync(join(__dirname, "personalization-ranking.ts"), "utf-8");
    expect(source).not.toMatch(/Math\.random\s*\(/);
  });

  it("yüksek affinity'li topic (travel), düşük affinity'li topic'ten (career) belirgin şekilde daha sık seçilir", () => {
    const candidates = [
      ...Array.from({ length: 10 }, (_, i) => makeVideo(`travel-${i}`, "travel")),
      ...Array.from({ length: 10 }, (_, i) => makeVideo(`career-${i}`, "career")),
    ];
    const affinity = new Map<Topic, number>([
      ["travel", 100],
      ["career", 1],
    ]);

    const result = rankVideos(candidates, affinity);
    const firstTen = result.slice(0, 10).map((video) => video.topic);

    expect(firstTen.filter((topic) => topic === "travel").length).toBeGreaterThan(
      firstTen.filter((topic) => topic === "career").length,
    );
  });

  it(`her ${VIDEOS_PER_EXPLORATION}. video exploration slot'u: unseen topic (humor), dominant primary topic'i (dating) kesintiye uğratır`, () => {
    const candidates = [
      ...Array.from({ length: 12 }, (_, i) => makeVideo(`dating-${i}`, "dating")),
      makeVideo("humor-0", "humor"),
    ];
    // dating: yüksek affinity (baskın primary). humor: affinityByTopic'te HİÇ kaydı
    // yok → unseen, exploration'da en yüksek öncelik.
    const affinity = new Map<Topic, number>([["dating", 100]]);

    const result = rankVideos(candidates, affinity);

    expect(result.slice(0, VIDEOS_PER_EXPLORATION - 1).every((video) => video.topic === "dating")).toBe(true);
    expect(result[VIDEOS_PER_EXPLORATION - 1]?.id).toBe("humor-0");
  });

  it("unseen topic yoksa exploration, düşük-affinity'li (ama izlenmiş) topic'i kullanır", () => {
    const candidates = [
      ...Array.from({ length: 20 }, (_, i) => makeVideo(`travel-${i}`, "travel")),
      makeVideo("career-0", "career"),
    ];
    // Her iki topic de affinityByTopic'te MEVCUT (unseen değil) — career düşük ama seen.
    const affinity = new Map<Topic, number>([
      ["travel", 100],
      ["career", 1],
    ]);

    const result = rankVideos(candidates, affinity);

    expect(result[VIDEOS_PER_EXPLORATION - 1]?.id).toBe("career-0");
  });

  it("exploration candidate'leri tükenince ikinci exploration slot'u güvenli şekilde primary'ye deterministic fallback yapar", () => {
    const candidates = [
      ...Array.from({ length: 12 }, (_, i) => makeVideo(`dating-${i}`, "dating")),
      makeVideo("humor-0", "humor"), // tek unseen candidate — ilk exploration slot'unda tükenir
    ];
    const affinity = new Map<Topic, number>([["dating", 100]]);

    const result = rankVideos(candidates, affinity);

    // İlk exploration slot (index 4): humor. İkinci exploration slot (index 9):
    // exploration havuzunda humor tükendiği için primary'den (dating) deterministic
    // fallback — çökme yok, duplicate yok, video kaybı yok.
    expect(result[VIDEOS_PER_EXPLORATION - 1]?.id).toBe("humor-0");
    expect(result[2 * VIDEOS_PER_EXPLORATION - 1]?.topic).toBe("dating");
    expect(result).toHaveLength(candidates.length);
    expect(new Set(result.map((video) => video.id)).size).toBe(candidates.length);
  });

  it("topic block clustering oluşmuyor: dominant topic bile ardışık uzun bloklar halinde çıkmıyor", () => {
    // Her topic'ten EŞİT sayıda candidate (20) — bu bilinçli: farklı sayıda candidate
    // olsaydı, azınlıktaki topic'ler tükendikten SONRA kalan tek topic'in ardışık
    // çıkması kaçınılmaz olurdu (bu "clustering" değil, candidate exhaustion —
    // ayrı bir test zaten bunu kapsıyor). Burada tek değişken ağırlık: travel
    // weight = affinity(1) + 1 = 2, diğer dört topic weight = 1'er (toplam diğer = 4).
    const CANDIDATES_PER_TOPIC = 20;
    const candidates = [
      ...Array.from({ length: CANDIDATES_PER_TOPIC }, (_, i) => makeVideo(`travel-${i}`, "travel")),
      ...Array.from({ length: CANDIDATES_PER_TOPIC }, (_, i) => makeVideo(`career-${i}`, "career")),
      ...Array.from({ length: CANDIDATES_PER_TOPIC }, (_, i) => makeVideo(`humor-${i}`, "humor")),
      ...Array.from({ length: CANDIDATES_PER_TOPIC }, (_, i) => makeVideo(`lifestyle-${i}`, "lifestyle")),
      ...Array.from({ length: CANDIDATES_PER_TOPIC }, (_, i) => makeVideo(`dating-${i}`, "dating")),
    ];
    const affinity = new Map<Topic, number>([["travel", 1]]);

    const result = rankVideos(candidates, affinity);
    // Hiçbir topic ilk turlarda tükenmediği için (her biri 20 candidate taşıyor),
    // ilk 60 seçimde (5 tur × ~12) exhaustion henüz devrede değil — clustering
    // sınırını sadece ağırlık davranışı belirliyor.
    const topics = result.slice(0, 60).map((video) => video.topic);

    expect(longestConsecutiveRun(topics)).toBeLessThanOrEqual(2);
    // Tüm topic'ler feed'de temsil ediliyor — sadece dominant topic'e kilitlenmiyor.
    expect(new Set(topics)).toEqual(new Set(["travel", "career", "humor", "lifestyle", "dating"]));
  });

  it("aynı video id, çıktıda asla iki kez bulunmaz (primary ve exploration aynı havuzu paylaşsa da)", () => {
    const candidates = [
      ...Array.from({ length: 8 }, (_, i) => makeVideo(`travel-${i}`, "travel")),
      makeVideo("career-0", "career"),
      makeVideo("humor-0", "humor"),
    ];
    const affinity = new Map<Topic, number>([["travel", 3]]);

    const result = rankVideos(candidates, affinity);

    const ids = result.map((video) => video.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("candidate tükenince (dedupe sonrası) feed'i kısa döner, duplicate ile doldurmaz", () => {
    const candidates = [makeVideo("only-1", "travel")];

    const result = rankVideos(candidates, new Map());

    expect(result).toEqual([candidates[0]]);
  });
});

describe("rankVideos — Chunk 15 preference (topic boost + level boost)", () => {
  it("preference verilmediğinde (undefined) davranış ÖNCEKİ (Chunk 14) davranışla birebir aynı — regression yok", () => {
    const candidates = COLD_START_TOPIC_ORDER.map((topic) => makeVideo(topic, topic));

    const withoutArg = rankVideos(candidates, new Map());
    const withUndefined = rankVideos(candidates, new Map(), undefined);
    const withEmptyPreference = rankVideos(candidates, new Map(), { level: null, topics: [] });

    expect(withUndefined).toEqual(withoutArg);
    expect(withEmptyPreference).toEqual(withoutArg);
  });

  it("cold start'ta tercih edilen bir topic (dating — kanonik sırada EN SONDA), SWRR ağırlığı arttığı için baseline'a göre BELİRGİN ÖNCE gelir", () => {
    const candidates = COLD_START_TOPIC_ORDER.map((topic) => makeVideo(topic, topic));

    const baseline = rankVideos(candidates, new Map());
    expect(baseline[baseline.length - 1]?.topic).toBe("dating"); // baseline: dating en sonda (bkz. cold-start testi)

    const boosted = rankVideos(candidates, new Map(), { level: null, topics: ["dating"] });
    expect(boosted[0]?.topic).toBe("dating"); // boost'lu: dating artık İLK sırada
  });

  it("aynı topic içinde, tercih edilen level'e eşit videolar ÖNCE gelir (id sıralamasını EZER) — hard filter DEĞİL, diğer level'ler listede kalır", () => {
    const candidates = [
      makeVideo("v-a", "travel", 1000, "A2"),
      makeVideo("v-b", "travel", 1000, "B1"),
      makeVideo("v-c", "travel", 1000, "B2"),
    ];

    const withoutPreference = rankVideos(candidates, new Map());
    expect(withoutPreference.map((v) => v.id)).toEqual(["v-a", "v-b", "v-c"]); // saf id sırası

    const withLevelPreference = rankVideos(candidates, new Map(), { level: "B1", topics: [] });
    expect(withLevelPreference.map((v) => v.id)).toEqual(["v-b", "v-a", "v-c"]); // B1 (v-b) öne alındı
    expect(withLevelPreference).toHaveLength(3); // hiçbir video ELENMEDİ
  });

  it("seçilmeyen topic'ler/level'ler candidate havuzundan HİÇ çıkarılmaz (hard filter yok) — TÜM video id'leri sonuçta mevcut", () => {
    const candidates = [
      makeVideo("travel-0", "travel"),
      makeVideo("career-0", "career"),
      makeVideo("humor-0", "humor"),
    ];

    const result = rankVideos(candidates, new Map(), { level: "C2", topics: ["dating"] });

    expect(new Set(result.map((v) => v.id))).toEqual(new Set(["travel-0", "career-0", "humor-0"]));
  });

  it("gerçek watch-affinity, preference boost'undan DAHA BASKIN kalır (kullanıcı kararı — tercih zamanla gerçek davranışın gerisinde kalmalı)", () => {
    const candidates = [
      ...Array.from({ length: 10 }, (_, i) => makeVideo(`travel-${i}`, "travel")), // yüksek GERÇEK affinity, tercih EDİLMEDİ
      ...Array.from({ length: 10 }, (_, i) => makeVideo(`dating-${i}`, "dating")), // sıfır affinity, ONBOARDING'DE tercih EDİLDİ
    ];
    const affinity = new Map<Topic, number>([["travel", 10]]); // weight(travel) = 11, weight(dating) = 0+1+1(boost) = 2

    const result = rankVideos(candidates, affinity, { level: null, topics: ["dating"] });
    const firstTen = result.slice(0, 10).map((video) => video.topic);

    expect(firstTen.filter((topic) => topic === "travel").length).toBeGreaterThan(
      firstTen.filter((topic) => topic === "dating").length,
    );
  });
});
