"""Staging → input promotion KAPISI: 15/15 video TÜM kontrolleri geçmeden promotion yapılmaz.

Kontroller (video başına):
  1. sync        : rendered-sync-v2/sync-report.json içinde passed=true (check_sync.py çıktısı)
  2. audio       : rendered-sync-v2/audio-equivalence.json'da transcriptAction "keep-draft…" VEYA, "RE-RUN STT" ise
                   --resolved <id> ile STT yeniden çalıştırılmış + artifact'ler yeniden doğrulanmış olarak işaretlenmiş
  3. media       : h264 + aac, 1080x1920 (9:16), süre draft.durationMs ±150 ms
Kullanım: python promotion_gate.py <staging-dir> [--resolved <id> ...]   (çıkış kodu 0 = hepsi geçti)
"""
from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path

API = Path(__file__).resolve().parents[2]
DURATION_TOLERANCE_MS = 150


def probe(video: Path) -> dict:
    raw = json.loads(subprocess.check_output(["ffprobe", "-v", "error", "-show_streams", "-show_format", "-of", "json", str(video)]))
    v = next((s for s in raw["streams"] if s["codec_type"] == "video"), {})
    a = next((s for s in raw["streams"] if s["codec_type"] == "audio"), {})
    return {"v": v.get("codec_name"), "a": a.get("codec_name"), "w": v.get("width"), "h": v.get("height"), "ms": round(float(raw["format"]["duration"]) * 1000)}


def gate(staging: Path, resolved: set[str]) -> list[dict]:
    sync = {r["videoId"]: r for r in json.loads((staging / "sync-report.json").read_text(encoding="utf8"))}
    audio = {r["videoId"]: r for r in json.loads((staging / "audio-equivalence.json").read_text(encoding="utf8"))}
    rows = []
    for video in sorted(staging.glob("*.mp4")):
        vid = video.stem
        problems: list[str] = []
        if not sync.get(vid, {}).get("passed"):
            problems.append("sync kriterleri geçmedi/yok")
        action = audio.get(vid, {}).get("transcriptAction", "yok")
        if action.startswith("RE-RUN") and vid not in resolved:
            problems.append("STT yeniden çalıştırılmalı ve artifact doğrulanmalı (--resolved ile işaretlenmedi)")
        elif not action.startswith(("keep-draft", "RE-RUN")):
            problems.append(f"audio karşılaştırması yok/bilinmiyor: {action}")
        draft_path = API / "scripts" / "stt" / "output" / vid / "draft.json"
        info = probe(video)
        if info["v"] != "h264" or info["a"] != "aac":
            problems.append(f"codec {info['v']}/{info['a']}")
        if (info["w"], info["h"]) != (1080, 1920):
            problems.append(f"boyut {info['w']}x{info['h']} (1080x1920 bekleniyor)")
        if draft_path.exists():
            expected = json.loads(draft_path.read_text(encoding="utf8"))["durationMs"]
            if abs(info["ms"] - expected) > DURATION_TOLERANCE_MS:
                problems.append(f"süre {info['ms']} ms ≠ draft {expected} ms (±{DURATION_TOLERANCE_MS})")
        else:
            problems.append("draft.json yok")
        rows.append({"videoId": vid, "passed": not problems, "problems": problems, "audioAction": action, "media": info})
    return rows


if __name__ == "__main__":
    staging_dir = Path(sys.argv[1])
    resolved_ids = {sys.argv[i + 1] for i, arg in enumerate(sys.argv) if arg == "--resolved"}
    results = gate(staging_dir, resolved_ids)
    for r in results:
        print(f"{'GEÇTİ' if r['passed'] else 'ENGEL '}  {r['videoId']}  ({r['media']['w']}x{r['media']['h']} {r['media']['v']}/{r['media']['a']} {r['media']['ms']} ms)  audio: {r['audioAction'][:60]}")
        for problem in r["problems"]:
            print(f"        ✗ {problem}")
    ok = bool(results) and all(r["passed"] for r in results)
    print(f"\nKAPI: {sum(r['passed'] for r in results)}/{len(results)} geçti → {'PROMOTION İZNİ VAR' if ok else 'PROMOTION YASAK'}")
    sys.exit(0 if ok else 1)
