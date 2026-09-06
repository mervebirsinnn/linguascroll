#!/usr/bin/env python3
"""
Chunk 11 STT adapter — TEK sorumluluk: verilen bir video/ses dosyasından
ffmpeg ile mono/16kHz WAV çıkarır, faster-whisper ile (word_timestamps=True)
transcribe eder, ve TEKNİK olarak başarılıysa normalize edilmiş bir "candidate"
JSON'u yazar.

BİLİNÇLİ OLARAK dil kabul/reddetme POLİTİKASI YOK: STT teknik olarak
başarılıysa (en az bir kelime üretildiyse) candidate HER ZAMAN yazılır —
detectedLanguage ne olursa olsun, languageProbability ne olursa olsun. "İngilizce
mi, yeterince emin mi" kararı burada YOK, TypeScript tarafında language-status.ts'te
veriliyor (bkz. run-stt-pipeline.ts). Bu script SADECE şu TEKNİK hatalarda
candidate YAZMADAN non-zero exit code döner:
  - input dosyası yok
  - ffmpeg PATH'te yok
  - ffmpeg audio extraction başarısız / audio stream yok
  - model yüklenemedi (network/cache hatası)
  - STT hiç kelime üretmedi (konuşma algılanamadı)

Argümanlar HER ZAMAN liste olarak subprocess'e geçiriliyor (asla shell string
birleştirme) — path injection ve boşluklu Windows path'leri güvenle işleniyor.
"""
import argparse
import json
import os
import shutil
import subprocess
import sys
import time
from pathlib import Path


class TranscribeError(Exception):
    """Teknik bir hata — candidate JSON'u YAZILMAZ, exit code != 0."""


# Chunk 11 review düzeltmesi — bu değerler doğrulanmış bir ölçüme dayanmıyor,
# ürünün "kısa video" hedefine göre seçilmiş başlangıç MVP sınırları.
MIN_DURATION_SECONDS = 15
MAX_DURATION_SECONDS = 60


def check_ffmpeg_available() -> None:
    if shutil.which("ffmpeg") is None:
        raise TranscribeError("ffmpeg PATH'te bulunamadı. Kurulum: https://ffmpeg.org/download.html")


def check_ffprobe_available() -> None:
    if shutil.which("ffprobe") is None:
        raise TranscribeError("ffprobe PATH'te bulunamadı (genellikle ffmpeg ile birlikte kurulur).")


def probe_duration_seconds(input_path: Path) -> float:
    """Gerçek media duration'ı ffprobe ile okur. Okunamıyorsa TranscribeError — devam ETMEZ."""
    try:
        result = subprocess.run(
            ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "default=noprint_wrappers=1:nokey=1", str(input_path)],
            capture_output=True,
            text=True,
            timeout=30,
            check=True,
        )
    except FileNotFoundError as error:
        raise TranscribeError("ffprobe çalıştırılamadı (PATH'te bulunamadı).") from error
    except subprocess.TimeoutExpired as error:
        raise TranscribeError("Video süresi okunamadı — ffprobe 30s içinde tamamlanamadı (timeout).") from error
    except subprocess.CalledProcessError as error:
        stderr = (error.stderr or "").strip()
        raise TranscribeError(f"Video süresi okunamadı (ffprobe başarısız). ffprobe stderr:\n{stderr}") from error

    raw = result.stdout.strip()
    try:
        duration_seconds = float(raw)
    except ValueError as error:
        raise TranscribeError(f"Video süresi okunamadı (ffprobe geçersiz/boş bir değer döndürdü: '{raw}').") from error

    if duration_seconds <= 0:
        raise TranscribeError(f"Video süresi okunamadı (ffprobe {duration_seconds}s gibi anlamsız bir değer döndürdü).")
    return duration_seconds


