# İçerik yayın akışı (approved → R2 → DB) ve bilinen riskler

Bu belge `publish-content.ts` / `approved-artifact.ts` / `report-r2-orphans.ts` akışının operasyonel sözleşmesidir.

## Veri akışı

```
scripts/stt/output/<id>/draft.json         (STT, gitignore)
  → enrich-transcript (Gemini)
src/content-enrichment/output/<id>/enriched.json   (AI çıktısı; üretilmiş/geçici; production kaynağı DEĞİL)
  → node dist/content-enrichment/promote-content.js --content-id <id> [--acknowledge-needs-review --note "…"] [--overwrite] [--media-file <dosya.mp4>]
src/content-enrichment/approved/<id>.json  (version-controlled; Zod v2 şema; media.localFileName zorunlu)
  → node dist/content-enrichment/publish-content.js --content-id <id> --check      (DB/R2'ye yazmaz)
  → node dist/content-enrichment/publish-content.js --content-id <id>              (R2'ye yükle → DB transaction)
```

Hiçbir publish yolu (CLI, HTTP) `output/` okumaz; tek istisna production-guard'lı `--from-output`'tur
(`NODE_ENV=production` altında yalnızca `ALLOW_UNAPPROVED_CONTENT_PUBLISH=true` ile).

## R2 ↔ DB sırası ve sahiplik

`publishApprovedContent`: (1) approved çöz + taze quality, (2) idempotency (zaten yayımlanmışsa upload YOK), (3) **R2'ye yükle**,
(4) DB transaction (`storage_key` ile). Her upload denemesi benzersiz anahtar (`originals/<contentId>/<uuid>.mp4`) kullanır; iki eşzamanlı
publish'te DB unique constraint'i tek kazananı belirler, kaybeden YALNIZCA kendi yüklediği anahtarı siler ve `PublishAlreadyExistsError`
(HTTP 409) alır. Kazananın DB'de referans verdiği nesne hiçbir yolla silinmez
(bkz. `publish-concurrency.integration.spec.ts`).

## Bilinen kalan risk: crash orphan'ı

R2 upload'ı başarılı olup **process DB işleminden önce tamamen kapanırsa** (SIGKILL, güç kesintisi, deploy sırasında öldürülme)
telafi (silme) kodu hiç çalışmaz ve R2'de DB'de referansı olmayan bir nesne (orphan) kalır. Aynı durum "DB hatası + silme hatası"
için de geçerlidir (bu durumda anahtar hata mesajında raporlanır). Orphan, kullanıcıya görünür bir bozukluk üretmez (DB satırı yok) —
yalnızca depolama maliyeti ve temizlik borcudur. Bu bilinçli olarak MVP'de **outbox/distributed lock olmadan** kabul edilmiştir.

## Orphan raporu (read-only / dry-run)

```
node dist/content-admin/report-r2-orphans.js [--prefix originals/] [--min-age-minutes 60] [--json]
```

- R2'de `prefix` altını LIST eder, DB'den `videos.storage_key` SELECT eder, karşılaştırır.
- **Hiçbir şeyi silmez/değiştirmez**; silme/uygulama bayrağı yoktur (`--delete`/`--apply` bilinmeyen argümandır).
- `minAge`'den genç referanssız nesneler (devam eden publish olabilir) orphan SAYILMAZ, ayrı raporlanır.
- Ters yönü de raporlar: DB'de referansı olup R2'de olmayan anahtar (oynatılamaz video).
- Env: `DATABASE_URL` + `R2_*`.

## Sonraki chunk planı (bu turda YAPILMADI): kontrollü orphan temizliği

1. Raporun adaylarını insan onayıyla bir "silinecekler" listesine (JSON) dönüştüren `--export` adımı.
2. Liste üzerinde çalışan, varsayılan dry-run bir `cleanup-r2-orphans` komutu: her anahtar için silmeden hemen önce DB'de yeniden
   `SELECT` (TOCTOU koruması), `minAge` ≥ 24 saat, tek seferde en fazla N nesne, her silmeyi audit log'a yazma.
3. İsteğe bağlı: publish'e upload öncesi "intent" kaydı (outbox) yalnızca orphan oranı ölçülebilir şekilde sorun olursa.
