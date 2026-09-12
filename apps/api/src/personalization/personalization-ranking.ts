import type { CefrLevel, FeedPreferences, PlayableVideo, Topic } from "@linguascroll/shared-types";

/**
 * Kullanıcının watch history'si yoksa (cold start) veya bir topic hiç
 * izlenmemişse (affinity map'te kaydı yoksa) başvurulacak TEK, açık kanonik
 * sıra. Zod enum'unun declaration order'ına ("accidental business policy")
 * güvenmek yerine bu iş kararı burada, adıyla, görünür şekilde tanımlı — hem
 * cold-start baseline'ı hem de scheduling/exploration'daki tüm tie-break'leri
 * besliyor.
 */
export const COLD_START_TOPIC_ORDER: readonly Topic[] = ["travel", "lifestyle", "humor", "career", "dating"];

/** Her 5. SEÇİLEN video (quiz item'lar sayılmaz — FeedService'in composition aşamasında eklenir) bir exploration slot'udur. */
export const VIDEOS_PER_EXPLORATION = 5;

/**
 * Chunk 15 — onboarding'de seçilen bir topic'in SWRR ağırlığına eklenen sabit,
 * additive boost. `affinity + 1` smoothing'iyle AYNI ölçekte (1) — bilinçli:
 * gerçek watch-affinity SIFIRKEN bile tercih edilen bir topic'i 2x öne çıkarır
 * (weight 1 → 2), ama affinity büyüdükçe (örn. 5) bu boost'un TOPLAM ağırlık
 * içindeki payı küçülür (6 vs 2) — ayrı bir "decay" mekanizması YOK, additive
 * yapının kendisi zamanla gerçek davranışın baskın olmasını doğal olarak
 * sağlıyor (kullanıcı kararı, Chunk 15).
 */
const PREFERENCE_TOPIC_BOOST = 1;

/**
 * PersonalizationRepository'den bağımsız, saf bir fonksiyon — DB/Nest/HTTP
 * bilmiyor, test etmek için hiçbir mock/DI gerekmiyor.
 *
 * İki paralel sıra üretir:
 *  - "primary": affinity'ye göre ağırlıklı, Smooth Weighted Round Robin (SWRR —
 *    nginx/LVS'in weighted load balancing için kullandığı, kanıtlanmış,
 *    deterministic bir zamanlama algoritması) ile interleave edilmiş sıra.
 *    Yüksek affinity'li topic'ler daha SIK görünür ama arka arkaya kümelenmez.
 *  - "exploration": önce hiç izlenmemiş, sonra düşük-affinity'li topic'lerden
 *    oluşan öncelik sırası.
 *
 * Her VIDEOS_PER_EXPLORATION'ıncı seçimde exploration sırasından, diğerlerinde
 * primary sıradan bir video alınır. İki sıra da AYNI candidate havuzunu
 * paylaştığı için global bir `used` Set'i ile dedupe edilir — bir video id'si
 * feed'de asla iki kez çıkmaz. Candidate tükenirse (dedupe/exhaustion) feed
 * kısa kalır, duplicate üretilmez.
 *
 * Determinism: aynı `candidates` + aynı `affinityByTopic` + aynı `preference`
 * → her zaman aynı output. RNG/Math.random yok. Topic içi sıralama video.id'ye
 * göre stabilize edilir — DB'nin implicit row order'ına hiç güvenilmiyor.
 *
 * Chunk 15 — `preference` opsiyonel 3. parametre: verilmezse (veya
 * `{level:null, topics:[]}` ise) davranış ÖNCEKİ (Chunk 14) davranışla
 * BİREBİR aynıdır — mevcut çağrı yerleri/testler regression'sız çalışmaya
 * devam eder. `preference.topics` SADECE `buildPrimaryQueue`'nun SWRR
 * ağırlığını artırır (hard filter DEĞİL — seçilmeyen topic'ler candidate
 * havuzundan hiç ÇIKARILMIYOR). `preference.level` SADECE aynı topic
 * içindeki sıralamayı etkiler (bkz. groupByTopicSorted) — exploration
 * sırası (`buildExplorationQueue`) BİLİNÇLİ OLARAK preference'tan habersiz
 * bırakıldı (kapsam: sadece primary sıralama, kullanıcı kararı).
 */
