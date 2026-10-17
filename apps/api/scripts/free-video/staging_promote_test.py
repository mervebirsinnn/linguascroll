"""staging_promote.py testleri (geçici dizinlerde; ffmpeg gerekmez)."""
import os
import tempfile
import unittest
from datetime import datetime
from pathlib import Path

from staging_promote import PromotionError, promote_batch, sha256_file

IDS = ["a", "b", "c"]
NOW = datetime(2026, 10, 15, 12, 0, 0)


class PromoteBatchTest(unittest.TestCase):
    def setUp(self):
        self.root = Path(tempfile.mkdtemp())
        self.staging = self.root / "staging"
        self.dest = self.root / "input"
        self.backups = self.root / "backups"
        self.staging.mkdir()
        self.dest.mkdir()
        for video_id in IDS:
            (self.dest / f"{video_id}.mp4").write_bytes(f"old-{video_id}".encode())
            (self.staging / f"{video_id}.mp4").write_bytes(f"new-{video_id}".encode())

    def dest_contents(self):
        return {video_id: (self.dest / f"{video_id}.mp4").read_bytes() for video_id in IDS}

    def test_success_backs_up_old_files_and_replaces_all(self):
        result = promote_batch(IDS, self.staging, self.dest, self.backups, now=NOW)
        self.assertEqual(self.dest_contents(), {v: f"new-{v}".encode() for v in IDS})
        backup = Path(result["backupDir"])
        self.assertEqual(backup.name, "20261015-120000")
        for video_id in IDS:
            self.assertEqual((backup / f"{video_id}.mp4").read_bytes(), f"old-{video_id}".encode())
        self.assertTrue(all(item["changed"] for item in result["files"]))
        self.assertEqual(sorted(p.name for p in self.dest.iterdir()), [f"{v}.mp4" for v in IDS])  # geçici dosya kalmaz

    def test_missing_staging_file_aborts_before_any_write(self):
        (self.staging / "b.mp4").unlink()
        with self.assertRaises(PromotionError):
            promote_batch(IDS, self.staging, self.dest, self.backups, now=NOW)
        self.assertEqual(self.dest_contents(), {v: f"old-{v}".encode() for v in IDS})
        self.assertFalse(self.backups.exists())  # backup bile oluşmadı

    def test_missing_destination_file_aborts_before_any_write(self):
        (self.dest / "c.mp4").unlink()
        with self.assertRaises(PromotionError):
            promote_batch(IDS, self.staging, self.dest, self.backups, now=NOW)
        self.assertFalse(self.backups.exists())

    def test_failure_mid_batch_rolls_back_everything(self):
        calls = {"n": 0}

        def flaky_replace(source: Path, target: Path) -> None:
            calls["n"] += 1
            if calls["n"] == 3:
                raise OSError("disk hatası (enjekte)")
            os.replace(source, target)

        with self.assertRaises(PromotionError) as context:
            promote_batch(IDS, self.staging, self.dest, self.backups, now=NOW, replace=flaky_replace)
        self.assertIn("geri alındı", str(context.exception))
        # yarım batch YOK: üç dosya da orijinal içerikte, geçici dosya yok
        self.assertEqual(self.dest_contents(), {v: f"old-{v}".encode() for v in IDS})
        self.assertEqual(sorted(p.name for p in self.dest.iterdir()), [f"{v}.mp4" for v in IDS])
        # backup korunur
        self.assertTrue((self.backups / "20261015-120000" / "a.mp4").exists())

    def test_failure_on_first_replace_leaves_originals_untouched(self):
        def failing_replace(source: Path, target: Path) -> None:
            raise OSError("ilk replace başarısız (enjekte)")

        with self.assertRaises(PromotionError):
            promote_batch(IDS, self.staging, self.dest, self.backups, now=NOW, replace=failing_replace)
        self.assertEqual(self.dest_contents(), {v: f"old-{v}".encode() for v in IDS})
        self.assertEqual(sorted(p.name for p in self.dest.iterdir()), [f"{v}.mp4" for v in IDS])

    def test_existing_backup_dir_is_never_overwritten(self):
        (self.backups / "20261015-120000").mkdir(parents=True)
        with self.assertRaises(PromotionError):
            promote_batch(IDS, self.staging, self.dest, self.backups, now=NOW)
        self.assertEqual(self.dest_contents(), {v: f"old-{v}".encode() for v in IDS})

    def test_identical_files_are_reported_as_unchanged(self):
        (self.staging / "a.mp4").write_bytes((self.dest / "a.mp4").read_bytes())
        result = promote_batch(IDS, self.staging, self.dest, self.backups, now=NOW)
        changed = {item["videoId"]: item["changed"] for item in result["files"]}
        self.assertEqual(changed, {"a": False, "b": True, "c": True})
        self.assertEqual(sha256_file(self.dest / "a.mp4"), sha256_file(self.staging / "a.mp4"))


if __name__ == "__main__":
    unittest.main()
