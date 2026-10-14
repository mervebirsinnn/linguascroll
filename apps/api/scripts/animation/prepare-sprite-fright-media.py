"""Sprite Fright'ın doğrulanmış CC BY 4.0 kopyasından 9:16 katalog sahnelerini hazırlar."""
import argparse
import hashlib
import json
import subprocess
import tempfile
from pathlib import Path
from urllib.request import urlretrieve

API_ROOT = Path(__file__).resolve().parents[2]
SOURCE_URL = "https://upload.wikimedia.org/wikipedia/commons/7/76/Sprite_Fright_-_Blender_Open_Movie-full_movie.webm"
SOURCE_SHA256 = "e2e14a119cba5e7522a2e72e3b6c10807954dafd4a2920d43f33c97674f089fe"


def prepare(source: Path, media_dir: Path) -> None:
    digest = hashlib.sha256()
    with source.open("rb") as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(block)
    if digest.hexdigest() != SOURCE_SHA256:
        raise ValueError("Kaynak dosya katalogdaki Sprite Fright sürümüyle eşleşmiyor.")

    entries = json.loads((API_ROOT / "content/animation/sprite-fright.json").read_text(encoding="utf8"))
    media_dir.mkdir(parents=True, exist_ok=True)
    for entry in entries:
        draft = entry["draft"]
        destination = media_dir / draft["sourceFile"]
        if destination.exists():
            raise ValueError(f"Dosyanın üzerine yazılmıyor: {destination.name}")
        subprocess.run([
            "ffmpeg", "-nostdin", "-hide_banner", "-loglevel", "error",
            "-ss", str(entry["sourceStartMs"] / 1000), "-i", str(source),
            "-t", str(draft["durationMs"] / 1000),
            "-filter_complex",
            "[0:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,boxblur=30:10[bg];"
            "[0:v]scale=1080:-2[fg];[bg][fg]overlay=(W-w)/2:(H-h)/2,format=yuv420p[v]",
            "-map", "[v]", "-map", "0:a:0", "-c:v", "libx264", "-preset", "fast", "-crf", "23",
            "-c:a", "aac", "-b:a", "128k", "-ac", "2", "-movflags", "+faststart", str(destination),
        ], check=True)
        print(f"Hazır: {entry['title']} ({destination.name})", flush=True)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", type=Path, help="Doğrulanmış Sprite Fright WEBM; verilmezse kaynak indirilir.")
    parser.add_argument("--media-dir", type=Path, default=API_ROOT / "public/media")
    args = parser.parse_args()
    if args.source:
        prepare(args.source, args.media_dir)
    else:
        with tempfile.TemporaryDirectory(prefix="sprite-fright-") as directory:
            source = Path(directory) / "sprite-fright.webm"
            print("Sprite Fright kaynak kopyası indiriliyor…", flush=True)
            urlretrieve(SOURCE_URL, source)
            prepare(source, args.media_dir)


if __name__ == "__main__":
    main()
