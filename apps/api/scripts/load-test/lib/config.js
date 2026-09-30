// LinguaScroll k6 load test — shared config.
//
// Standalone tool (AYNI desen: apps/api/scripts/stt — NestJS app'in bir
// parçası DEĞİL, npm/pnpm dependency'si DEĞİL). k6 harici bir binary
// (https://k6.io) — çalıştırmak için `k6 run <dosya>`, repo'ya hiçbir
// runtime/build dependency'si eklenmiyor.
//
// BASE_URL varsayılanı production API — kullanıcı bunu bilerek istedi
// (hedef: https://looplish-api.onrender.com). `-e BASE_URL=...` ile
// override edilebilir (örn. lokale karşı denemek için).
export const BASE_URL = __ENV.BASE_URL || "https://looplish-api.onrender.com";

/**
 * Her VU iterasyonunda kaç feed sayfası (GET /feed) çekilsin. Backend'in
 * PAGE_SIZE'ı 12 (feed.service.ts), bir session en fazla MAX_SESSION_VIDEOS=27
 * video + ~cadence 2:1 quiz ≈ 40 item'a kadar (CLAUDE.md). Gerçekçi bir
 * kullanıcı feed'i BAŞTAN SONA bitirmez — varsayılan 3 sayfa (~36 item'a kadar,
 * session'ın büyük kısmı) makul bir "biraz kaydırdı, sonra ayrıldı" senaryosu.
 * `-e PAGES_PER_SESSION=N` ile override edilebilir.
 */
export const PAGES_PER_SESSION = parseInt(__ENV.PAGES_PER_SESSION || "3", 10);

/** Video başına simüle edilen "izleme/okuma" bekleme süresi aralığı (saniye). */
export const THINK_TIME_MIN_S = parseFloat(__ENV.THINK_TIME_MIN_S || "2");
export const THINK_TIME_MAX_S = parseFloat(__ENV.THINK_TIME_MAX_S || "6");

/**
 * Root cause fix (2. koşu) — her iterasyonun (BAŞARILI ya da BEKLENMEYEN bir
 * script exception'ıyla ERKEN kesilmiş olsun) uyacağı MUTLAK minimum süre.
 * lib/safety.js'teki `runIterationSafely` bunu HER durumda (finally bloğunda)
 * uyguluyor — bu, bir kod hatasının "exception → hemen yeni iterasyon →
 * exception → ..." şeklinde sonsuz-hızlı bir döngüye (ve dolayısıyla
 * production'da kontrolsüz sayıda satıra) dönüşmesini YAPISAL olarak
 * imkansız kılıyor (ilk smoke koşusunda GERÇEKTEN yaşanan bir kaza —
 * ~170ms/iterasyon × 415 iterasyon = 415 gerçek anonymous user).
 */
export const MIN_ITERATION_COOLDOWN_S = parseFloat(__ENV.MIN_ITERATION_COOLDOWN_S || "1");

/**
 * Yazma olasılıkları (0-1) — full-journey senaryosunda kullanılıyor.
 * Gerçekçi olsun diye "her video her zaman kaydedilir" gibi abartılı
 * bir varsayım YOK: gerçek kullanım örneklemi, her videoda birkaç
 * kelimeden en fazla biri kaydedilir, kaydedilenlerin bir kısmı geri
 * kaldırılır.
 */
export const SAVE_WORD_PROBABILITY = parseFloat(__ENV.SAVE_WORD_PROBABILITY || "0.3");
export const UNSAVE_AFTER_SAVE_PROBABILITY = parseFloat(__ENV.UNSAVE_AFTER_SAVE_PROBABILITY || "0.2");

/**
 * Stage tanımları (k6 `ramping-vus` executor'ı için). Kullanıcının açık
 * talimatı: "Bir anda 500'e çıkma" + her aşamada toparlanma için uygun
 * ramp/hold — bu yüzden HER seviye kendi ramp-up + hold bloğuna sahip,
 * tek bir dik rampa değil. Toplam full-ramp süresi ~30 dakika.
 *
 * `K6_PROFILE` env var'ı ile TEK bir seviye izole çalıştırılabilir
 * (örn. `-e K6_PROFILE=10` sadece 10-kullanıcı aşamasını çalıştırır) —
 * kullanıcının "önce küçük aşamaları tek tek dene" iş akışı için.
 */
