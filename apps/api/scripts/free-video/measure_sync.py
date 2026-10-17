"""Render edilmiş MP4'ten, TTS/script/metadata'ya GÜVENMEDEN, konuşmacı ışığı ile gerçek ses başlangıcını ölçer.

Görsel: her slot'un çerçeve (border) pikselini kare kare okur; "beyaz çerçeve var" = ışık yanık.
Ses: render edilmiş dosyanın KENDİ sesinde ffmpeg silencedetect (-35 dB) ile ses/sessizlik aralıkları.
Her yanık aralığın başlangıcı için: measuredAudioOnsetMs = o andan (0.3 sn öncesinden) itibaren başlayan/süren
ilk ses bölgesinin başlangıcı. deltaMs = visualStartMs - measuredAudioOnsetMs (negatif = ışık sesten ÖNCE).

Kullanım: python measure_sync.py <video.mp4> [--json]
"""
from __future__ import annotations

import json
import re
import subprocess
import sys
from pathlib import Path

SLOT_Y = {0: 380, 1: 1080}
SLOT_NAMES = {0: "A(slot0)", 1: "B(slot1)"}
BORDER_X = 244  # çerçeve 240..254 px, ortası
PATCH = 8
LIT_MIN_CHANNEL = 225
SILENCE_DB = -35
SILENCE_MIN_S = 0.1
LOOKBACK_S = 0.3


def probe_fps(video: Path) -> float:
    out = subprocess.check_output(["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries", "stream=r_frame_rate", "-of", "csv=p=0", str(video)]).decode().strip()
    num, den = out.split("/")
    return float(num) / float(den)


def lit_frames(video: Path, slot: int) -> list[bool]:
    y = SLOT_Y[slot] + 300
    raw = subprocess.run(
        ["ffmpeg", "-v", "error", "-i", str(video), "-vf", f"crop={PATCH}:{PATCH}:{BORDER_X - PATCH // 2}:{y}", "-f", "rawvideo", "-pix_fmt", "rgb24", "-"],
        capture_output=True,
        check=True,
    ).stdout
    frame_size = PATCH * PATCH * 3
    frames = []
    for offset in range(0, len(raw) - frame_size + 1, frame_size):
        frame = raw[offset : offset + frame_size]
        channels = [sum(frame[c::3]) / (PATCH * PATCH) for c in range(3)]
        frames.append(min(channels) >= LIT_MIN_CHANNEL)
    return frames


def lit_intervals(video: Path, slot: int, fps: float) -> list[tuple[int, int]]:
    """Yanık aralıklar (ms): [ilk yanık karenin zamanı, ilk söner karenin zamanı)."""
    frames = lit_frames(video, slot)
    intervals, start = [], None
    for i, lit in enumerate(frames + [False]):
        if lit and start is None:
            start = i
        elif not lit and start is not None:
            intervals.append((round(start / fps * 1000), round(i / fps * 1000)))
            start = None
    return intervals


def sound_regions(video: Path) -> list[tuple[float, float]]:
    """silencedetect'ten ses bölgeleri (sn)."""
    proc = subprocess.run(
        ["ffmpeg", "-v", "info", "-i", str(video), "-vn", "-af", f"silencedetect=noise={SILENCE_DB}dB:d={SILENCE_MIN_S}", "-f", "null", "-"],
        capture_output=True,
        text=True,
    )
    log = proc.stderr
    duration = float(subprocess.check_output(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(video)]).decode())
    starts = [float(x) for x in re.findall(r"silence_start: (-?[0-9.]+)", log)]
    ends = [float(x) for x in re.findall(r"silence_end: (-?[0-9.]+)", log)]
    silences = []
    for i, s in enumerate(starts):
        silences.append((max(s, 0.0), ends[i] if i < len(ends) else duration))
    regions, cursor = [], 0.0
    for s, e in silences:
        if s > cursor:
            regions.append((cursor, s))
        cursor = e
    if cursor < duration:
        regions.append((cursor, duration))
    return regions


def audio_onset_for(visual_start_ms: int, regions: list[tuple[float, float]]) -> tuple[int, int] | None:
    """visual_start'tan LOOKBACK_S önceden sonra biten/süren ilk ses bölgesinin (onset_ms, offset_ms)'i."""
    threshold = visual_start_ms / 1000 - LOOKBACK_S
    for start, end in regions:
        if end > threshold:
            return round(start * 1000), round(end * 1000)
    return None


def audio_offset_for(visual_start_ms: int, visual_end_ms: int, regions: list[tuple[float, float]]) -> int | None:
    """Yanık aralıkla kesişen son ses bölgesinin bitişi (ms)."""
    inside = [r for r in regions if r[0] < visual_end_ms / 1000 and r[1] > visual_start_ms / 1000]
    return round(inside[-1][1] * 1000) if inside else None


def measure(video: Path) -> list[dict]:
    fps = probe_fps(video)
    regions = sound_regions(video)
    rows = []
    for slot in (0, 1):
        for start_ms, end_ms in lit_intervals(video, slot, fps):
            onset = audio_onset_for(start_ms, regions)
            offset = audio_offset_for(start_ms, end_ms, regions)
            rows.append(
                {
                    "videoId": video.stem,
                    "speaker": SLOT_NAMES[slot],
                    "visualStartMs": start_ms,
                    "visualEndMs": end_ms,
                    "measuredAudioOnsetMs": onset[0] if onset else None,
                    "deltaMs": start_ms - onset[0] if onset else None,
                    "measuredAudioOffsetMs": offset,
                    "endDeltaMs": end_ms - offset if offset is not None else None,
                }
            )
    rows.sort(key=lambda r: r["visualStartMs"])
    return rows


def format_table(rows: list[dict]) -> str:
    lines = ["videoId | speaker | visualStartMs | measuredAudioOnsetMs | deltaMs | visualEndMs | measuredAudioOffsetMs | endDeltaMs"]
    for r in rows:
        if r["deltaMs"] is None:
            lines.append(f"{r['videoId']} | {r['speaker']} | {r['visualStartMs']} | ? | ? | {r['visualEndMs']} | ? | ?")
        else:
            end_delta = f"{r['endDeltaMs']:+d}" if r["endDeltaMs"] is not None else "?"
            lines.append(f"{r['videoId']} | {r['speaker']} | {r['visualStartMs']} | {r['measuredAudioOnsetMs']} | {r['deltaMs']:+d} | {r['visualEndMs']} | {r['measuredAudioOffsetMs']} | {end_delta}")
    return "\n".join(lines)


if __name__ == "__main__":
    target = Path(sys.argv[1])
    result = measure(target)
    print(json.dumps(result, ensure_ascii=False, indent=2) if "--json" in sys.argv else format_table(result))
