// Gerçek endpoint/contract'lar — repodan doğrulandı, UYDURULMADI:
//   apps/api/src/users/users.controller.ts       → POST /users/anonymous, GET /users/:id/exists
//   apps/api/src/feed/feed.controller.ts          → GET /feed
//   apps/api/src/videos/videos.controller.ts      → POST /videos/:id/watch-events
//   apps/api/src/words/words.controller.ts        → PUT/DELETE /words/:id/saved, GET /words/saved|review|progress, POST /words/:id/review
//   apps/api/src/quizzes/quizzes.controller.ts    → POST /quizzes/:id/answer
//   packages/shared-types/src/*.ts                → request/response body şekilleri
//
// content-admin/* BİLİNÇLİ OLARAK burada YOK — kullanıcının açık güvenlik
// talimatı: content-admin endpoint'leri asla test edilmeyecek.
import http from "k6/http";
import { check } from "k6";
import { BASE_URL } from "./config.js";

const JSON_HEADERS = { "Content-Type": "application/json" };

export function health() {
  const res = http.get(`${BASE_URL}/health`, { tags: { endpoint: "health" } });
  check(res, { "health: 200": (r) => r.status === 200 });
  return res;
}

function createAnonymousUserRaw() {
  const res = http.post(`${BASE_URL}/users/anonymous`, null, { tags: { endpoint: "users_anonymous", kind: "write" } });
  check(res, { "createAnonymousUser: 201": (r) => r.status === 201 });
  let id = null;
  if (res.status === 201) {
    try {
      id = JSON.parse(res.body).id;
    } catch {
      id = null;
    }
  }
  return { id, res };
}

/** POST /users/anonymous — READ değil, ama kaçınılmaz: feed userId olmadan hiç çalışmıyor (bkz. feed.controller.ts). Her VU iterasyonu için TEK bir satır yaratır. */
export function createAnonymousUser() {
  return createAnonymousUserRaw().id;
}

/** `createAnonymousUser` ile AYNI çağrı — sadece warm-baseline.js gibi ham `res.timings.duration`'a ihtiyaç duyan tüketiciler için `{ id, res }` döner. Davranış/endpoint AYNI, ikinci bir implementasyon DEĞİL. */
export function createAnonymousUserWithTiming() {
  return createAnonymousUserRaw();
}

/**
 * GET /feed — READ. cursor verilmezse yeni session başlatır (bkz. feed.service.ts).
 *
 * Bug fix — `URLSearchParams` k6'nın JS runtime'ında (goja) YOK (tarayıcı/Node
 * API'si, ECMAScript standardının parçası değil) — üretimde ReferenceError'a
 * ve her iterasyonun ilk feed çağrısında patlamasına yol açıyordu (bkz. ilk
 * smoke koşusu). Query string burada elle, `encodeURIComponent` ile kuruluyor
 * — diğer tüm helper'lar (getSavedWords/getReviewSession/getProgress/
 * unsaveWord) zaten bu deseni kullanıyordu, sadece getFeed unutulmuştu.
 */
function getFeedRaw(userId, cursor) {
  let query = `userId=${encodeURIComponent(userId)}`;
  if (cursor) {
    query += `&cursor=${encodeURIComponent(cursor)}`;
  }
  const res = http.get(`${BASE_URL}/feed?${query}`, { tags: { endpoint: "feed", kind: "read" } });
  check(res, { "getFeed: 200": (r) => r.status === 200 });
  let page = null;
  if (res.status === 200) {
    try {
      page = JSON.parse(res.body);
    } catch {
      page = null;
    }
  }
  return { page, res };
}

export function getFeed(userId, cursor) {
  return getFeedRaw(userId, cursor).page;
}

/** `getFeed` ile AYNI çağrı — warm-baseline.js gibi ham `res.timings.duration`'a ihtiyaç duyan tüketiciler için `{ page, res }` döner. */
export function getFeedWithTiming(userId, cursor) {
  return getFeedRaw(userId, cursor);
}

/** POST /videos/:videoId/watch-events — WRITE. watchedMs, gerçek video.durationMs'i AŞMAYACAK şekilde çağıran tarafından clamp'lenmeli (bkz. scenarios). */
export function recordWatchEvent(videoId, userId, watchedMs) {
  const res = http.post(
    `${BASE_URL}/videos/${videoId}/watch-events`,
    JSON.stringify({ userId, watchedMs }),
    { headers: JSON_HEADERS, tags: { endpoint: "watch_events", kind: "write" } },
  );
  check(res, { "recordWatchEvent: 201": (r) => r.status === 201 });
  return res;
}

/** PUT /words/:wordId/saved — WRITE, idempotent. */
export function saveWord(wordId, userId, sourceSegmentId) {
  const body = sourceSegmentId ? { userId, sourceSegmentId } : { userId };
  const res = http.put(`${BASE_URL}/words/${wordId}/saved`, JSON.stringify(body), {
    headers: JSON_HEADERS,
    tags: { endpoint: "words_saved", kind: "write" },
  });
  check(res, { "saveWord: 2xx": (r) => r.status >= 200 && r.status < 300 });
  return res;
}

/** DELETE /words/:wordId/saved?userId= — WRITE, idempotent. */
export function unsaveWord(wordId, userId) {
  const res = http.del(`${BASE_URL}/words/${wordId}/saved?userId=${userId}`, null, {
    tags: { endpoint: "words_saved", kind: "write" },
  });
  check(res, { "unsaveWord: 2xx": (r) => r.status >= 200 && r.status < 300 });
  return res;
}

/** GET /words/saved?userId= — READ. Yeni oluşturulmuş anonymous user'lar için boş dizi döner, bu BEKLENEN (bkz. README sınırlamalar). */
export function getSavedWords(userId) {
  const res = http.get(`${BASE_URL}/words/saved?userId=${userId}`, { tags: { endpoint: "words_saved_list", kind: "read" } });
  check(res, { "getSavedWords: 200": (r) => r.status === 200 });
  return res;
}

/** GET /words/review?userId= — READ. */
export function getReviewSession(userId) {
  const res = http.get(`${BASE_URL}/words/review?userId=${userId}`, { tags: { endpoint: "words_review", kind: "read" } });
  check(res, { "getReviewSession: 200": (r) => r.status === 200 });
  return res;
}

/** POST /words/:wordId/review — WRITE. */
export function recordWordReview(wordId, userId, correct) {
  const res = http.post(`${BASE_URL}/words/${wordId}/review`, JSON.stringify({ userId, correct }), {
    headers: JSON_HEADERS,
    tags: { endpoint: "words_review_record", kind: "write" },
  });
  check(res, { "recordWordReview: 200": (r) => r.status === 200 });
  return res;
}

/** GET /words/progress?userId= — READ. */
export function getProgress(userId) {
  const res = http.get(`${BASE_URL}/words/progress?userId=${userId}`, { tags: { endpoint: "words_progress", kind: "read" } });
  check(res, { "getProgress: 200": (r) => r.status === 200 });
  return res;
}

/** POST /quizzes/:quizId/answer — WRITE. optionId GERÇEK bir quiz item'ının options[]'ından seçilmeli (feed response'undan) — UYDURULMUŞ bir uuid DEĞİL. */
export function answerQuiz(quizId, optionId, userId) {
  const res = http.post(`${BASE_URL}/quizzes/${quizId}/answer`, JSON.stringify({ optionId, userId }), {
    headers: JSON_HEADERS,
    tags: { endpoint: "quiz_answer", kind: "write" },
  });
  check(res, { "answerQuiz: 200": (r) => r.status === 200 });
  return res;
}
