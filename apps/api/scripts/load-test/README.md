# LinguaScroll k6 load test

Standalone araç — `apps/api/scripts/stt` ile AYNI konvansiyon: NestJS app'in
bir parçası DEĞİL, hiçbir `package.json`'a runtime/build dependency olarak
eklenmedi. [k6](https://k6.io) harici bir binary — çalıştırmak için sisteminizde
kurulu olması gerekir (`brew install k6` / [k6.io/docs/get-started/installation](https://k6.io/docs/get-started/installation)).

## Ne test ediyor, ne test ETMİYOR

Tüm endpoint'ler repodan doğrulandı (`apps/api/src/*/*.controller.ts` +
`packages/shared-types/src/*.ts`) — hiçbiri uydurulmadı:

| Adım (kullanıcının istediği 9 adım) | Gerçek endpoint |
|---|---|
| 1. anonymous user oluştur | `POST /users/anonymous` |
| 2-3. feed aç + pagination | `GET /feed?userId=&cursor=` |
| 4. transcript/learning content oku | **ayrı bir endpoint YOK** — `GET /feed` response'unun içinde geliyor (`FeedPlayableVideo.segments`/`.vocabulary`/`.learningPoints`) |
| 5. videolar arası bekleme | `sleep()` (think-time), network call değil |
| 6. watch event gönder | `POST /videos/:videoId/watch-events` |
| 7. word save/unsave | `PUT` / `DELETE /words/:wordId/saved` |
| 8. quiz answer | `POST /quizzes/:quizId/answer` |
| 9. progress/memory/review | `GET /words/saved`, `GET /words/review`, `GET /words/progress`, `POST /words/:wordId/review` |

**`content-admin/*` HİÇBİR script'te YOK ve asla test edilmiyor** (kullanıcının
açık güvenlik talimatı). Gemini enrichment çağrılmıyor, secret hiçbir yere
yazılmıyor, destructive/silme endpoint'i yok (zaten API'de böyle bir endpoint
mevcut değil — repo'da videos/quizzes/words için DELETE sadece `words/:id/saved`,
o da "bu kaydı sil" değil "unsave" — idempotent, zararsız).

## Dosyalar

```
scripts/load-test/
  lib/config.js           BASE_URL, stage tanımları, threshold'lar, think-time
  lib/api.js               Her gerçek endpoint için ince bir http wrapper
  scenarios/read-only.js   PRODUCTION-SAFE, 100/250/500'e ölçeklenmesi amaçlanan
  scenarios/full-journey.js Gerçekçi TAM akış (write'lar dahil) — bkz. aşağıdaki uyarı
  scenarios/playback-smoke.js R2/CDN — AYRI, opsiyonel, stage merdivenine dahil DEĞİL
```

## Production Data Impact (ÖNEMLİ — çalıştırmadan önce okuyun)

**`read-only.js`**: VU-iterasyonu başına **TEK** yazma — `POST /users/anonymous`
(kaçınılmaz: `GET /feed`, var olan bir `userId` olmadan çalışmıyor). Başka
hiçbir mutating çağrı yok. 500 VU × birkaç iterasyon = birkaç bin yeni
anonymous `users` satırı — bu, gerçek mobil onboarding trafiğiyle AYNI şekil,
zararsız, PII yok.

**`full-journey.js`**: VU-iterasyonu başına KABACA (varsayılan
`PAGES_PER_SESSION=3`, `PAGE_SIZE=12` ile ~30-36 item):
- 1 × `users` satırı
- ~24-30 × `video_watch_events` (her video item için bir tane)
- ~7-9 × `saved_words` (word başına %30 olasılık)
- ~8-12 × `quiz_answer_events` (feed'in 2:1 video:quiz cadence'i, CLAUDE.md)
- 0-1 × `word_reviews`

Bir VU, think-time'lar (video başına 2-6s) yüzünden bu tam akışı yaklaşık
1.5-3 dakikada tamamlıyor. **500-VU aşamasının 5 dakikalık hold süresinde**,
her VU ~2 iterasyon tamamlayabilir → **~500 × 2 × (~50 satır) ≈ 50.000 yeni
satır** — bu KÜÇÜMSENMEMELİ.

**ÖNERİ (repoda ZORUNLU kılınmadı, bilinçli bir kullanıcı kararı):**
- `read-only.js`'i tüm merdivende (smoke→500) güvenle çalıştırın.
- `full-journey.js`'i SADECE `K6_PROFILE=smoke|baseline|10|25|50` ile
  çalıştırın — 100/250/500'e SADECE bu yazma hacmini bilerek/kabul ederek
  geçin (`K6_PROFILE=100` gibi tek bir yüksek seviyeyi izole çalıştırabilirsiniz).