const RAMP_STAGES = {
  baseline: [
    { duration: "30s", target: 5 },
    { duration: "1m", target: 5 },
    { duration: "20s", target: 0 },
  ],
  10: [
    { duration: "30s", target: 10 },
    { duration: "2m", target: 10 },
    { duration: "20s", target: 0 },
  ],
  25: [
    { duration: "30s", target: 25 },
    { duration: "2m", target: 25 },
    { duration: "20s", target: 0 },
  ],
  50: [
    { duration: "45s", target: 50 },
    { duration: "3m", target: 50 },
    { duration: "30s", target: 0 },
  ],
  /**
   * Teşhis amaçlı — 50-VU koşusunda gözlenen 22s'lik tail latency'nin TAMAMI
   * 45s'lik ramp-up'ın 6.4 saniyelik bir alt-penceresinde (yavaş yeni-VU
   * varışının yarattığı ihtimalli bir kuyruklanma) kümelenmişti, 3.4
   * dakikalık steady-state'te SIFIR yavaş örnek vardı. Bu profil AYNI 50 VU
   * hedefine, AYNI journey/think-time ile ama ÇOK DAHA YAVAŞ (5 dakika)
   * ulaşıyor — amaç "sorun VU SAYISI mı, yoksa VARIŞ HIZI mı" sorusunu
   * ayırmak (bkz. önceki tur analizi).
   */
  "50slow": [
    { duration: "5m", target: 50 },
    { duration: "2m", target: 50 },
    { duration: "30s", target: 0 },
  ],
  100: [
    { duration: "1m", target: 100 },
    { duration: "3m", target: 100 },
    { duration: "30s", target: 0 },
  ],
  250: [
    { duration: "2m", target: 250 },
    { duration: "4m", target: 250 },
    { duration: "1m", target: 0 },
  ],
  500: [
    { duration: "3m", target: 500 },
    { duration: "5m", target: 500 },
    { duration: "1m", target: 0 },
  ],
};

/**
 * Tüm merdiveni tek çalıştırmada ardışık uygulayan "full ramp". `smoke`
 * BİLEREK burada YOK — smoke artık AYRI bir executor tipi (aşağıya bkz.),
 * ramping-vus stage dizisine karıştırılamaz; full-ramp'in en hafif basamağı
 * `baseline` (5 VU) ile başlıyor. Seviyeler arasında toparlanma için kısa
 * bir 0-VU boşluğu YOK (her stage bloğu kendi ramp-down'ını taşıyor, k6
 * stage'leri ardışık uygulanır).
 */
const FULL_RAMP = [
  ...RAMP_STAGES.baseline,
  ...RAMP_STAGES[10],
  ...RAMP_STAGES[25],
  ...RAMP_STAGES[50],
  ...RAMP_STAGES[100],
  ...RAMP_STAGES[250],
  ...RAMP_STAGES[500],
];

const VALID_PROFILES = ["full", "smoke", "baseline", "10", "25", "50", "50slow", "100", "250", "500"];

/**
 * Root cause fix (2. koşu) — SMOKE artık `ramping-vus` (duration boyunca
 * TEKRAR TEKRAR loop eden bir executor) DEĞİL, `shared-iterations`: TAM
 * OLARAK 1 iterasyon, kaç saniye sürerse sürsün. İlk koşuda bir script
 * exception'ı (URLSearchParams bug'ı) her iterasyonu ~170ms'e düşürüp aynı
 * 70 saniyelik pencerede 415 iterasyona (415 gerçek production `users`
 * satırına) yol açmıştı — DETERMİNİSTİK `iterations:1` bu sınıf bir kazayı
 * KÖKTEN imkansız kılıyor (duration ne olursa olsun tekrar YOK).
 * `maxDuration` sadece "gerçekten asılırsa" için bir güvenlik tavanı —
 * normal koşuda hiç devreye girmemeli.
 *
 * Diğer TÜM profiller (baseline/10/25/.../500/full) HÂLÂ `ramping-vus`
 * (options.stages) kullanıyor — bunlar zaten GERÇEKTEN eşzamanlı/sürekli
 * yük simüle etmeli, smoke'un "tek, deterministik sağlık kontrolü" amacı
 * onlar için geçerli değil.
 */