def has_audio_stream(input_path: Path) -> bool:
    try:
        result = subprocess.run(
            ["ffprobe", "-v", "error", "-select_streams", "a", "-show_entries", "stream=index", "-of", "csv=p=0", str(input_path)],
            capture_output=True,
            text=True,
            timeout=30,
            check=True,
        )
    except FileNotFoundError as error:
        raise TranscribeError("ffprobe çalıştırılamadı (PATH'te bulunamadı).") from error
    except subprocess.TimeoutExpired as error:
        raise TranscribeError("Audio stream kontrolü tamamlanamadı (ffprobe timeout).") from error
    except subprocess.CalledProcessError as error:
        stderr = (error.stderr or "").strip()
        raise TranscribeError(f"Audio stream kontrolü başarısız (ffprobe hatası). ffprobe stderr:\n{stderr}") from error
    return len(result.stdout.strip()) > 0


def validate_media(input_path: Path) -> float:
    """
    Madde 1 (review düzeltmesi): gerçek media duration'ı OKUR, audio stream
    yoksa AÇIK hata verir, 15-60sn dışındaki videoları REDDEDER. Bu kontroller
    ffmpeg extraction/STT'den ÖNCE çalışır — hem daha ucuz (fail-fast) hem de
    her hatayı KENDİ net mesajıyla ayırt eder (duration okunamadı / audio yok /
    süre aralık dışı — üçü de farklı, karıştırılmayan mesajlar).
    """
    check_ffprobe_available()
    duration_seconds = probe_duration_seconds(input_path)

    if not has_audio_stream(input_path):
        raise TranscribeError(f"'{input_path}' içinde audio stream yok.")

    if not (MIN_DURATION_SECONDS <= duration_seconds <= MAX_DURATION_SECONDS):
        raise TranscribeError(
            f"Video süresi {duration_seconds:.1f}s — kabul edilen aralık "
            f"[{MIN_DURATION_SECONDS}, {MAX_DURATION_SECONDS}] saniye dışında."
        )
    return duration_seconds


def extract_audio(input_path: Path, wav_path: Path) -> None:
    """Mono/16kHz WAV çıkarır. Argüman LİSTESİ kullanılır — shell=True YOK."""
    wav_path.parent.mkdir(parents=True, exist_ok=True)
    try:
        subprocess.run(
            ["ffmpeg", "-y", "-i", str(input_path), "-vn", "-ac", "1", "-ar", "16000", "-f", "wav", str(wav_path)],
            capture_output=True,
            text=True,
            timeout=120,
            check=True,
        )
    except FileNotFoundError as error:
        raise TranscribeError("ffmpeg çalıştırılamadı (PATH'te bulunamadı).") from error
    except subprocess.TimeoutExpired as error:
        raise TranscribeError("ffmpeg audio extraction 120s içinde tamamlanamadı (timeout).") from error
    except subprocess.CalledProcessError as error:
        stderr = (error.stderr or "").strip()
        raise TranscribeError(
            f"ffmpeg audio extraction başarısız oldu (desteklenmeyen format veya audio stream yok olabilir). "
            f"ffmpeg stderr:\n{stderr}"
        ) from error

    if not wav_path.exists() or wav_path.stat().st_size < 1024:
        raise TranscribeError(
            "ffmpeg bir WAV dosyası üretti ama boş/anlamsız görünüyor — videoda audio stream olmayabilir."
        )


def load_model(model_name: str, device: str, compute_type: str):
    try:
        from faster_whisper import WhisperModel
    except ImportError as error:
        raise TranscribeError(
            "faster-whisper import edilemedi. Kurulum: pip install -r requirements.txt"
        ) from error

    try:
        return WhisperModel(model_name, device=device, compute_type=compute_type)
    except Exception as error:  # noqa: BLE001 - model/network hatasının TAMAMINI net şekilde yüzeye çıkarmak istiyoruz
        raise TranscribeError(
            f"STT modeli ('{model_name}', device={device}, compute_type={compute_type}) yüklenemedi. "
            f"İlk çalıştırmada model dosyası internetten iniyor — ağ bağlantısı yoksa veya "
            f"kesintiye uğradıysa bu adım başarısız olur. Orijinal hata: {error}"
        ) from error


