"""Eski ve staging MP4'lerin ses izini AYNI kayıpsız PCM biçimine (s16le, 44.1 kHz, stereo, header'sız) çıkarıp SHA-256 karşılaştırır.

Hash aynıysa konuşma timeline'ı bit-bit aynıdır → mevcut Whisper draft zamanları korunur.
Hash FARKLIYSA farkın yalnızca container/encoding kaynaklı olduğu VARSAYILMAZ; timeline şöyle ölçülür:
  * 1 ms çözünürlüklü tepe-genlik zarfı (dBFS) iki ses için çıkarılır;
  * staging'in HER konuşma turu (timing/<id>.json: clipStartMs..clipEndMs) için, eski sesteki karşılığı ±MAX_LAG_MS içinde kaydırılarak
    ortalama |dB farkı| en küçük olan lag (tur başına gerçek kayma) ve artık fark (residual) bulunur;
  * hepsi |lag| <= TIMELINE_TOLERANCE_MS ve residual <= RESIDUAL_TOLERANCE_DB ise konuşma timeline'ı AYNIDIR; değilse ilgili video için
    STT yeniden çalıştırılmalıdır.
Neden silencedetect bölge sayısı kullanılmıyor: -35 dB / 100 ms eşiğinde sınırda duran duraklar sayıca bölünüp birleşebilir (dedektör gürültüsü),
timeline değişimi olmadan "bölge sayısı" değişir. Süre farkı (durationDeltaMs) AAC kare kuantizasyonu (1024/44100 ≈ 23 ms) içerdiğinden
yalnızca bilgi amaçlıdır; konuşma bitişi zarf hizalamasından ayrıca ölçülür.
20 ms: Whisper zaman çözünürlüğü; altındaki kayma STT çıktısında ayırt edilemez.

Kullanım: python audio_equivalence.py <eski-dizin> <staging-dizin> [--json rapor.json]
"""
from __future__ import annotations

import hashlib
import json
import math
import subprocess
import sys
from pathlib import Path
from typing import Sequence

from speech_timing import decode_pcm

TIMELINE_TOLERANCE_MS = 20
RESIDUAL_TOLERANCE_DB = 2.0
MAX_LAG_MS = 60
ACTIVE_FLOOR_DB = -45.0  # iki zarftan biri bunun üstündeyse blok karşılaştırmaya girer
CLAMP_DB = -60.0  # çok sessiz bölgelerdeki büyük dB farkları sonucu bozmasın
PAD_MS = 100


def pcm_sha256(video: Path) -> str:
    """Ses izi → s16le/44.1 kHz/stereo ham PCM (WAV header/container yok) → SHA-256."""
    digest = hashlib.sha256()
    process = subprocess.Popen(
        ["ffmpeg", "-v", "error", "-i", str(video), "-vn", "-map", "0:a:0", "-c:a", "pcm_s16le", "-ar", "44100", "-ac", "2", "-f", "s16le", "-"],
        stdout=subprocess.PIPE,
    )
    assert process.stdout is not None
    for chunk in iter(lambda: process.stdout.read(1 << 20), b""):
        digest.update(chunk)
    if process.wait() != 0:
        raise RuntimeError(f"ses çıkarılamadı: {video}")
    return digest.hexdigest()


def duration_ms(video: Path) -> int:
    out = subprocess.check_output(["ffprobe", "-v", "error", "-select_streams", "a:0", "-show_entries", "stream=duration", "-of", "csv=p=0", str(video)]).decode().strip()
    return round(float(out) * 1000)


def envelope_db(samples: Sequence[int], block: int = 16) -> list[float]:
    """1 ms (16 kHz'te 16 örnek) tepe-genlik zarfı, dBFS."""
    levels: list[float] = []
    for start in range(0, len(samples) - block + 1, block):
        peak = max(abs(s) for s in samples[start : start + block]) / 32768.0
        levels.append(max(20 * math.log10(peak), CLAMP_DB) if peak > 0 else CLAMP_DB)
    return levels


