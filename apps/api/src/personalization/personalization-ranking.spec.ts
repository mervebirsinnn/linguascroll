import { readFileSync } from "node:fs";
import { join } from "node:path";
import { topicSchema, type CefrLevel, type PlayableVideo, type Topic } from "@linguascroll/shared-types";
import { deterministicTieBreak } from "./deterministic-tie-break";
import { applyTieBreakOrdering, cefrLevelDistance, COLD_START_TOPIC_ORDER, rankVideos, VIDEOS_PER_EXPLORATION } from "./personalization-ranking";

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

  it("cold start'ta tercih edilen bir topic (dating — kanonik sırada beşinci), SWRR ağırlığı arttığı için baseline'a göre BELİRGİN ÖNCE gelir", () => {
    const candidates = COLD_START_TOPIC_ORDER.map((topic) => makeVideo(topic, topic));

    const baseline = rankVideos(candidates, new Map());
    expect(baseline.findIndex((v) => v.topic === "dating")).toBe(4);

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

describe("cefrLevelDistance", () => {
  it("skalanın iki ucu arasında (A1↔C2) en büyük mesafeyi (5) döner", () => {
    expect(cefrLevelDistance("A1", "C2")).toBe(5);
    expect(cefrLevelDistance("C2", "A1")).toBe(5); // simetrik
  });

  it("komşu seviyeler (A2↔B1) arasında mesafe 1'dir", () => {
    expect(cefrLevelDistance("A2", "B1")).toBe(1);
  });

  it("bir seviyenin kendisiyle mesafesi 0'dır (tam eşleşme)", () => {
    expect(cefrLevelDistance("B1", "B1")).toBe(0);
  });
});

describe("rankVideos — level proximity (feed personalization audit sonrası)", () => {
  it("tam eşleşen level (mesafe 0) topic içinde HER ZAMAN önce gelir", () => {
    const candidates = [
      makeVideo("v-b2", "travel", 1000, "B2"),
      makeVideo("v-a1", "travel", 1000, "A2"),
      makeVideo("v-exact", "travel", 1000, "B1"),
    ];

    const result = rankVideos(candidates, new Map(), { level: "B1", topics: [] });

    expect(result[0]?.id).toBe("v-exact");
  });

  it("farklı CEFR mesafelerinde, id sırası TERS olsa bile YAKIN olan seviye önce gelir", () => {
    // id'ler BİLEREK mesafe sırasının TERSİNE verildi (video-1 en uzak/C2,
    // video-6 en yakın/A1) — sıralamanın id'ye değil distance'a göre olduğunu
    // kanıtlamak için preferredLevel="A1" seçildi (tüm 6 seviye için AYRI,
    // çakışmasız mesafe üretir: 0,1,2,3,4,5).
    const candidates = [
      makeVideo("video-1", "career", 1000, "C2"), // distance 5
      makeVideo("video-2", "career", 1000, "C1"), // distance 4
      makeVideo("video-3", "career", 1000, "B2"), // distance 3
      makeVideo("video-4", "career", 1000, "B1"), // distance 2
      makeVideo("video-5", "career", 1000, "A2"), // distance 1
      makeVideo("video-6", "career", 1000, "A1"), // distance 0
    ];

    const result = rankVideos(candidates, new Map(), { level: "A1", topics: [] });

    expect(result.map((v) => v.id)).toEqual(["video-6", "video-5", "video-4", "video-3", "video-2", "video-1"]);
  });

  it("eşit mesafede (preferredLevel=A2 iken A1 ve B1, ikisi de mesafe 1) mevcut id tie-break uygulanır", () => {
    const candidates = [
      makeVideo("v-z-b1", "humor", 1000, "B1"),
      makeVideo("v-a-a1", "humor", 1000, "A1"),
    ];

    const result = rankVideos(candidates, new Map(), { level: "A2", topics: [] });

    expect(result.map((v) => v.id)).toEqual(["v-a-a1", "v-z-b1"]); // id sırası: v-a-a1 < v-z-b1
  });

  it("preferredLevel=null iken sıralama SAF id sırasıdır (level'lar birbirinden çok farklı olsa bile)", () => {
    const candidates = [
      makeVideo("v-c", "lifestyle", 1000, "C2"),
      makeVideo("v-a", "lifestyle", 1000, "A1"),
      makeVideo("v-b", "lifestyle", 1000, "B1"),
    ];

    const result = rankVideos(candidates, new Map(), { level: null, topics: [] });

    expect(result.map((v) => v.id)).toEqual(["v-a", "v-b", "v-c"]);
  });

  it("farklı preferredLevel değerleri topic SEÇİM SIKLIĞINI (SWRR) DEĞİŞTİRMEZ — sadece topic-içi video sırasını etkiler", () => {
    const candidates = [
      makeVideo("travel-c2", "travel", 1000, "C2"),
      makeVideo("travel-a1", "travel", 1000, "A1"),
      makeVideo("travel-b1", "travel", 1000, "B1"),
      makeVideo("career-c2", "career", 1000, "C2"),
      makeVideo("career-a1", "career", 1000, "A1"),
      makeVideo("career-b1", "career", 1000, "B1"),
    ];
    const affinity = new Map<Topic, number>([["travel", 3]]); // weight(travel)=4, weight(career)=1 — eşit değil, ayırt edici

    const withA1 = rankVideos(candidates, affinity, { level: "A1", topics: [] });
    const withC2 = rankVideos(candidates, affinity, { level: "C2", topics: [] });
    const withoutLevel = rankVideos(candidates, affinity, { level: null, topics: [] });

    const topicSequence = (result: PlayableVideo[]) => result.map((v) => v.topic);

    // Topic SEÇİM SIRASI (hangi topic ne zaman seçildi) preferredLevel'dan
    // TAMAMEN bağımsız — üç çağrıda da AYNI.
    expect(topicSequence(withA1)).toEqual(topicSequence(withoutLevel));
    expect(topicSequence(withC2)).toEqual(topicSequence(withoutLevel));

    // Ama topic-İÇİ video sırası preferredLevel'a göre GERÇEKTEN değişiyor
    // (aksi halde bu test proximity'nin hiçbir şey yapmadığını gizlerdi).
    expect(withA1.map((v) => v.id)).not.toEqual(withC2.map((v) => v.id));
  });
});

describe("session-scoped tie-break (deterministicTieBreak + rankVideos tieBreakKey)", () => {
  const SEED_A = "a".repeat(32);
  const SEED_B = "b".repeat(32);
  const keyFor = (seed: string) => (video: PlayableVideo) => deterministicTieBreak(seed, "all", "user-1", video.id);
  const uuid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;

  // 3 topic, 3 CEFR seviyesi: her (topic, seviye) grubunda 4 eşit öncelikli aday.
  const topics: Topic[] = ["travel", "humor", "career"];
  const levels: CefrLevel[] = ["A1", "B1", "C1"];
  const catalog: PlayableVideo[] = Array.from({ length: 36 }, (_, i) =>
    makeVideo(uuid(i + 1), topics[i % 3] as Topic, 1000, levels[Math.floor(i / 3) % 3] as CefrLevel),
  );
  const preference = { level: "B1" as CefrLevel, topics: ["humor" as Topic] };
  const ids = (videos: readonly PlayableVideo[]) => videos.map((v) => v.id);

  it("deterministicTieBreak saf: aynı girdi aynı anahtar; seed/scope/userId/videoId her biri anahtarı değiştirir", () => {
    const base = deterministicTieBreak(SEED_A, "all", "u", "v");
    expect(deterministicTieBreak(SEED_A, "all", "u", "v")).toBe(base);
    expect(base).toMatch(/^[0-9a-f]{64}$/);
    for (const other of [
      deterministicTieBreak(SEED_B, "all", "u", "v"),
      deterministicTieBreak(SEED_A, "ielts", "u", "v"),
      deterministicTieBreak(SEED_A, "all", "u2", "v"),
      deterministicTieBreak(SEED_A, "all", "u", "v2"),
    ]) {
      expect(other).not.toBe(base);
    }
  });

  it("aynı seed + aynı girdi → aynı sıra; farklı seed → farklı sıra", () => {
    const a1 = ids(rankVideos(catalog, new Map(), preference, keyFor(SEED_A)));
    const a2 = ids(rankVideos(catalog, new Map(), preference, keyFor(SEED_A)));
    const b = ids(rankVideos(catalog, new Map(), preference, keyFor(SEED_B)));
    expect(a1).toEqual(a2);
    expect(a1).not.toEqual(b);
    expect(a1).not.toEqual(ids(rankVideos(catalog, new Map(), preference)));
  });

  it("çıktı candidate'lerin permütasyonu: kayıp/duplicate yok", () => {
    const result = ids(rankVideos(catalog, new Map(), preference, keyFor(SEED_A)));
    expect(new Set(result).size).toBe(catalog.length);
    expect([...result].sort()).toEqual(ids(catalog).sort());
  });

  it("CEFR proximity seed'e rağmen bozulmaz: her topic içinde distance artan sırada", () => {
    for (const seed of [SEED_A, SEED_B]) {
      const result = rankVideos(catalog, new Map(), preference, keyFor(seed));
      for (const topic of topics) {
        const distances = result.filter((v) => v.topic === topic).map((v) => cefrLevelDistance(v.cefrLevel, "B1"));
        expect(distances).toEqual([...distances].sort((x, y) => x - y));
      }
    }
  });

  it("SWRR topic dağılımı bozulmaz: topic dizilimi tie-break'siz sonuçla BİREBİR aynı (affinity'li durumda da)", () => {
    const affinity = new Map<Topic, number>([["travel", 3], ["humor", 1]]);
    for (const aff of [new Map<Topic, number>(), affinity]) {
      const plain = rankVideos(catalog, aff, preference).map((v) => v.topic);
      for (const seed of [SEED_A, SEED_B]) {
        expect(rankVideos(catalog, aff, preference, keyFor(seed)).map((v) => v.topic)).toEqual(plain);
      }
    }
  });

  it("aynı topic + aynı CEFR distance içindeki sıra seed'e göre DEĞİŞİR", () => {
    const group = (videos: PlayableVideo[]) => ids(videos.filter((v) => v.topic === "travel" && v.cefrLevel === "A1"));
    const a = group(rankVideos(catalog, new Map(), undefined, keyFor(SEED_A)));
    const b = group(rankVideos(catalog, new Map(), undefined, keyFor(SEED_B)));
    expect(a).not.toEqual(b);
    expect([...a].sort()).toEqual([...b].sort());
  });

  it("level tercihi YOKKEN level'lar eşit öncelikli sayılır (aynı topic'in tamamı tek tie grubu)", () => {
    const result = rankVideos(catalog, new Map(), undefined, keyFor(SEED_A));
    const travelLevels = result.filter((v) => v.topic === "travel").map((v) => v.cefrLevel);
    expect(travelLevels).not.toEqual([...travelLevels].sort());
  });

  it.each([
    ["tercihsiz", undefined],
    ["level+topic tercihli", preference],
    ["sadece level", { level: "A1" as CefrLevel, topics: [] }],
  ])("applyTieBreakOrdering(rankVideos(unseeded)) ≡ rankVideos(seeded) — %s (cold-start cache eşdeğerliği)", (_name, pref) => {
    for (const affinity of [new Map<Topic, number>(), new Map<Topic, number>([["career", 2]])]) {
      for (const seed of [SEED_A, SEED_B]) {
        const viaPostProcess = applyTieBreakOrdering(rankVideos(catalog, affinity, pref), pref, keyFor(seed));
        expect(ids(viaPostProcess)).toEqual(ids(rankVideos(catalog, affinity, pref, keyFor(seed))));
      }
    }
  });

  it("applyTieBreakOrdering girdiyi mutate etmez ve yeni dizi döner", () => {
    const ranked = rankVideos(catalog, new Map(), preference);
    const snapshot = ids(ranked);
    const out = applyTieBreakOrdering(ranked, preference, keyFor(SEED_A));
    expect(out).not.toBe(ranked);
    expect(ids(ranked)).toEqual(snapshot);
  });
});

it("yeni konuların tamamı sıralamaya dahil edilir", () => {
  expect(new Set(COLD_START_TOPIC_ORDER)).toEqual(new Set(topicSchema.options));
  const videos = topicSchema.options.map((topic) => makeVideo(topic, topic));
  const ranked = rankVideos(videos, new Map(), {level:null, topics:["science", "music", "food", "cinema"]});
  expect(new Set(ranked.map((v) => v.topic))).toEqual(new Set(topicSchema.options));
});
