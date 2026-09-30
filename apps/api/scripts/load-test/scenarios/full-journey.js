// GERÇEKÇİ TAM KULLANICI YOLCULUĞU — write endpoint'lerini de içerir
// (watch-events, word save/unsave, quiz answer, word review). Bu script
// read-only.js'in AKSİNE production DB'ye VU-iterasyonu başına BİRDEN FAZLA
// satır yazar (users + video_watch_events + saved_words + quiz_answer_events
// + word_reviews) — bkz. README "Production Data Impact" bölümü.
//
// ÖNERİ: bu script'i production'a karşı SADECE smoke/10/25/50 profilleriyle
// çalıştırın (K6_PROFILE=smoke|10|25|50). 100/250/500'e SADECE bilerek,
// yazma hacmini kabul ederek geçin — bkz. README'deki tahmini satır sayıları.
//
// Kullanıcı yolculuğu (gerçek endpoint'lerle, adım numaraları kullanıcının
// istediği 9 adıma karşılık geliyor):
//   1. POST /users/anonymous
//   2-3. GET /feed (pagination)
//   4. (embedded, ek çağrı yok) transcript/vocabulary/learningPoints
//   5. sleep(thinkTime) — videolar arası bekleme
//   6. POST /videos/:id/watch-events
//   7. PUT (+ opsiyonel DELETE) /words/:wordId/saved
//   8. POST /quizzes/:quizId/answer (feed'de quiz item'ı geldiğinde)
//   9. GET /words/saved, /words/review, /words/progress + POST /words/:id/review
import { sleep } from "k6";
import {
  PAGES_PER_SESSION,
  THRESHOLDS,
  SUMMARY_TREND_STATS,
  SAVE_WORD_PROBABILITY,
  UNSAVE_AFTER_SAVE_PROBABILITY,
  resolveExecutionOptions,
  thinkTimeSeconds,
} from "../lib/config.js";
import {
  health,
  createAnonymousUser,
  getFeed,
  recordWatchEvent,
  saveWord,
  unsaveWord,
  getSavedWords,
  getReviewSession,
  getProgress,
  recordWordReview,
  answerQuiz,
} from "../lib/api.js";
import { runIterationSafely } from "../lib/safety.js";

export const options = {
  ...resolveExecutionOptions(),
  thresholds: THRESHOLDS,
  summaryTrendStats: SUMMARY_TREND_STATS,
};

function pickRandom(array) {
  return array.length > 0 ? array[Math.floor(Math.random() * array.length)] : undefined;
}

function handleVideoItem(video, userId) {
  const thinkS = thinkTimeSeconds();
  sleep(thinkS); // adım 5 — video izleniyor gibi bekle.

  // adım 6 — watchedMs, gerçek video.durationMs'i AŞMAYACAK şekilde clamp'lendi
  // (uydurma/fiziksel olarak imkansız bir değer YOK).
  const watchedMs = Math.min(Math.round(thinkS * 1000), video.durationMs);
  recordWatchEvent(video.id, userId, watchedMs);

  // adım 7 — her videoda vocabulary varsa, GERÇEKÇİ bir olasılıkla bir kelime
  // kaydedilir (hepsi değil — bkz. config.js SAVE_WORD_PROBABILITY gerekçesi).
  if (video.vocabulary.length > 0 && Math.random() < SAVE_WORD_PROBABILITY) {
    const chosen = pickRandom(video.vocabulary);
    saveWord(chosen.word.id, userId, null);
    if (Math.random() < UNSAVE_AFTER_SAVE_PROBABILITY) {
      sleep(0.5);
      unsaveWord(chosen.word.id, userId);
    }
  }
}

function handleQuizItem(quiz, userId) {
  // adım 8 — GERÇEK bir option id (feed response'undan) — uydurulmuş bir uuid DEĞİL.
  const option = pickRandom(quiz.options);
  if (option) {
    answerQuiz(quiz.id, option.id, userId);
  }
}

function userJourney() {
  health();

  const userId = createAnonymousUser(); // adım 1
  if (!userId) {
    return;
  }

  let cursor = undefined;
  for (let page = 0; page < PAGES_PER_SESSION; page++) {
    const feedPage = getFeed(userId, cursor); // adım 2-3
    if (!feedPage) {
      break;
    }

    for (const item of feedPage.items) {
      if (item.type === "video") {
        handleVideoItem(item.video, userId);
      } else {
        handleQuizItem(item.quiz, userId);
      }
    }

    cursor = feedPage.nextCursor;
    if (!cursor) {
      break;
    }
  }

  // adım 9 — progress/memory/review. Yeni bir anonymous user için
  // getReviewSession muhtemelen boş döner (henüz "due" bir kelime yok) —
  // bu yüzden recordWordReview'ı SADECE gerçekten dönen bir kelime varsa
  // çağırıyoruz (uydurulmuş bir wordId'ye review YAZILMIYOR).
  getSavedWords(userId);
  const reviewRes = getReviewSession(userId);
  getProgress(userId);

  if (reviewRes && reviewRes.status === 200) {
    try {
      const dueWords = JSON.parse(reviewRes.body);
      const dueWord = pickRandom(dueWords);
      if (dueWord) {
        recordWordReview(dueWord.word.id, userId, Math.random() < 0.7);
      }
    } catch {
      // parse edilemezse review adımını sessizce atla — check() zaten
      // getReviewSession'ın 200 döndüğünü doğruladı, burada ek bir hata
      // raporlamaya gerek yok.
    }
  }
}

export default function () {
  runIterationSafely(userJourney);
}
