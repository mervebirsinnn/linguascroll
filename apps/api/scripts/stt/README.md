# STT pipeline (Chunk 11)

Gerçek insan konuşmalı bir videodan otomatik, senkron transcript taslağı üretir. Bu, NestJS uygulamasının bir parçası **değildir** — DB'ye, feed'e veya mobile'a hiçbir şey yazmaz (bkz. Chunk 11 sonuç raporundaki "scope dışı" bölümü).

## Gereksinimler

- **Python** 3.11+, **ffmpeg**/**ffprobe** PATH'te, **faster-whisper** (`pip install -r requirements.txt`).
- İlk çalıştırmada STT modeli (`small`, ~500MB, multilingual) otomatik olarak internetten iner ve yerel bir cache'te (repo dışında) kalır — sonraki çalıştırmalar offline'dır.

## Input

Kendi izniniz olan / kullanım hakkınız olan, **15–60 saniye**, anlaşılır İngilizce konuşma içeren bir video dosyasını `input/` klasörüne bırakın (izin verilen uzantılar: `.mp4`, `.mov`, `.mkv`, `.webm`, `.m4v`). Bu aralığın dışındaki bir video ffmpeg/STT hiç çalışmadan reddedilir.

## Çalıştırma

```
pnpm --filter @linguascroll/api stt:process
```

`input/`'da tam olarak bir dosya varsa otomatik seçilir. Seçenekler:

- `--input <yol>` — belirli bir dosyayı işaret eder (`input/` dışında bir yol da olabilir).
- `--keep-temp` — `tmp/<run-id>/` klasörünü (wav + ham candidate JSON) silmeden bırakır (varsayılan: silinir).
- `--content-id <id>` — çıktı klasörünün adı (varsayılan: dosya adından türetilir).

## Çıktı

`output/<content-id>/` — SADECE her şey başarıyla tamamlandıktan sonra, tek bir atomic işlemle oluşur (yarım/kısmi bir klasör asla görünmez, var olan bir klasörün üzerine sessizce yazılmaz):

- `draft.json` — ordinal/startMs/endMs/text segment listesi + `languageStatus`.
- `preview.srt` — aynı segmentlerden üretilen standart altyazı dosyası (bir video oynatıcıda senkronu gözle/kulakla doğrulamak için).

## `languageStatus` ne anlama gelir?

- `ready` — İngilizce, yeterli confidence.
- `needsReview` — İngilizce ama düşük confidence, YA DA dil belirsiz.
- `rejected` — İngilizce değil (yüksek confidence ile).

Bu chunk'ta hiçbir durum için otomatik bir "approve/publish" adımı yoktur — `draft.json` her durumda üretilir, sonraki adım (varsa) her zaman insan review'ı gerektirir.

## Bu pipeline'ın YAPMADIĞI şeyler

DB'ye yazmaz, `explanation`/`learningPoint`/quiz üretmez, mobile'a hiçbir şekilde dokunmaz, `output/`'u otomatik olarak feed'e/seed'e bağlamaz.