export function resolveExecutionOptions() {
  const profile = __ENV.K6_PROFILE;

  if (profile === "smoke") {
    return {
      scenarios: {
        smoke: {
          executor: "shared-iterations",
          vus: 1,
          iterations: 1,
          // 2m → 5m: 2. koşuda GERÇEKTEN yaşandı — PAGES_PER_SESSION=3 × sayfa
          // başına ~12 item × item başına 2-6s think-time'ın worst-case toplamı
          // (~216s) + o koşuda gözlemlenen anormal (muhtemelen cold-start
          // kaynaklı, bkz. warm-baseline.js) 10-22s'lik istek gecikmeleri
          // birleşince 2m yetersiz kaldı, iterasyon userJourney() İÇİNDEYKEN
          // kesildi. 5m, ortalama senaryo (~144s) + gecikme payı için yeterli
          // olmalı — hâlâ SADECE 1 iterasyon (shared-iterations DEĞİŞMEDİ).
          maxDuration: "5m",
        },
      },
    };
  }

  if (profile && !VALID_PROFILES.includes(profile)) {
    throw new Error(`Bilinmeyen K6_PROFILE="${profile}". Geçerli değerler: ${VALID_PROFILES.join(", ")}.`);
  }

  const stages = !profile || profile === "full" ? FULL_RAMP : RAMP_STAGES[profile];
  return { stages };
}

/**
 * Threshold'lar, production'a karşı gerçekten koşulan read-only merdiveninin
 * (2026-09-30) GERÇEK ölçümlerine göre sıkılaştırıldı — "p95 < 200ms" gibi
 * hiçbir ölçüme dayanmayan bir rakam UYDURULMADI (kullanıcının açık talimatı,
 * bkz. README "Threshold'ları sıkılaştırma"):
 *
 *   smoke (1 VU, warm) p95=615ms | 10 VU p95=305ms | 25 VU p95=298ms |
 *   50 VU p95=288ms (p99=592ms) | 100 VU p95=419ms (p99=789ms, max=1.27s)
 *   → 100 VU'ya kadar SAĞLIKLI, %0 hata.
 *
 *   250 VU: GERÇEK KAPASİTE TAVANI. %31.88 istek başarısız (`/health` bile
 *   %49 başarısız — tek bir yavaş sorgu değil, instance'ın kendisi
 *   [Render CPU/memory ve/veya Neon connection pool] doyuma ulaşmış), p95=
 *   24.93s, p99/max 60s'lik timeout'a çarpıyor. 100 ile 250 arasında bir
 *   yerde gerçek duvar var — 500 koşulmadı (ek bilgi değeri yok, zaten
 *   struggling instance'a gereksiz yük).
 *
 * p95<1000ms: 100 VU'ya kadar gözlenen en kötü değerin (789ms p99) üstünde
 * güvenli bir pay bırakıyor, ama "sistem tamamen çöktü" tripwire'ı olan
 * 5000ms'den çok daha anlamlı — 250+ VU'daki gerçek çöküşü hem bu hem
 * http_req_failed (zaten önceki koşuda doğru şekilde yakaladı) flag'leyecek.
 * Hosting tier'ı büyütülüp tavan gerçekten kalkana kadar 250/500 profillerini
 * "başarısız" göstermesi BEKLENEN/doğru davranış, bug değil.
 */
export const THRESHOLDS = {
  http_req_failed: ["rate<0.05"],
  http_req_duration: ["p(95)<1000"],
};

export function thinkTimeSeconds() {
  return THINK_TIME_MIN_S + Math.random() * (THINK_TIME_MAX_S - THINK_TIME_MIN_S);
}

/**
 * k6'nın varsayılan text summary'si p90/p95 gösterir, p99 GÖSTERMEZ — kullanıcı
 * p99'u açıkça istediği için `summaryTrendStats`'a ekleniyor. HTTP status code
 * DAĞILIMI (200 vs 4xx vs 5xx sayıları) k6'nın standart text summary'sinde YOK
 * (her metrik örneği zaten `status` tag'i taşıyor, ama varsayılan rapor tag
 * bazında kırılım göstermiyor) — bunun için README'de `--out json=` /
 * `--summary-export=` flag'leri belgelendi, script içinde elle bir "status
 * counter" icat EDİLMEDİ (gereksiz karmaşıklık, k6'nın kendi flag'leri yeterli).
 */
export const SUMMARY_TREND_STATS = ["avg", "min", "med", "p(90)", "p(95)", "p(99)", "max"];
