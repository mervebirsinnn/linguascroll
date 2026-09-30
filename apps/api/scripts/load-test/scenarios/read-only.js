// PRODUCTION-SAFE READ-HEAVY senaryo — bu, 100/250/500 kullanıcıya kadar
// GÜVENLE ölçeklendirilmesi amaçlanan script. VU başına TEK bir yazma var
// (POST /users/anonymous) — bu KAÇINILMAZ: GET /feed, var olan bir userId
// olmadan hiç çalışmıyor (bkz. feed.controller.ts / lib/api.js). Watch-event,
// word save/unsave, quiz answer, word review gibi HİÇBİR mutating çağrı
// burada YOK — bunlar scenarios/full-journey.js'te, AYRI ve daha düşük
// ölçekte çalıştırılması önerilen bir script'te.
//
// Kullanıcı yolculuğu (gerçek endpoint'lerle):
//   1. POST /users/anonymous           → userId
//   2-4. GET /feed (birkaç sayfa)      → video/quiz item'ları, embedded
//        transcript (segments) + vocabulary + learningPoints — AYRI bir
//        "transcript oku" endpoint'i YOK, feed response'unun içinde geliyor
//        (bkz. FeedPlayableVideo, packages/shared-types) — bu yüzden "step 4"
//        burada ek bir HTTP çağrısı değil, dönen JSON'un içeriğini kontrol
//        etmek (check()).
//   5. Videolar arası bekleme (think-time) simüle edilir, GERÇEK bir
//      watch-event POST edilmez (bu script'in "read-only" garantisi).
//   9. GET /words/saved, /words/review, /words/progress (yeni user için
//      boş/sıfır dönmesi BEKLENEN — bkz. README).
//
// `runIterationSafely` ile sarmalanmış — bir script exception'ının kontrolsüz
// hızlı bir iterasyon döngüsüne (ve dolayısıyla production'da beklenmedik
// sayıda write'a) dönüşmesini engelliyor (bkz. lib/safety.js, ilk smoke
// koşusunda GERÇEKTEN yaşanan kaza).
import { sleep } from "k6";
import { PAGES_PER_SESSION, THRESHOLDS, SUMMARY_TREND_STATS, resolveExecutionOptions, thinkTimeSeconds } from "../lib/config.js";
import { health, createAnonymousUser, getFeed, getSavedWords, getReviewSession, getProgress } from "../lib/api.js";
import { runIterationSafely } from "../lib/safety.js";

export const options = {
  ...resolveExecutionOptions(),
  thresholds: THRESHOLDS,
  summaryTrendStats: SUMMARY_TREND_STATS,
};

function userJourney() {
  health();

  const userId = createAnonymousUser();
  if (!userId) {
    return; // health/anonymous-bootstrap başarısızsa devam etmenin anlamı yok — bu iterasyon bir hata olarak zaten sayıldı (check()).
  }

  let cursor = undefined;
  for (let page = 0; page < PAGES_PER_SESSION; page++) {
    const feedPage = getFeed(userId, cursor);
    if (!feedPage) {
      break;
    }

    for (const item of feedPage.items) {
      if (item.type === "video") {
        // "Transcript / learning content oku" — zaten feed response'unda geldi,
        // ek bir network call YOK. Sadece gerçekten geldiğini doğruluyoruz.
        const video = item.video;
        const hasContent = Array.isArray(video.segments) && Array.isArray(video.vocabulary);
        if (!hasContent) {
          continue;
        }
      }
      // Videolar/quiz'ler arası kullanıcı bekleme süresi simülasyonu.
      sleep(thinkTimeSeconds());
    }

    cursor = feedPage.nextCursor;
    if (!cursor) {
      break; // session bitti (nextCursor null) — backend'in kendi kuralı, otomatik yeni session BAŞLATILMIYOR (bkz. feed.service.ts).
    }
  }

  // "progress/memory/review endpoint'lerini çağır" — üçü de saf READ.
  getSavedWords(userId);
  getReviewSession(userId);
  getProgress(userId);
}

export default function () {
  runIterationSafely(userJourney);
}
