"""
Chunk 11 review düzeltmesi (madde 1) — `validate_media`/`probe_duration_seconds`/
`has_audio_stream`'in GERÇEK ffmpeg/ffprobe ile (mock DEĞİL) doğrulanması.
Fixture'lar ffmpeg'in kendi `lavfi` (sine/color) kaynaklarıyla anlık üretiliyor —
harici bir video indirmeye gerek yok, model de gerekmiyor (STT hiç çalışmıyor).

Çalıştırma: python -m unittest media_validation_test -v
"""
import subprocess
import tempfile
import unittest
from pathlib import Path

from transcribe import TranscribeError, has_audio_stream, probe_duration_seconds, validate_media


def make_video_with_audio(path: Path, duration_seconds: float) -> None:
    subprocess.run(
        [
            "ffmpeg", "-y",
            "-f", "lavfi", "-i", f"sine=frequency=440:duration={duration_seconds}",
            "-f", "lavfi", "-i", f"color=c=black:s=64x64:d={duration_seconds}",
            "-shortest", "-c:v", "libx264", "-c:a", "aac", str(path),
        ],
        capture_output=True, text=True, check=True, timeout=60,
    )


def make_video_without_audio(path: Path, duration_seconds: float) -> None:
    subprocess.run(
        ["ffmpeg", "-y", "-f", "lavfi", "-i", f"color=c=black:s=64x64:d={duration_seconds}", "-c:v", "libx264", str(path)],
        capture_output=True, text=True, check=True, timeout=60,
    )


class MediaValidationTests(unittest.TestCase):
    def test_probe_duration_reads_real_duration_approximately(self):
        with tempfile.TemporaryDirectory() as tmp:
            video_path = Path(tmp) / "video.mp4"
            make_video_with_audio(video_path, 20)
            self.assertAlmostEqual(probe_duration_seconds(video_path), 20, delta=0.5)

    def test_has_audio_stream_true_when_audio_present(self):
        with tempfile.TemporaryDirectory() as tmp:
            video_path = Path(tmp) / "video.mp4"
            make_video_with_audio(video_path, 20)
            self.assertTrue(has_audio_stream(video_path))

    def test_has_audio_stream_false_when_no_audio(self):
        with tempfile.TemporaryDirectory() as tmp:
            video_path = Path(tmp) / "video.mp4"
            make_video_without_audio(video_path, 20)
            self.assertFalse(has_audio_stream(video_path))

    def test_validate_media_rejects_too_short(self):
        with tempfile.TemporaryDirectory() as tmp:
            video_path = Path(tmp) / "short.mp4"
            make_video_with_audio(video_path, 5)
            with self.assertRaises(TranscribeError) as ctx:
                validate_media(video_path)
            self.assertIn("aralık", str(ctx.exception))

    def test_validate_media_rejects_too_long(self):
        with tempfile.TemporaryDirectory() as tmp:
            video_path = Path(tmp) / "long.mp4"
            make_video_with_audio(video_path, 65)
            with self.assertRaises(TranscribeError):
                validate_media(video_path)

    def test_validate_media_accepts_within_range(self):
        with tempfile.TemporaryDirectory() as tmp:
            video_path = Path(tmp) / "ok.mp4"
            make_video_with_audio(video_path, 20)
            self.assertAlmostEqual(validate_media(video_path), 20, delta=0.5)

    def test_validate_media_rejects_missing_audio_stream(self):
        with tempfile.TemporaryDirectory() as tmp:
            video_path = Path(tmp) / "silent.mp4"
            make_video_without_audio(video_path, 20)
            with self.assertRaises(TranscribeError) as ctx:
                validate_media(video_path)
            self.assertIn("audio stream", str(ctx.exception))

    def test_probe_duration_fails_clearly_on_corrupt_file(self):
        with tempfile.TemporaryDirectory() as tmp:
            garbage_path = Path(tmp) / "garbage.mp4"
            garbage_path.write_bytes(b"not a real video file" * 100)
            with self.assertRaises(TranscribeError):
                probe_duration_seconds(garbage_path)


if __name__ == "__main__":
    unittest.main()
