// WARM BASELINE — teşhis amaçlı, tek-VU, tek-iterasyon script. Amaç: ikinci
// smoke koşusunda gözlemlenen 10-22 saniyelik gecikmenin COLD START
// (Render instance uyuyordu / Neon compute suspend'deydi) kaynaklı mı,
// yoksa backend'in gerçek/kalıcı bir karakteristiği mi olduğunu ayırmak.
//
// read-only.js'in AKSİNE:
//   - video başına 2-6s think-time YOK (kasıtlı — amaç kullanıcı davranışını
//     simüle etmek değil, ÇIPLAK endpoint gecikmesini ölçmek).
//   - feed sadece 2 sayfa (page 1 + page 2) — TÜM item'lar üzerinde
//     gezinilmiyor.
//   - HER endpoint'in gecikmesi AYRI, isimli bir k6 Trend metriğine
//     yazılıyor (`warm_*_duration`) — k6'nın varsayılan text summary'si
//     tag bazında kırılım vermediği için (bkz. README), bu TEK-ÖRNEKLİK
//     (count=1) koşuda "endpoint bazında p50/p95/max" sorusuna gerçek,
//     k6'nın kendi hesapladığı rakamlarla cevap vermenin YEGANE net yolu.
import { sleep } from "k6";
import { Trend } from "k6/metrics";
import { THRESHOLDS, SUMMARY_TREND_STATS } from "../lib/config.js";
import { health, createAnonymousUserWithTiming, getFeedWithTiming, getSavedWords, getReviewSession, getProgress } from "../lib/api.js";
import { runIterationSafely } from "../lib/safety.js";

/** health'ten sonra, "instance'ı uyandırdık, şimdi gerçek trafiği başlat" için kısa bir bekleme — think-time DEĞİL, bir wake-up payı. */
const WAKE_UP_PAUSE_S = 2;

export const options = {
  scenarios: {
    warm_baseline: {
      executor: "shared-iterations",
      vus: 1,
      iterations: 1,
      maxDuration: "3m",
    },
  },
  thresholds: THRESHOLDS,
  summaryTrendStats: SUMMARY_TREND_STATS,
};

const warmHealthDuration = new Trend("warm_health_duration", true);
const warmCreateUserDuration = new Trend("warm_create_user_duration", true);
const warmFeedPage1Duration = new Trend("warm_feed_page1_duration", true);
const warmFeedPage2Duration = new Trend("warm_feed_page2_duration", true);
const warmSavedDuration = new Trend("warm_saved_duration", true);
const warmReviewDuration = new Trend("warm_review_duration", true);
const warmProgressDuration = new Trend("warm_progress_duration", true);

function warmBaselineJourney() {
  const healthRes = health(); // GET /health — wake-up.
  warmHealthDuration.add(healthRes.timings.duration);

  sleep(WAKE_UP_PAUSE_S);

  const { id: userId, res: userRes } = createAnonymousUserWithTiming(); // 1 anonymous user
  warmCreateUserDuration.add(userRes.timings.duration);
  if (!userId) {
    return;
  }

  const { page: page1, res: page1Res } = getFeedWithTiming(userId); // feed page 1
  warmFeedPage1Duration.add(page1Res.timings.duration);

  if (page1 && page1.nextCursor) {
    const { res: page2Res } = getFeedWithTiming(userId, page1.nextCursor); // feed page 2
    warmFeedPage2Duration.add(page2Res.timings.duration);
  }

  const savedRes = getSavedWords(userId); // saved
  warmSavedDuration.add(savedRes.timings.duration);

  const reviewRes = getReviewSession(userId); // review
  warmReviewDuration.add(reviewRes.timings.duration);

  const progressRes = getProgress(userId); // progress
  warmProgressDuration.add(progressRes.timings.duration);
}

export default function () {
  runIterationSafely(warmBaselineJourney);
}