export function rankVideos(
  candidates: PlayableVideo[],
  affinityByTopic: ReadonlyMap<Topic, number>,
  preference?: FeedPreferences,
): PlayableVideo[] {
  const preferredTopics = new Set<Topic>(preference?.topics ?? []);
  const preferredLevel: CefrLevel | null = preference?.level ?? null;

  const byTopic = groupByTopicSorted(candidates, preferredLevel);
  const primaryQueue = buildPrimaryQueue(byTopic, affinityByTopic, preferredTopics);
  const explorationQueue = buildExplorationQueue(byTopic, affinityByTopic);

  const used = new Set<string>();
  const primaryCursor = { index: 0 };
  const explorationCursor = { index: 0 };
  const result: PlayableVideo[] = [];

  let selectedCount = 0;
  while (result.length < candidates.length) {
    selectedCount += 1;
    const isExplorationSlot = selectedCount % VIDEOS_PER_EXPLORATION === 0;

    let picked = isExplorationSlot ? takeNextUnused(explorationQueue, explorationCursor, used) : undefined;
    if (!picked) {
      picked = takeNextUnused(primaryQueue, primaryCursor, used);
    }
    if (!picked) {
      break;
    }

    used.add(picked.id);
    result.push(picked);
  }

  return result;
}

/**
 * video.id'ye göre stabil sıralanmış, topic'e göre gruplanmış candidate'ler.
 *
 * Chunk 15 — `preferredLevel` verilmişse (null değilse), AYNI topic içinde
 * o level'e eşit videolar ÖNCE gelir (ikincil sıralama anahtarı) — id sıralaması
 * hâlâ nihai, stabil tie-break olarak kalıyor. Hard filter DEĞİL: eşleşmeyen
 * level'deki videolar listeden ÇIKARILMIYOR, sadece geriye alınıyor.
 */
function groupByTopicSorted(candidates: PlayableVideo[], preferredLevel: CefrLevel | null): Map<Topic, PlayableVideo[]> {
  const byTopic = new Map<Topic, PlayableVideo[]>();
  for (const video of candidates) {
    const list = byTopic.get(video.topic) ?? [];
    list.push(video);
    byTopic.set(video.topic, list);
  }
  for (const list of byTopic.values()) {
    list.sort((a, b) => {
      if (preferredLevel) {
        const aMatches = a.cefrLevel === preferredLevel;
        const bMatches = b.cefrLevel === preferredLevel;
        if (aMatches !== bMatches) {
          return aMatches ? -1 : 1;
        }
      }
      return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
    });
  }
  return byTopic;
}

/**
 * Smooth Weighted Round Robin. weight = affinity + 1 — bu "+1 smoothing" sabiti
 * iki şeyi aynı anda sağlıyor: (a) affinity'si yüksek topic'ler orantılı olarak
 * daha sık seçilir, (b) TÜM affinity'ler 0 olduğunda (cold start) tüm ağırlıklar
 * eşitlenir ve SWRR, COLD_START_TOPIC_ORDER'ı bozmadan bu sırayla eşit şekilde
 * döner — cold start ayrı bir kod yolu DEĞİL, algoritmanın doğal, dejenere
 * durumu.
 *
 * Chunk 15 — `preferredTopics`'teki bir topic'in ağırlığına `PREFERENCE_TOPIC_BOOST`
 * eklenir (additive, madde başındaki sabitin yorumuna bkz.) — cold-start'ta
 * (tüm affinity=0) bu, tercih edilen topic'leri COLD_START_TOPIC_ORDER'ın
 * ÖNÜNE geçirmeye YETMEYEBİLİR (SWRR hâlâ TÜM ağırlıkları dikkate alıyor,
 * sadece tercih edilenler 1 yerine 2 ağırlığında) — bu BİLİNÇLİ: preference
 * bir sinyal, "seçilen topic'ler her zaman ilk sırada" gibi bir hard-order
 * garantisi DEĞİL.
 */