def align_window(old_env: Sequence[float], new_env: Sequence[float], start_ms: int, end_ms: int, max_lag_ms: int = MAX_LAG_MS) -> tuple[int, float]:
    """new_env[start:end] penceresine en iyi uyan old_env kaymasını (lag ms; + = eski, yeniye göre GEÇ) ve residual'ı (ort. |dB|) döndürür."""
    start_ms, end_ms = max(0, start_ms), min(len(new_env), end_ms)
    best_lag, best_residual = 0, float("inf")
    for lag in range(-max_lag_ms, max_lag_ms + 1):
        total, count = 0.0, 0
        for t in range(start_ms, end_ms):
            o_index = t + lag
            if o_index < 0 or o_index >= len(old_env):
                continue
            o, n = old_env[o_index], new_env[t]
            if max(o, n) > ACTIVE_FLOOR_DB:
                total += abs(o - n)
                count += 1
        residual = total / count if count else float("inf")
        if residual < best_residual:
            best_lag, best_residual = lag, residual
    return best_lag, best_residual


def decide(same: bool, turn_alignments: Sequence[tuple[int, float]]) -> tuple[str, int | None, float | None]:
    """(transcriptAction, maxAbsLagMs, maxResidualDb). turn_alignments: [(lagMs, residualDb)] — tur başına."""
    if same:
        return "keep-draft (ses PCM'i bit-bit aynı)", 0, 0.0
    if not turn_alignments:
        return "RE-RUN STT (hizalanacak konuşma turu bulunamadı)", None, None
    max_lag = max(abs(lag) for lag, _ in turn_alignments)
    max_residual = max(residual for _, residual in turn_alignments)
    if max_lag <= TIMELINE_TOLERANCE_MS and max_residual <= RESIDUAL_TOLERANCE_DB:
        return f"keep-draft (hash farklı; timeline AYNI: tur başına max |lag| {max_lag} ms ≤ {TIMELINE_TOLERANCE_MS}, residual {max_residual:.2f} dB ≤ {RESIDUAL_TOLERANCE_DB})", max_lag, max_residual
    return f"RE-RUN STT (timeline değişti: max |lag| {max_lag} ms, residual {max_residual:.2f} dB)", max_lag, max_residual


def compare(old: Path, new: Path, timing_dir: Path | None) -> dict:
    old_hash, new_hash = pcm_sha256(old), pcm_sha256(new)
    same = old_hash == new_hash
    alignments: list[tuple[int, float]] = []
    if not same:
        old_env, new_env = envelope_db(decode_pcm(old)), envelope_db(decode_pcm(new))
        turns = None
        if timing_dir is not None and (timing_dir / f"{new.stem}.json").exists():
            turns = json.loads((timing_dir / f"{new.stem}.json").read_text(encoding="utf8"))["turns"]
        windows = [(t["clipStartMs"] - PAD_MS, t["clipEndMs"] + PAD_MS) for t in turns] if turns else [(0, len(new_env))]
        alignments = [align_window(old_env, new_env, start, end) for start, end in windows]
    action, max_lag, max_residual = decide(same, alignments)
    return {
        "videoId": old.stem,
        "oldAudioHash": old_hash,
        "newAudioHash": new_hash,
        "same": same,
        "durationDeltaMs": duration_ms(new) - duration_ms(old),
        "turnLagsMs": [lag for lag, _ in alignments],
        "turnResidualsDb": [round(residual, 2) for _, residual in alignments],
        "maxAbsLagMs": max_lag,
        "maxResidualDb": None if max_residual is None else round(max_residual, 2),
        "transcriptAction": action,
    }


if __name__ == "__main__":
    old_dir, new_dir = Path(sys.argv[1]), Path(sys.argv[2])
    timing = new_dir / "timing"
    results = [compare(old_dir / video.name, video, timing if timing.exists() else None) for video in sorted(new_dir.glob("*.mp4"))]
    print("videoId | oldAudioHash | newAudioHash | same | durationDeltaMs | turnLagsMs | maxResidualDb | transcriptAction")
    for r in results:
        print(f"{r['videoId']} | {r['oldAudioHash'][:16]}… | {r['newAudioHash'][:16]}… | {r['same']} | {r['durationDeltaMs']:+d} | {r['turnLagsMs']} | {r['maxResidualDb']} | {r['transcriptAction']}")
    rerun = [r["videoId"] for r in results if r["transcriptAction"].startswith("RE-RUN")]
    print(f"\nÖZET: hash aynı {sum(r['same'] for r in results)}/{len(results)}; STT yeniden çalıştırılması gereken: {rerun or 'yok'}")
    if "--json" in sys.argv:
        Path(sys.argv[sys.argv.index("--json") + 1]).write_text(json.dumps(results, ensure_ascii=False, indent=2), encoding="utf8")
    sys.exit(1 if rerun else 0)
