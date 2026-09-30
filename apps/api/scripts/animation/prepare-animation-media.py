"""Sintel'in doğrulanmış resmi kopyasından katalogdaki kısa sahneleri hazırlar."""
import argparse
import hashlib
import json
import subprocess
import tempfile
from pathlib import Path
from urllib.request import urlretrieve

API_ROOT = Path(__file__).resolve().parents[2]
SOURCE_URL = "https://peach.themazzone.com/durian/movies/sintel-1024-surround.mp4"
SOURCE_SHA256 = "1dc6f2ca9762dfcc7d1b1843129a3e4f351d1fe935dea2241c7b359c11ebc1d8"


def prepare(source, media_dir):
    digest = hashlib.sha256()
    with source.open("rb") as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(block)
    if digest.hexdigest() != SOURCE_SHA256:
        raise ValueError("Kaynak dosya katalogdaki Sintel sürümüyle eşleşmiyor; resmi 1024px kopyasını kullanın.")
    entries = json.loads((API_ROOT / "content/animation/sintel.json").read_text(encoding="utf8"))
    media_dir.mkdir(parents=True, exist_ok=True)
    for entry in entries:
        draft = entry["draft"]
        destination = media_dir / draft["sourceFile"]
        if destination.exists():
            raise ValueError(f"Dosyanın üzerine yazılmıyor: {destination.name}")
        subprocess.run([
            "ffmpeg", "-nostdin", "-hide_banner", "-loglevel", "error",
            "-ss", str(entry["sourceStartMs"] / 1000), "-i", str(source),
            "-t", str(draft["durationMs"] / 1000), "-vf", "scale=960:-2",
            "-c:v", "libx264", "-preset", "fast", "-crf", "25", "-pix_fmt", "yuv420p",
            "-ac", "2", "-c:a", "aac", "-b:a", "96k", "-movflags", "+faststart", str(destination),
        ], check=True)
        print(f"Hazır: {entry['title']} ({destination.name})", flush=True)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", type=Path, help="Resmi 1024px Sintel MP4; verilmezse resmi sitedeki bağlantıdan indirilir.")
    parser.add_argument("--media-dir", type=Path, default=API_ROOT / "public/media")
    args = parser.parse_args()
    if args.source:
        prepare(args.source, args.media_dir)
    else:
        with tempfile.TemporaryDirectory(prefix="sintel-") as directory:
            source = Path(directory) / "sintel.mp4"
            print("Resmi Sintel kopyası indiriliyor…", flush=True)
            urlretrieve(SOURCE_URL, source)
            prepare(source, args.media_dir)


if __name__ == "__main__":
    main()