function buildPrimaryQueue(
  byTopic: Map<Topic, PlayableVideo[]>,
  affinityByTopic: ReadonlyMap<Topic, number>,
  preferredTopics: ReadonlySet<Topic>,
): PlayableVideo[] {
  const topics = COLD_START_TOPIC_ORDER.filter((topic) => byTopic.has(topic));
  const queues = new Map(topics.map((topic) => [topic, [...(byTopic.get(topic) ?? [])]]));
  const weight = new Map(
    topics.map((topic) => [
      topic,
      (affinityByTopic.get(topic) ?? 0) + 1 + (preferredTopics.has(topic) ? PREFERENCE_TOPIC_BOOST : 0),
    ]),
  );
  const current = new Map(topics.map((topic) => [topic, 0]));
  const remaining = new Set(topics);

  const result: PlayableVideo[] = [];

  while (remaining.size > 0) {
    for (const topic of remaining) {
      current.set(topic, (current.get(topic) ?? 0) + (weight.get(topic) ?? 0));
    }

    let winner: Topic | undefined;
    for (const topic of topics) {
      if (!remaining.has(topic)) {
        continue;
      }
      if (winner === undefined || (current.get(topic) ?? 0) > (current.get(winner) ?? 0)) {
        winner = topic;
      }
    }
    if (winner === undefined) {
      break;
    }

    let totalWeight = 0;
    for (const topic of remaining) {
      totalWeight += weight.get(topic) ?? 0;
    }
    current.set(winner, (current.get(winner) ?? 0) - totalWeight);

    const queue = queues.get(winner);
    const video = queue?.shift();
    if (video) {
      result.push(video);
    }
    if (!queue || queue.length === 0) {
      remaining.delete(winner);
    }
  }

  return result;
}

/**
 * Exploration önceliği: önce hiç izlenmemiş (affinityByTopic'te hiç kaydı
 * olmayan) topic'ler, sonra izlenmiş ama düşük-affinity'li topic'ler — her
 * ikisinde de eşitlik durumunda COLD_START_TOPIC_ORDER tie-break olarak
 * kullanılıyor. Bir topic'in candidate'leri tükenirse (bkz. takeNextUnused),
 * akış otomatik olarak bir sonraki uygun topic'e geçer — bu sıra topic-by-topic
 * düz (flatten) bir dizi olduğu için ekstra bir "sıradaki uygun topic" dallanma
 * mantığına gerek yok.
 */
function buildExplorationQueue(
  byTopic: Map<Topic, PlayableVideo[]>,
  affinityByTopic: ReadonlyMap<Topic, number>,
): PlayableVideo[] {
  const canonicalIndex = new Map(COLD_START_TOPIC_ORDER.map((topic, index) => [topic, index]));

  const unseen = COLD_START_TOPIC_ORDER.filter((topic) => byTopic.has(topic) && !affinityByTopic.has(topic));

  const seenLowFirst = [...COLD_START_TOPIC_ORDER]
    .filter((topic) => byTopic.has(topic) && affinityByTopic.has(topic))
    .sort((a, b) => {
      const affinityDiff = (affinityByTopic.get(a) ?? 0) - (affinityByTopic.get(b) ?? 0);
      if (affinityDiff !== 0) {
        return affinityDiff;
      }
      return (canonicalIndex.get(a) ?? 0) - (canonicalIndex.get(b) ?? 0);
    });

  const priorityOrder = [...unseen, ...seenLowFirst];
  return priorityOrder.flatMap((topic) => byTopic.get(topic) ?? []);
}

/** Sırayla ilerler, `used`'da olmayan ilk video'yu bulup imleci onun bir ötesine taşır. */
function takeNextUnused(
  queue: PlayableVideo[],
  cursor: { index: number },
  used: ReadonlySet<string>,
): PlayableVideo | undefined {
  while (cursor.index < queue.length) {
    const candidate = queue[cursor.index];
    cursor.index += 1;
    if (candidate && !used.has(candidate.id)) {
      return candidate;
    }
  }
  return undefined;
}
