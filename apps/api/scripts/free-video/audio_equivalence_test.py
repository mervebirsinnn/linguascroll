"""audio_equivalence testleri (saf mantık + sentetik zarf; ffmpeg gerekmez)."""
import math
import unittest

from audio_equivalence import align_window, decide, envelope_db


def tone_env(segments):
    """segments: [(kind, ms)] → 1 ms zarf: 'v' konuşma (-10 dB), 's' sessizlik (-60 dB)."""
    out = []
    for kind, ms in segments:
        out.extend([-10.0 if kind == "v" else -60.0] * ms)
    return out


class AlignWindowTest(unittest.TestCase):
    def test_identical_envelopes_have_zero_lag_and_zero_residual(self):
        env = tone_env([("s", 200), ("v", 800), ("s", 300), ("v", 500), ("s", 200)])
        lag, residual = align_window(env, env, 0, len(env))
        self.assertEqual((lag, residual), (0, 0.0))

    def test_detects_real_timeline_shift(self):
        new = tone_env([("s", 200), ("v", 800), ("s", 300)])
        old = tone_env([("s", 250), ("v", 800), ("s", 250)])  # eski ses 50 ms GEÇ başlıyor
        lag, residual = align_window(old, new, 0, len(new))
        self.assertEqual(lag, 50)
        self.assertLess(residual, 0.01)

    def test_shift_beyond_search_range_saturates_with_large_residual_and_forces_rerun(self):
        new = tone_env([("s", 200), ("v", 800), ("s", 300)])
        old = tone_env([("s", 350), ("v", 800), ("s", 150)])  # 150 ms kayma > MAX_LAG_MS
        lag, residual = align_window(old, new, 0, len(new))
        self.assertEqual(abs(lag), 60)
        self.assertGreater(residual, 2.0)
        self.assertTrue(decide(False, [(lag, residual)])[0].startswith("RE-RUN STT"))

    def test_small_shift_is_measured_exactly(self):
        new = tone_env([("s", 100), ("v", 500), ("s", 100)])
        old = tone_env([("s", 103), ("v", 500), ("s", 97)])
        self.assertEqual(align_window(old, new, 0, len(new))[0], 3)


class DecideTest(unittest.TestCase):
    def test_same_hash_keeps_draft(self):
        action, lag, residual = decide(True, [])
        self.assertTrue(action.startswith("keep-draft"))
        self.assertEqual((lag, residual), (0, 0.0))

    def test_different_hash_is_not_assumed_container_only(self):
        action, lag, _ = decide(False, [(0, 0.1), (150, 0.2)])
        self.assertTrue(action.startswith("RE-RUN STT"))
        self.assertEqual(lag, 150)

    def test_different_hash_but_same_timeline_keeps_draft(self):
        action, lag, residual = decide(False, [(2, 0.3), (-3, 0.5), (1, 0.2)])
        self.assertTrue(action.startswith("keep-draft"))
        self.assertEqual(lag, 3)
        self.assertEqual(residual, 0.5)

    def test_large_residual_means_content_changed(self):
        action, _, _ = decide(False, [(0, 6.5)])
        self.assertTrue(action.startswith("RE-RUN STT"))

    def test_no_turns_triggers_rerun(self):
        self.assertTrue(decide(False, [])[0].startswith("RE-RUN STT"))

    def test_20ms_boundary_is_inclusive(self):
        self.assertTrue(decide(False, [(20, 1.0)])[0].startswith("keep-draft"))
        self.assertTrue(decide(False, [(21, 1.0)])[0].startswith("RE-RUN STT"))


class EnvelopeTest(unittest.TestCase):
    def test_silence_is_clamped_and_tone_is_loud(self):
        env = envelope_db([0] * 160 + [int(10000 * math.sin(i)) for i in range(160)])
        self.assertEqual(env[:10], [-60.0] * 10)
        self.assertTrue(all(level > -20 for level in env[10:]))


if __name__ == "__main__":
    unittest.main()
