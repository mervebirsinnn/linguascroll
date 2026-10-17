"""Konuşma zamanlaması için tek source-of-truth (yalnızca stdlib).

TTS (edge-tts) parçaları baştaki/sondaki sessizlik içerir; konuşmacı ışığını script zamanına ya da
clip başlangıcına bağlamak ışığı sesten ÖNCE yakar. Burada her parçanın GERÇEK konuşma başlangıcı/bitişi
(speech onset/offset) PCM dalga biçiminden ölçülür; timeline'a clipStartMs eklenerek speechStartMs/
speechEndMs üretilir. Aynı değerler (1) video render'ında highlight aralığı, (2) üretilen timing
metadata'sı için kullanılır. Highlight aralığı yarı-açıktır: [speechStartMs, speechEndMs).
"""
from __future__ import annotations

import array
import math
import subprocess
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Callable, Iterable, Sequence

SAMPLE_RATE = 16000
WINDOW_MS = 10
# Konuşma eşiği: 10 ms pencerenin RMS'i bu dBFS'in üstündeyse "ses var". TTS sessizliği sayısal sıfıra
# yakındır; yumuşak başlayan hecelerin yakalanması için ffmpeg silencedetect'in (-35 dB genlik) biraz altında.
SPEECH_THRESHOLD_DB = -40.0
# Ayrıca pencerenin TEPE genliği bu dBFS'i aşarsa pencere "ses var" sayılır. Neden: TTS konuşmanın ardından RMS'i düşük (-43 dB) ama
# tepeleri -35 dBFS'i aşan küçük bir artefakt/nefes bırakabiliyor; bağımsız doğrulayıcı (ffmpeg silencedetect -35 dB) bunu SES sayar.
# Üretici ve doğrulayıcı aynı duyarlılık sınıfında olmalı (ışık, doğrulayıcının duyduğu sesten önce sönmesin) — keyfi gecikme eklenmez.
PEAK_THRESHOLD_DB = -35.0
# Tek pencerelik tıklama/artefaktı konuşma sayma: en az bu kadar ardışık pencere gerekir.
MIN_SPEECH_WINDOWS = 2


@dataclass(frozen=True)
class SpeechBounds:
    onset_ms: int
    offset_ms: int


@dataclass(frozen=True)
class Turn:
    """Timeline'daki bir konuşma turu. Tüm değerler ms ve timeline (video) zamanındadır."""

    index: int
    speaker: str
    slot: int
    text: str
    clipStartMs: int
    clipEndMs: int
    speechStartMs: int
    speechEndMs: int

    def to_metadata(self) -> dict:
        return asdict(self)


def decode_pcm(path: Path) -> array.array:
    """ffmpeg ile mono/16 kHz s16le PCM'e çevirir."""
    raw = subprocess.run(
        ["ffmpeg", "-v", "error", "-i", str(path), "-ac", "1", "-ar", str(SAMPLE_RATE), "-f", "s16le", "-"],
        capture_output=True,
        check=True,
    ).stdout
    samples = array.array("h")
    samples.frombytes(raw[: len(raw) // 2 * 2])
    return samples


def window_levels(samples: Sequence[int], sample_rate: int = SAMPLE_RATE, window_ms: int = WINDOW_MS) -> list[tuple[float, float]]:
    """Her pencere için (rmsDbfs, peakDbfs)."""
    size = max(1, sample_rate * window_ms // 1000)
    levels: list[tuple[float, float]] = []
    for start in range(0, len(samples), size):
        chunk = samples[start : start + size]
        if not chunk:
            continue
        mean_square = sum(s * s for s in chunk) / len(chunk)
        rms = math.sqrt(mean_square) / 32768.0
        peak = max(abs(s) for s in chunk) / 32768.0
        levels.append((20 * math.log10(rms) if rms > 0 else -120.0, 20 * math.log10(peak) if peak > 0 else -120.0))
    return levels


def window_dbfs(samples: Sequence[int], sample_rate: int = SAMPLE_RATE, window_ms: int = WINDOW_MS) -> list[float]:
    """Geriye dönük uyumluluk: yalnızca RMS dBFS."""
    return [rms for rms, _peak in window_levels(samples, sample_rate, window_ms)]


def find_speech_bounds(
    samples: Sequence[int],
    sample_rate: int = SAMPLE_RATE,
    threshold_db: float = SPEECH_THRESHOLD_DB,
    window_ms: int = WINDOW_MS,
    min_windows: int = MIN_SPEECH_WINDOWS,
) -> SpeechBounds:
    """İlk ve son konuşma penceresinin sınırları (ms). Sessiz girdi için ValueError."""
    levels = window_levels(samples, sample_rate, window_ms)
    loud = [rms > threshold_db or peak > PEAK_THRESHOLD_DB for rms, peak in levels]
    runs: list[tuple[int, int]] = []
    start = None
    for i, is_loud in enumerate(loud + [False]):
        if is_loud and start is None:
            start = i
        elif not is_loud and start is not None:
            if i - start >= min_windows:
                runs.append((start, i))
            start = None
    if not runs:
        raise ValueError("Konuşma bulunamadı (parça tamamen sessiz)")
    return SpeechBounds(onset_ms=runs[0][0] * window_ms, offset_ms=runs[-1][1] * window_ms)


def measure_speech_bounds(path: Path) -> SpeechBounds:
    return find_speech_bounds(decode_pcm(path))


def build_turns(
    parts: Iterable[tuple[str, int, str]],
    measure: Callable[[int], SpeechBounds],
    lead_ms: int,
    gap_ms: int,
    clip_duration_ms: Callable[[int], int],
) -> list[Turn]:
    """parts: (speaker, slot, text) sırasıyla; clip'ler lead_ms'te başlayıp aralarında gap_ms bırakılarak dizilir.

    `measure(i)` i. parçanın klip-içi onset/offset'ini, `clip_duration_ms(i)` klip uzunluğunu verir.
    Sabit/keyfi bir gecikme YOK: speechStartMs = clipStartMs + ÖLÇÜLEN onset.
    """
    turns: list[Turn] = []
    t = lead_ms
    for i, (speaker, slot, text) in enumerate(parts):
        bounds = measure(i)
        duration = clip_duration_ms(i)
        turns.append(
            Turn(
                index=i,
                speaker=speaker,
                slot=slot,
                text=text,
                clipStartMs=t,
                clipEndMs=t + duration,
                speechStartMs=t + bounds.onset_ms,
                speechEndMs=t + min(bounds.offset_ms, duration),
            )
        )
        t += duration + gap_ms
    return turns


def active_slots_at(turns: Sequence[Turn], t_ms: float) -> list[int]:
    """t_ms anında yanan slot'lar; aralık yarı-açık [speechStartMs, speechEndMs)."""
    return sorted({turn.slot for turn in turns if turn.speechStartMs <= t_ms < turn.speechEndMs})


def enable_expression(turns: Sequence[Turn], slot: int) -> str:
    """ffmpeg `enable` ifadesi: gte(t,S)*lt(t,E) toplamı (yarı-açık). Boşsa '0'."""
    terms = [f"gte(t,{t.speechStartMs / 1000:.3f})*lt(t,{t.speechEndMs / 1000:.3f})" for t in turns if t.slot == slot]
    return "+".join(terms) if terms else "0"
