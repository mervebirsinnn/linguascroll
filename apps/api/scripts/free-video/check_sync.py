"""Toplu konuşmacı-ışığı senkron ölçümü + kabul kriterleri (render edilmiş MP4'lerden; script/metadata'ya güvenmeden).

Kullanım: python check_sync.py <video-dizini> [--json rapor.json]

Kabul (her video için):
  1. Her başlangıçta |deltaMs| <= 100            (deltaMs = visualStartMs - measuredAudioOnsetMs)
  2. Işık sesten 100 ms'den fazla ÖNCE yanmaz     (deltaMs >= -100)
  3. Aynı anda iki konuşmacı ışığı yanmaz          (slot aralıkları kesişmez)
  4. Sessizlikte iki ışık da kapalı                (ardışık turlar arasındaki boşlukta, ±100 ms tolerans dışında ses yok)
  5. Son konuşmacının ışığı ses bittikten sonra açık kalmaz (|endDeltaMs| <= 100)
  + metadata tutarlılığı: ölçülen yanık aralıklar timing/<id>.json'daki speechStartMs/speechEndMs ile ±60 ms (kare kuantizasyonu) uyuşur.
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

from measure_sync import measure, sound_regions

TOLERANCE_MS = 100
METADATA_TOLERANCE_MS = 60


def check_video(video: Path, timing_dir: Path | None) -> dict:
    rows = measure(video)
    regions = sound_regions(video)
    failures: list[str] = []

    if not rows:
        failures.append("hiç yanık ışık aralığı bulunamadı")
    for row in rows:
        if row["deltaMs"] is None:
            failures.append(f"{row['speaker']}@{row['visualStartMs']}: eşleşen ses bölgesi yok")
            continue
        if abs(row["deltaMs"]) > TOLERANCE_MS:
            failures.append(f"{row['speaker']}@{row['visualStartMs']}: |deltaMs|={abs(row['deltaMs'])} > {TOLERANCE_MS}")
        if row["deltaMs"] < -TOLERANCE_MS:
            failures.append(f"{row['speaker']}@{row['visualStartMs']}: ışık sesten {-row['deltaMs']} ms ÖNCE yandı")

    # 3) aynı anda iki ışık
    for a in rows:
        for b in rows:
            if a is not b and a["speaker"] != b["speaker"] and a["visualStartMs"] < b["visualEndMs"] and b["visualStartMs"] < a["visualEndMs"]:
                failures.append(f"{a['speaker']} [{a['visualStartMs']},{a['visualEndMs']}) ve {b['speaker']} [{b['visualStartMs']},{b['visualEndMs']}) aynı anda yanıyor")
                break

    # 4) sessizlikte iki ışık kapalı: ardışık yanık aralıkların arasında ±tolerans dışında ses olmamalı
    ordered = sorted(rows, key=lambda r: r["visualStartMs"])
    for previous, current in zip(ordered, ordered[1:]):
        window_start = previous["visualEndMs"] + TOLERANCE_MS
        window_end = current["visualStartMs"] - TOLERANCE_MS
        if window_end > window_start:
            for start, end in regions:
                if start * 1000 < window_end and end * 1000 > window_start:
                    failures.append(f"ışıklar kapalıyken [{previous['visualEndMs']},{current['visualStartMs']}) aralığında ses var ({round(start*1000)}–{round(end*1000)} ms)")
                    break

    # 5) son konuşmacı
    if ordered:
        last = ordered[-1]
        if last["endDeltaMs"] is None or abs(last["endDeltaMs"]) > TOLERANCE_MS:
            failures.append(f"son konuşmacı ışığı ses bitişinden {last['endDeltaMs']} ms sonra/önce sönüyor (> {TOLERANCE_MS})")
        if last["endDeltaMs"] is not None and last["endDeltaMs"] > TOLERANCE_MS:
            failures.append("son konuşmacı ışığı ses sonrasında açık kaldı")

    # metadata tutarlılığı
    metadata_note = "timing yok"
    if timing_dir is not None and (timing_dir / f"{video.stem}.json").exists():
        turns = json.loads((timing_dir / f"{video.stem}.json").read_text(encoding="utf8"))["turns"]
        metadata_note = f"{len(turns)} turn"
        if len(turns) != len(ordered):
            failures.append(f"metadata {len(turns)} turn, ölçülen {len(ordered)} yanık aralık")
        else:
            for turn, row in zip(sorted(turns, key=lambda t: t["speechStartMs"]), ordered):
                if abs(turn["speechStartMs"] - row["visualStartMs"]) > METADATA_TOLERANCE_MS or abs(turn["speechEndMs"] - row["visualEndMs"]) > METADATA_TOLERANCE_MS:
                    failures.append(f"metadata ({turn['speechStartMs']}–{turn['speechEndMs']}) ile ölçülen ışık ({row['visualStartMs']}–{row['visualEndMs']}) uyuşmuyor")

    return {"videoId": video.stem, "transitions": len(rows), "rows": rows, "metadata": metadata_note, "passed": not failures, "failures": failures}


def format_rows(results: list[dict]) -> str:
    lines = ["videoId | speaker | visualStartMs | measuredAudioOnsetMs | deltaMs | visualEndMs | measuredAudioOffsetMs | endDeltaMs"]
    for result in results:
        for r in result["rows"]:
            lines.append(
                f"{r['videoId']} | {r['speaker']} | {r['visualStartMs']} | {r['measuredAudioOnsetMs']} | {r['deltaMs']:+d} | {r['visualEndMs']} | {r['measuredAudioOffsetMs']} | {r['endDeltaMs']:+d}"
                if r["deltaMs"] is not None and r["endDeltaMs"] is not None
                else f"{r['videoId']} | {r['speaker']} | {r['visualStartMs']} | ? | ? | {r['visualEndMs']} | ? | ?"
            )
    return "\n".join(lines)


if __name__ == "__main__":
    directory = Path(sys.argv[1])
    timing = directory / "timing"
    results = [check_video(video, timing if timing.exists() else None) for video in sorted(directory.glob("*.mp4"))]
    print(format_rows(results))
    print()
    for result in results:
        deltas = [r["deltaMs"] for r in result["rows"] if r["deltaMs"] is not None]
        spread = f"delta {min(deltas):+d}…{max(deltas):+d}" if deltas else "delta ?"
        print(f"{'GEÇTİ' if result['passed'] else 'BAŞARISIZ'}  {result['videoId']}  ({result['transitions']} geçiş, {result['metadata']}, {spread})")
        for failure in result["failures"]:
            print(f"    ✗ {failure}")
    passed = sum(1 for r in results if r["passed"])
    print(f"\nÖZET: {passed}/{len(results)} video tüm sync kriterlerini geçti")
    if "--json" in sys.argv:
        Path(sys.argv[sys.argv.index("--json") + 1]).write_text(json.dumps(results, ensure_ascii=False, indent=2), encoding="utf8")
    sys.exit(0 if passed == len(results) and results else 1)
