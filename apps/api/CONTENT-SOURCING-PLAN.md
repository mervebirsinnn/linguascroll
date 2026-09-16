# Chunk 14 — Content Matrix Target & Sourcing Plan

Bu doküman kod tarafından hiç OKUNMUYOR — sadece içerik planlamasını takip etmek için insan-okunabilir bir referans (Chunk 14 audit'inin sonucu). `apps/api/content-provenance.json`, gerçek yayınlanmış her videonun source/rightsBasis/format kaydını tutar; bu dosya ise **hedefi ve boşlukları** takip eder.

## Mevcut durum (15 video, gerçek DB'den doğrulandı)

| Topic | A1 | A2 | B1 | B2 | Toplam |
|---|---|---|---|---|---|
| dating | — | — | — | — | **0** |
| travel | — | 1 | — | — | **1** |
| career | — | 1 | 1 | 3 | 5 |
| lifestyle | — | 2 | 1 | — | 3 |
| humor | 5 | — | — | — | 5 |

Format dağılımı (mevcut 15'in gerçek transcript'lerinden sınıflandırıldı — `content-provenance.json`): **story: 9, explanatory: 6, dialogue: 0, surprisingFact: 0, challenge: 0, naturalSpeech: 0.**

## Hedef dağılım (~50 video, exact constraint DEĞİL — kullanıcı kararı)

CEFR ağırlığı: **A1: 5 (mevcut, artırılmıyor), A2: 12-15, B1: 15-18, B2: 12-15.**

Topic önceliklendirmesi (en büyük açıktan en küçüğe):

1. **dating/relationships** — 0'dan başlıyor, en yüksek öncelik.
2. **travel** — 1'den başlıyor, ikinci öncelik.
3. **lifestyle/career/humor** — dengeleme; **humor'da A1 ağırlığı ARTIRILMIYOR**, yeni humor içeriği B1/B2 seviyesinde ve daha "natural dialogue" tonunda olmalı.

Format çeşitliliği hedefi: mevcut katalıkta **hiç `dialogue` veya `naturalSpeech` yok** — 35 yeni videonun bir kısmı özellikle bu iki formatı hedeflemeli (iki-kişili doğal konuşma / senaryosuz-daha-doğal konuşma), tek-kişi anlatı+açıklama tekelini kırmak için.

**Somut hedef (kaba dağılım, kesin değil):**
- dating: ~8-10 video (A2-B2 karışık)
- travel: ~8-9 video (A2-B2 karışık)
- career: ~6-8 video (A1 hariç, mevcut B2 ağırlığını dengelemek için A2/B1'e öncelik)
- lifestyle: ~6-8 video
- humor: ~5-6 video (B1/B2, A1 DEĞİL)

## Sourcing önceliği (kullanıcı kararı — telif riski KABUL EDİLMİYOR)

1. Ekip/kendi çekimi veya LinguaScroll için özel üretilmiş içerik (mevcut 15'in kaynağıyla AYNI kanal).
2. Doğrulanmış açık lisans/commercial-use hakkı olan gerçek konuşma içeriği.
3. Creator/eğitmenden explicit izin alınmış içerik.

**Kullanılmayacak**: rastgele TikTok/Instagram/Netflix/film-dizi/TED-TEDx/izinsiz YouTube kopyaları. TTS/sentetik ses de kullanılmıyor (Chunk 10→11'de ekibin kendisinin bilinçli olarak terk ettiği bir karar, geri getirilmiyor).

## STT Backlog Workflow (API key gerektirmez, ŞİMDİ başlatılabilir)

Yeni bir video kaynağı elde edildikçe:

1. `apps/api/scripts/stt/input/`'a bırak.
2. `pnpm --filter @linguascroll/api stt:process --content-id <açıklayıcı-id>` çalıştır (gerçek, timestamp'li bir `draft.json` üretir — tamamen yerel/offline, Anthropic API'ye bağımlı DEĞİL).
3. `draft.json`'ı `scripts/stt/output/<content-id>/`'de bekletmeye devam et — bu bir **backlog**: API key geldiğinde, biriken TÜM draft'lar sırayla `pnpm enrich`'ten geçirilebilir.
4. Video dosyasının kendisini + `content-provenance.json`'a bir satır ekle (source/rightsBasis/format).

Bu adımların TAMAMI API erişimi olmadan, video kaynakları geldikçe şimdiden yapılabilir.

## "Re-enrich existing content" — Chunk 14B için önerilen minimal tasarım (implement EDİLMEDİ)

Mevcut 15 videonun vocabulary'sini API key geldiğinde otomasyondan geçirebilmek için `enrich-transcript.ts`/`publish-content.ts`'e küçük bir değişiklik gerekecek:

- **Şu an**: `enrich-transcript.ts` SADECE `scripts/stt/output/<id>/draft.json`'dan okuyor (STT'nin ürettiği format); `publish-content.ts`'in `assertNotAlreadyPublished` kontrolü, zaten yayınlanmış bir `muxAssetId`'yi KOŞULSUZ reddediyor — mevcut video için pipeline'ı OLDUĞU GİBİ tekrar çalıştırmak mümkün değil.
- **Önerilen minimal çözüm**: `enrich-transcript.ts`'e küçük bir `--from-existing <muxAssetId>` modu — DB'deki mevcut `video_transcript_segments`'i (zaten var olan text/timestamp) "draft" olarak kullanıp SADECE LLM enrichment'ı (topic/CEFR/learningPoints/vocabulary/quiz) tekrar üretir; `publish-content.ts`'e de bir `updateContent(db, draft)` fonksiyonu (yeni video insert etmek yerine, mevcut `videoId`'nin vocabulary/learningPoints/quiz'ini MERGE/replace eden, hâlâ TEK transaction'da) eklenmesi gerekir.
- Bu, YENİ bir mimari DEĞİL — mevcut `publishContent`'in transaction/idempotency desenini "insert" yerine "upsert" olarak genişletmek. Küçük, kapsamı net bir değişiklik — ama gerçek API erişimi olmadan test edilemeyeceği için Chunk 14B'ye bırakıldı.