- Test sonrası, gerçek kullanıcı verisiyle KARIŞMAMASI için bu satırların
  ayıklanması gerekiyorsa: tüm test kullanıcıları `POST /users/anonymous`'tan
  geliyor ve API'de "created_at" gibi bir alan `users` şemasında var mı YOK
  mu ayrı bir soru — bu script bunu garanti ETMİYOR, temizlik ayrı bir adım.

## Nasıl çalıştırılır

```bash
# Önce k6 kurulu olmalı: k6 version

# 1) SMOKE — her zaman ÖNCE bu (1 VU, ~70s), gerçek p50/p95 baseline'ını verir
K6_PROFILE=smoke pnpm run loadtest:read

# 2) Baseline'ı gözden geçirip config.js'teki THRESHOLDS'u sıkılaştırın
#    (bkz. aşağıdaki "Threshold'ları sıkılaştırma").

# 3) Tek tek, artan seviyeler (kullanıcının talimatı: "bir anda 500'e çıkma")
K6_PROFILE=10  pnpm run loadtest:read
K6_PROFILE=25  pnpm run loadtest:read
K6_PROFILE=50  pnpm run loadtest:read
K6_PROFILE=100 pnpm run loadtest:read
K6_PROFILE=250 pnpm run loadtest:read
K6_PROFILE=500 pnpm run loadtest:read

# 4) İsterseniz tüm merdiveni TEK çalıştırmada (K6_PROFILE verilmezse "full"):
pnpm run loadtest:read

# 5) Yazma senaryosu — SADECE düşük seviyeler (bkz. yukarıdaki uyarı)
K6_PROFILE=10 pnpm run loadtest:full

# 6) R2/playback — AYRI, düşük VU'lu, opsiyonel
pnpm run loadtest:playback

# Farklı bir hedefe karşı denemek için (örn. lokal API):
BASE_URL=http://localhost:3000 K6_PROFILE=smoke pnpm run loadtest:read

# Programatik analiz / HTTP status dağılımı için (bkz. aşağıdaki "İzleme"):
K6_PROFILE=smoke k6 run --summary-export=summary.json scripts/load-test/scenarios/read-only.js
```

## Threshold'ları sıkılaştırma

`lib/config.js`'teki `THRESHOLDS` BİLİNÇLİ OLARAK gevşek/tripwire
niteliğinde (`http_req_failed rate<0.05`, `http_req_duration p(95)<5000ms`)
— "p95 < 200ms" gibi hiçbir ölçüme dayanmayan bir rakam koymadık. Smoke/
baseline koşusundan sonra k6'nın çıktısındaki GERÇEK `http_req_duration`
p50/p95/p99'u (endpoint bazında: `tags.endpoint` — feed/watch_events/
words_saved/quiz_answer/vb.) okuyup `THRESHOLDS`'u o rakamlara göre
sıkılaştırın (örn. `'http_req_duration{endpoint:feed}': ['p(95)<800']`).

## İzleme — test sırasında Render + Neon'da neye bakmalısınız

**Render (API instance):**
- CPU kullanımı (Render dashboard → Metrics) — sürekli %90+ ise instance
  boyutu yetersiz.
- Memory kullanımı — sürekli artıp düşmüyorsa (leak) veya limit'e
  çarpıyorsa restart tetiklenir.
- **Instance restart/crash olayları** — Render dashboard → Events; bir OOM
  kill veya health-check-fail restart'ı GERÇEK bir kapasite sınırı sinyalidir.
- Cold start — Render'ın free/hobby tier'ı boşta kalınca uyuyabilir; SMOKE
  aşamasındaki İLK isteğin anormal derecede yavaş olması bundan olabilir,
  yorumlarken hesaba katın.

**Neon (Postgres):**
- **Connection pool exhaustion** — Neon dashboard → Monitoring →
  "Active connections" / "Connections used"; `DatabaseModule`'ün pool
  boyutu (apps/api/src'te tanımlı) aşılırsa yeni istekler kuyruklanır/timeout
  olur — bu genelde önce YÜKSEK EŞZAMANLI (250/500) aşamalarda görülür.
- CPU / compute kullanımı — Neon'un serverless autoscale davranışı; sürekli
  tavana yapışıyorsa compute size yetersiz.
- Memory.
- **Slow queries** — Neon'un "Query insights" / pg'nin kendi
  `pg_stat_statements`'ı varsa; feed endpoint'i en ağır sorgu adayı (video/quiz/
  vocabulary/segment batch resolve, bkz. FeedService.buildPage).
- Autoscale/suspend olayları — Neon compute 0'a inip tekrar uyanıyorsa, bu
  da smoke'taki ilk isteği yanıltıcı şekilde yavaş gösterebilir.

k6 tarafında ise `http_req_duration` (endpoint tag'i ile), `http_req_failed`,
`http_reqs` (req/sec için: `http_reqs` count / test süresi — k6 varsayılan
özet çıktısında bunu zaten `http_reqs...: N (X.XX/s)` şeklinde veriyor),
`checks` (assertion başarı oranı) end-of-run summary'de otomatik görünür.
