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
 * Chunk — level proximity ranking (feed personalization audit'inin ardından).
 * `COLD_START_TOPIC_ORDER`'la AYNI gerekçe: CEFR'i Zod enum'unun declaration
 * order'ına ("accidental business policy") güvenerek değil, bu iş kararını
 * burada, adıyla, görünür şekilde sıralı bir skala olarak tanımlıyoruz —
 * `cefrLevelDistance` bu sırayı index farkı olarak kullanıyor.
 */
export const CEFR_LEVEL_ORDER: readonly CefrLevel[] = ["A1", "A2", "B1", "B2", "C1", "C2"];

/**
 * İki CEFR seviyesi arasındaki ordinal mesafe (|Δindex|) — resmi bir zorluk
 * ağırlıklandırması DEĞİL, sadece "ne kadar yakın" için basit, doğrusal bir
 * sıralama sinyali (kullanıcı kararı — pedagojik hassasiyet gerektirmiyor).
 * 0 = tam eşleşme, skalanın uçları arasında (A1↔C2) en büyük değer olan 5.
 */
export function cefrLevelDistance(a: CefrLevel, b: CefrLevel): number {
  return Math.abs(CEFR_LEVEL_ORDER.indexOf(a) - CEFR_LEVEL_ORDER.indexOf(b));
}

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
  tieBreakKey?: TieBreakKey,
): PlayableVideo[] {
  const preferredTopics = new Set<Topic>(preference?.topics ?? []);
  const preferredLevel: CefrLevel | null = preference?.level ?? null;

  const byTopic = groupByTopicSorted(candidates, preferredLevel, tieBreakKey);
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
 * Session-scoped shuffle: video → sıralama anahtarı (bkz. deterministic-tie-break.ts). SADECE eşit
 * öncelikli adaylar (aynı topic kuyruğu + aynı CEFR distance grubu) arasındaki sırayı belirler;
 * CEFR proximity, topic affinity ve SWRR topic dağılımı bu anahtardan etkilenmez.
 */
export type TieBreakKey = (video: PlayableVideo) => string;

/**
 * Bir topic kuyruğunun içindeki TEK sıralama kuralı (hem rankVideos hem applyTieBreakOrdering kullanır —
 * iki yol aynı karşılaştırıcıyı paylaştığı için birbirinden sapamaz): önce CEFR distance, sonra (varsa)
 * seed anahtarı, en son video.id (anahtar çakışırsa bile toplam sıra garantisi).
 */
function sortTopicQueue(list: PlayableVideo[], preferredLevel: CefrLevel | null, tieBreakKey?: TieBreakKey): void {
  // Anahtarlar sort'tan ÖNCE bir kez hesaplanır (karşılaştırıcıda video başına O(log n) hash olmasın).
  const keys = new Map<string, string>(tieBreakKey ? list.map((video) => [video.id, tieBreakKey(video)] as [string, string]) : []);
  list.sort((a, b) => {
    if (preferredLevel) {
      const distanceDiff = cefrLevelDistance(a.cefrLevel, preferredLevel) - cefrLevelDistance(b.cefrLevel, preferredLevel);
      if (distanceDiff !== 0) {
        return distanceDiff;
      }
    }
    if (tieBreakKey) {
      const keyA = keys.get(a.id) ?? "";
      const keyB = keys.get(b.id) ?? "";
      if (keyA !== keyB) {
        return keyA < keyB ? -1 : 1;
      }
    }
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  });
}

/**
 * `rankVideos(candidates, affinity, preference)` (tie-break'siz) ÇIKTISINA seed'i sonradan uygular:
 * `rankVideos(candidates, affinity, preference, key)` ile BİREBİR aynı sonucu verir ama pahalı ranking'i
 * yeniden çalıştırmadan — cold-start cache'i seed'den bağımsız kalsın diye (bkz. PersonalizationService).
 *
 * Dayanak (spec'te property olarak test edilir): rankVideos'ta HER topic'in kuyruğu (primary VE exploration)
 * ÖNDEN tüketilir, ve hangi pozisyona hangi topic'in düşeceği yalnızca topic sayılarına/ağırlıklara bağlıdır,
 * video kimliğine değil. Dolayısıyla çıktının her topic'e ait alt dizisi tam o topic'in sıralı kuyruğudur;
 * pozisyonları (topic dizilimini) koruyup her topic'in videolarını yeni sırayla yerleştirmek yeterlidir.
 *
 * `ranked` MUTATE EDİLMEZ (cache'li dizi olabilir); her zaman yeni bir dizi döner.
 */
export function applyTieBreakOrdering(
  ranked: readonly PlayableVideo[],
  preference: FeedPreferences | undefined,
  tieBreakKey: TieBreakKey,
): PlayableVideo[] {
  const preferredLevel: CefrLevel | null = preference?.level ?? null;

  const queues = new Map<Topic, PlayableVideo[]>();
  for (const video of ranked) {
    const queue = queues.get(video.topic) ?? [];
    queue.push(video);
    queues.set(video.topic, queue);
  }
  for (const queue of queues.values()) {
    sortTopicQueue(queue, preferredLevel, tieBreakKey);
  }

  const nextIndex = new Map<Topic, number>();
  return ranked.map((video) => {
    const index = nextIndex.get(video.topic) ?? 0;
    nextIndex.set(video.topic, index + 1);
    return queues.get(video.topic)?.[index] ?? video;
  });
}

/**
 * video.id'ye göre stabil sıralanmış, topic'e göre gruplanmış candidate'ler.
 *
 * Chunk 15 (level proximity ranking'le güncellendi) — `preferredLevel`
 * verilmişse (null değilse), AYNI topic içinde videolar `cefrLevelDistance`'a
 * göre ARTAN sırada gelir: tam eşleşme (mesafe 0) önce, sonra en yakın
 * seviyeler, en uzak seviyeler en sonda. Eşit mesafedeki videolar arasında
 * (örn. preferredLevel=A2 iken A1 ve B1, ikisi de mesafe 1) id sıralaması
 * hâlâ nihai, stabil tie-break olarak kalıyor. Hard filter DEĞİL: hiçbir
 * video mesafesi nedeniyle listeden ÇIKARILMIYOR, sadece geriye alınıyor —
 * bu ayrım bilinçli, kullanıcı kararı (feed personalization audit'i).
 */
function groupByTopicSorted(
  candidates: PlayableVideo[],
  preferredLevel: CefrLevel | null,
  tieBreakKey?: TieBreakKey,
): Map<Topic, PlayableVideo[]> {
  const byTopic = new Map<Topic, PlayableVideo[]>();
  for (const video of candidates) {
    const list = byTopic.get(video.topic) ?? [];
    list.push(video);
    byTopic.set(video.topic, list);
  }
  for (const list of byTopic.values()) {
    sortTopicQueue(list, preferredLevel, tieBreakKey);
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
