#!/usr/bin/env python3
"""
Chunk 10 curated content pipeline.

TTS ile uretilen segment WAV'larini (generate-tts-segments.ps1) tam olcerek
(ffprobe) kesin start_ms/end_ms hesaplar, aralarina sabit bir sessizlik boslugu
ekleyerek tek bir ses parcasinda birlestirir, sonra bu SES UZERINE (gercek,
sentezlenmis konusma) bir waveform-gorsellestirme videosu render eder — sessiz
stok doga goruntusu degil, sesle senkron gercek bir gorsel.

Cikti: apps/api/public/media/<key>.mp4 + her video icin segment timestamp'lerini
iceren bir JSON (seed dosyasini elle yazarken kaynak olarak kullanilacak).
"""
import json
import subprocess
import sys
from pathlib import Path

TMP_DIR = Path(r"C:\Users\merve\OneDrive\Masaüstü\LinguaScroll\apps\api\scripts\tts-tmp")
MEDIA_DIR = Path(r"C:\Users\merve\OneDrive\Masaüstü\LinguaScroll\apps\api\public\media")
GAP_MS = 350
SAMPLE_RATE = 22050

VIDEOS = ["ended-up-staying", "flight-delay", "pickup-running", "pointless-pun"]


def probe_duration_ms(path: Path) -> int:
    out = subprocess.check_output(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "default=noprint_wrappers=1:nokey=1", str(path)],
        text=True,
    ).strip()
    return round(float(out) * 1000)


def make_silence(ms: int, out_path: Path) -> None:
    subprocess.check_call(
        [
            "ffmpeg", "-y", "-f", "lavfi", "-i", f"anullsrc=r={SAMPLE_RATE}:cl=mono",
            "-t", str(ms / 1000), "-c:a", "pcm_s16le", str(out_path),
        ],
        stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
    )


def main() -> None:
    MEDIA_DIR.mkdir(parents=True, exist_ok=True)
    silence_path = TMP_DIR / "_gap.wav"
    make_silence(GAP_MS, silence_path)

    manifest = {}

    for key in VIDEOS:
        segment_files = sorted(TMP_DIR.glob(f"{key}_*.wav"), key=lambda p: int(p.stem.rsplit("_", 1)[1]))
        if not segment_files:
            print(f"UYARI: {key} icin segment wav bulunamadi", file=sys.stderr)
            continue

        timestamps = []
        cursor_ms = 0
        concat_list_path = TMP_DIR / f"{key}_concat.txt"
        with concat_list_path.open("w", encoding="utf-8") as f:
            for i, seg_path in enumerate(segment_files):
                dur_ms = probe_duration_ms(seg_path)
                start_ms = cursor_ms
                end_ms = start_ms + dur_ms
                timestamps.append({"ordinal": i + 1, "start_ms": start_ms, "end_ms": end_ms})
                f.write(f"file '{seg_path.as_posix()}'\n")
                cursor_ms = end_ms
                if i < len(segment_files) - 1:
                    f.write(f"file '{silence_path.as_posix()}'\n")
                    cursor_ms += GAP_MS

        combined_audio = TMP_DIR / f"{key}_combined.wav"
        subprocess.check_call(
            ["ffmpeg", "-y", "-f", "concat", "-safe", "0", "-i", str(concat_list_path), "-c", "copy", str(combined_audio)],
            stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
        )

        total_ms = probe_duration_ms(combined_audio)

        # Dikey (9:16) format — feed'deki mevcut TikTok/Reels tarzi videolarla
        # tutarli. Gorsel: gradyan arka plan + gercek sesin waveform'u
        # (showwaves) — "sessiz stok goruntu + alakasiz transkript" sorununu
        # cozuyor, cunku gorsel dogrudan bu sesten uretiliyor.
        out_mp4 = MEDIA_DIR / f"{key}.mp4"
        filter_complex = (
            "[0:a]showwaves=s=720x360:mode=cline:colors=0x8ecdfa[wave];"
            "color=c=0x0b0b12:s=720x1280:d=" + str(total_ms / 1000) + "[bg];"
            "[bg][wave]overlay=(W-w)/2:(H-h)/2:shortest=1[v]"
        )
        subprocess.check_call(
            [
                "ffmpeg", "-y", "-i", str(combined_audio),
                "-filter_complex", filter_complex,
                "-map", "[v]", "-map", "0:a",
                "-c:v", "libx264", "-preset", "veryfast", "-pix_fmt", "yuv420p",
                "-c:a", "aac", "-b:a", "96k",
                "-shortest", str(out_mp4),
            ],
            stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
        )

        manifest[key] = {"total_ms": total_ms, "segments": timestamps}
        print(f"{key}: {len(timestamps)} segment, toplam {total_ms}ms -> {out_mp4.name}")

    manifest_path = TMP_DIR / "manifest.json"
    manifest_path.write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    print(f"Manifest yazildi: {manifest_path}")


if __name__ == "__main__":
    main()
