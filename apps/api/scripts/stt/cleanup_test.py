"""
Chunk 11 — transcribe.py'nin `finally` cleanup davranışını doğrular. Gerçek
model/faster-whisper GEREKTİRMEZ (transcribe.py, faster_whisper'ı sadece
load_model() İÇİNDE, lazy olarak import ediyor — bu test onu hiç çağırmıyor).

stdlib `unittest` kullanılıyor — pytest bu ortamda kurulu değil ve bu kadar
az/basit test için yeni bir dependency eklemeye gerek yok.

Çalıştırma: python -m unittest apps/api/scripts/stt/cleanup_test.py
"""
import json
import os
import tempfile
import unittest
from pathlib import Path
from unittest import mock

from transcribe import write_candidate_atomic


class WriteCandidateAtomicTests(unittest.TestCase):
    def test_success_leaves_final_file_and_no_tmp(self):
        with tempfile.TemporaryDirectory() as tmp_dir:
            output_path = Path(tmp_dir) / "candidate.json"
            write_candidate_atomic(output_path, {"words": []})

            self.assertTrue(output_path.exists())
            self.assertFalse(output_path.with_name(output_path.name + ".tmp").exists())
            self.assertEqual(json.loads(output_path.read_text(encoding="utf-8")), {"words": []})

    def test_failure_during_rename_leaves_no_dangling_tmp_file(self):
        with tempfile.TemporaryDirectory() as tmp_dir:
            output_path = Path(tmp_dir) / "candidate.json"

            with mock.patch("os.replace", side_effect=OSError("disk doldu (simüle)")):
                with self.assertRaises(OSError):
                    write_candidate_atomic(output_path, {"words": []})

            tmp_path = output_path.with_name(output_path.name + ".tmp")
            self.assertFalse(tmp_path.exists(), "finally bloğu .tmp dosyasını temizlemeliydi")
            self.assertFalse(output_path.exists(), "rename başarısız oldu, final dosya var olmamalı")

    def test_failure_during_json_serialization_leaves_no_dangling_tmp_file(self):
        with tempfile.TemporaryDirectory() as tmp_dir:
            output_path = Path(tmp_dir) / "candidate.json"

            class NotSerializable:
                pass

            with self.assertRaises(TypeError):
                write_candidate_atomic(output_path, {"bad": NotSerializable()})

            tmp_path = output_path.with_name(output_path.name + ".tmp")
            self.assertFalse(tmp_path.exists())
            self.assertFalse(output_path.exists())


if __name__ == "__main__":
    unittest.main()
