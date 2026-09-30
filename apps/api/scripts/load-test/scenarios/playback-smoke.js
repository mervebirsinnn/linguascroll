// AYRI, OPSİYONEL script — kullanıcının açık talimatı: "R2/video playback
// load testini API testinden AYRI tasarla. 100/250/500 kullanıcının MP4'leri
// TAMAMEN indirmesini DEFAULT test yapma." Bu yüzden:
//   - read-only.js / full-journey.js'in stage merdivenine (10→500) HİÇ dahil
//     DEĞİL, kendi (çok düşük, sabit) VU sayısıyla ayrı çalıştırılıyor.
//   - MP4'ü TAMAMEN indirmiyor — sadece küçük bir Range isteğiyle (ilk 64KB)
//     R2/workers.dev'in playback URL'lerini SERVE EDEBİLDİĞİNİ doğruluyor
//     (bkz. resolve-playback-url.ts / content-admin/r2-storage.service.ts —
//     gerçek workers.dev URL formatı, uydurulmadı).
//   - Bu, API server'ın (Render) YÜKÜNÜ değil, R2/CDN'in davranışını ölçer —
//     iki farklı sistem, kasıtlı olarak ayrı script.
import http from "k6/http";
import { check, sleep } from "k6";
import { BASE_URL } from "../lib/config.js";

const PLAYBACK_SMOKE_VUS = parseInt(__ENV.PLAYBACK_SMOKE_VUS || "5", 10);
const PLAYBACK_SMOKE_DURATION = __ENV.PLAYBACK_SMOKE_DURATION || "1m";
/** İlk 64KB'lık bir Range — "gerçekten byte akıtıyor mu" sorusuna cevap vermeye yeter, tam dosya indirmeye gerek yok. */
const RANGE_BYTES = 65536;

export const options = {
  scenarios: {
    playback_smoke: {
      executor: "constant-vus",
      vus: PLAYBACK_SMOKE_VUS,
      duration: PLAYBACK_SMOKE_DURATION,
    },
  },
  thresholds: {
    http_req_failed: ["rate<0.05"],
  },
};

export default function () {
  // Kullanıcısız, sabit bir userId gerekmiyor — sadece feed'den GERÇEK
  // playbackUrl'ler toplanıyor. Bootstrap her VU için bir kez.
  const anon = http.post(`${BASE_URL}/users/anonymous`, null, { tags: { endpoint: "users_anonymous" } });
  if (anon.status !== 201) {
    return;
  }
  const userId = JSON.parse(anon.body).id;

  const feedRes = http.get(`${BASE_URL}/feed?userId=${userId}`, { tags: { endpoint: "feed" } });
  if (feedRes.status !== 200) {
    return;
  }
  const feed = JSON.parse(feedRes.body);
  const videoItems = feed.items.filter((item) => item.type === "video");

  for (const item of videoItems) {
    const res = http.get(item.video.playbackUrl, {
      headers: { Range: `bytes=0-${RANGE_BYTES - 1}` },
      tags: { endpoint: "r2_playback_range" },
    });
    check(res, {
      "playback range: 206 veya 200": (r) => r.status === 206 || r.status === 200,
    });
    sleep(1);
  }
}