def run_transcription(model, wav_path: Path) -> tuple[list[dict], str, float]:
    try:
        segments_iter, info = model.transcribe(str(wav_path), word_timestamps=True)
        words: list[dict] = []
        for segment in segments_iter:
            for word in segment.words or []:
                words.append({"text": word.word.strip(), "startMs": round(word.start * 1000), "endMs": round(word.end * 1000)})
        return words, info.language, float(info.language_probability)
    except Exception as error:  # noqa: BLE001 - STT çalışma-zamanı hatasının tamamı görünür olmalı
        raise TranscribeError(f"STT transcription başarısız oldu. Orijinal hata: {error}") from error


def write_candidate_atomic(output_path: Path, candidate: dict) -> None:
    """Write-then-rename: yarım/bozuk bir output dosyası ASLA final isimle görünmez."""
    tmp_path = output_path.with_name(output_path.name + ".tmp")
    try:
        tmp_path.parent.mkdir(parents=True, exist_ok=True)
        with open(tmp_path, "w", encoding="utf-8") as f:
            json.dump(candidate, f, ensure_ascii=False, indent=2)
        os.replace(tmp_path, output_path)  # Windows'ta da atomic.
    finally:
        # Python'un KENDİ finally-cleanup sorumluluğu (bkz. cleanup_test.py):
        # rename başarılı olduysa .tmp zaten yok; başarısız olduysa (örn. disk
        # doluysa) sarkan .tmp dosyası burada temizlenir.
        if tmp_path.exists():
            tmp_path.unlink()


def main() -> None:
    parser = argparse.ArgumentParser(description="LinguaScroll STT adapter (faster-whisper)")
    parser.add_argument("--input", required=True, help="Girdi video/ses dosyasının yolu")
    parser.add_argument("--tmp-wav", required=True, help="Çıkarılacak ara WAV dosyasının yolu")
    parser.add_argument("--output", required=True, help="Yazılacak candidate JSON dosyasının yolu")
    parser.add_argument("--model", default="small", help="faster-whisper model adı (varsayılan: small, multilingual)")
    parser.add_argument("--device", default="cpu")
    parser.add_argument("--compute-type", default="int8")
    args = parser.parse_args()

    input_path = Path(args.input)
    if not input_path.exists():
        print(f"HATA: input dosyası bulunamadı: {input_path}", file=sys.stderr)
        sys.exit(1)
    if not input_path.is_file():
        print(f"HATA: input bir normal dosya değil (dizin/özel dosya olabilir): {input_path}", file=sys.stderr)
        sys.exit(1)

    try:
        check_ffmpeg_available()

        print("Video doğrulanıyor (süre + audio stream kontrolü)...", file=sys.stderr)
        duration_seconds = validate_media(input_path)

        print("Ses çıkarılıyor (ffmpeg)...", file=sys.stderr)
        extract_audio(input_path, Path(args.tmp_wav))

        print(f"Model hazırlanıyor ('{args.model}') — ilk çalıştırmada indirme gerekebilir (birkaç yüz MB)...", file=sys.stderr)
        setup_start = time.monotonic()
        model = load_model(args.model, args.device, args.compute_type)
        setup_seconds = time.monotonic() - setup_start

        print("Transcribe ediliyor...", file=sys.stderr)
        transcription_start = time.monotonic()
        words, detected_language, language_probability = run_transcription(model, Path(args.tmp_wav))
        transcription_seconds = time.monotonic() - transcription_start

        if len(words) == 0:
            raise TranscribeError("STT hiç kelime üretmedi — konuşma algılanamadı (sessizlik/gürültü olabilir).")

        candidate = {
            "sourceFile": str(input_path),
            "detectedLanguage": detected_language,
            "languageProbability": language_probability,
            "durationMs": round(duration_seconds * 1000),
            "setupSeconds": round(setup_seconds, 3),
            "transcriptionSeconds": round(transcription_seconds, 3),
            "words": words,
        }
        write_candidate_atomic(Path(args.output), candidate)

        print(
            f"OK: {len(words)} kelime, dil={detected_language} (p={language_probability:.2f}), "
            f"setup={setup_seconds:.1f}s, transcription={transcription_seconds:.1f}s",
            file=sys.stderr,
        )
    except TranscribeError as error:
        print(f"HATA: {error}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
