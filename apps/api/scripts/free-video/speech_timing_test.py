"""speech_timing.py regresyon testleri. Çalıştırma: python -m unittest scripts/free-video/speech_timing_test.py
(ya da klasör içinden: python -m unittest speech_timing_test). Sentetik PCM kullanır; ffmpeg/ağ gerekmez."""
import math
import unittest

from speech_timing import (
    SAMPLE_RATE,
    SpeechBounds,
    active_slots_at,
    build_turns,
    enable_expression,
    find_speech_bounds,
)


def pcm(*segments):
    """('s', ms) sessizlik, ('v', ms) 440 Hz ton (≈ -10 dBFS) — art arda eklenir."""
    samples = []
    for kind, ms in segments:
        n = SAMPLE_RATE * ms // 1000
        if kind == "s":
            samples.extend([0] * n)
        else:
            samples.extend(int(10000 * math.sin(2 * math.pi * 440 * i / SAMPLE_RATE)) for i in range(n))
    return samples


def turns_for(clips, lead_ms=500, gap_ms=0):
    """clips: [(speaker, slot, [pcm segmentleri])]; her klibin süresi PCM uzunluğudur."""
    pcms = [pcm(*c[2]) for c in clips]
    return build_turns(
        [(c[0], c[1], c[0]) for c in clips],
        measure=lambda i: find_speech_bounds(pcms[i]),
        lead_ms=lead_ms,
        gap_ms=gap_ms,
        clip_duration_ms=lambda i: len(pcms[i]) * 1000 // SAMPLE_RATE,
    )


class FindSpeechBoundsTest(unittest.TestCase):
    def test_leading_and_trailing_silence_are_excluded(self):
        bounds = find_speech_bounds(pcm(("s", 300), ("v", 1000), ("s", 200)))
        self.assertEqual(bounds, SpeechBounds(onset_ms=300, offset_ms=1300))

    def test_internal_pause_does_not_end_speech(self):
        bounds = find_speech_bounds(pcm(("s", 100), ("v", 400), ("s", 250), ("v", 400), ("s", 100)))
        self.assertEqual((bounds.onset_ms, bounds.offset_ms), (100, 1150))

    def test_single_window_click_is_ignored(self):
        bounds = find_speech_bounds(pcm(("s", 200), ("v", 10), ("s", 200), ("v", 500), ("s", 50)))
        self.assertEqual(bounds.onset_ms, 410)

    def test_low_rms_tail_with_loud_peaks_counts_as_sound(self):
        # RMS ≈ -41.8 dB (< -40) ama tepe ≈ -32.8 dBFS (> -35): silencedetect'in duyacağı artefakt konuşma bitişini uzatır.
        pulses = [750 if i % 8 == 0 else 0 for i in range(SAMPLE_RATE * 40 // 1000)]
        samples = pcm(("s", 100), ("v", 500), ("s", 80)) + pulses + pcm(("s", 100))
        bounds = find_speech_bounds(samples)
        self.assertEqual(bounds.onset_ms, 100)
        self.assertEqual(bounds.offset_ms, 100 + 500 + 80 + 40)

    def test_quiet_noise_below_both_thresholds_is_not_sound(self):
        quiet = [60 if i % 8 == 0 else 0 for i in range(SAMPLE_RATE * 40 // 1000)]  # tepe ≈ -54 dBFS
        bounds = find_speech_bounds(pcm(("s", 100), ("v", 500), ("s", 80)) + quiet + pcm(("s", 100)))
        self.assertEqual(bounds.offset_ms, 600)

    def test_silent_input_raises(self):
        with self.assertRaises(ValueError):
            find_speech_bounds(pcm(("s", 500)))


class HighlightTimelineTest(unittest.TestCase):
    def test_300ms_leading_silence_light_does_not_precede_audio(self):
        # A: 100ms sessizlik + 1000ms ses; B: 300ms SESSİZLİK + 800ms ses
        turns = turns_for([("A", 0, [("s", 100), ("v", 1000)]), ("B", 1, [("s", 300), ("v", 800)])], lead_ms=500)
        b = turns[1]
        self.assertEqual(b.speechStartMs, b.clipStartMs + 300)
        # B klibinin başladığı anda (ses henüz yok) B'nin ışığı yanmamalı; onset'ten önceki hiçbir anda yanmamalı.
        for t_ms in range(b.clipStartMs, b.speechStartMs):
            self.assertNotIn(1, active_slots_at(turns, t_ms), f"t={t_ms}ms'de B erken yandı")
        self.assertIn(1, active_slots_at(turns, b.speechStartMs))

    def test_500ms_silence_between_speakers_means_both_lights_off(self):
        turns = turns_for([("A", 0, [("v", 600)]), ("B", 1, [("v", 600)])], gap_ms=500)
        a, b = turns
        self.assertEqual(b.speechStartMs - a.speechEndMs, 500)
        for t_ms in range(a.speechEndMs, b.speechStartMs):
            self.assertEqual(active_slots_at(turns, t_ms), [], f"t={t_ms}ms sessizlikte ışık yanıyor")

    def test_back_to_back_boundary_is_half_open_single_light(self):
        turns = turns_for([("A", 0, [("v", 600)]), ("B", 1, [("v", 600)])], gap_ms=0)
        a, b = turns
        self.assertEqual(a.speechEndMs, b.speechStartMs)
        boundary = a.speechEndMs
        self.assertEqual(active_slots_at(turns, boundary - 1), [0])
        self.assertEqual(active_slots_at(turns, boundary), [1])  # [start,end): bitiş dahil değil
        for t_ms in range(a.speechStartMs, b.speechEndMs):
            self.assertLessEqual(len(active_slots_at(turns, t_ms)), 1, f"t={t_ms}ms'de iki ışık birden yanıyor")

    def test_last_speaker_light_off_after_audio_ends(self):
        # Son konuşmacının klibinde 400 ms trailing silence var.
        turns = turns_for([("A", 0, [("v", 500)]), ("B", 1, [("v", 500), ("s", 400)])])
        b = turns[1]
        self.assertEqual(b.speechEndMs, b.clipStartMs + 500)
        self.assertEqual(active_slots_at(turns, b.speechEndMs), [])
        self.assertEqual(active_slots_at(turns, b.clipEndMs - 1), [])

    def test_metadata_has_speech_start_and_end_for_every_turn(self):
        turns = turns_for([("A", 0, [("s", 50), ("v", 400)]), ("B", 1, [("s", 120), ("v", 400)])], gap_ms=450)
        for turn in turns:
            meta = turn.to_metadata()
            self.assertIn("speechStartMs", meta)
            self.assertIn("speechEndMs", meta)
            self.assertLess(meta["speechStartMs"], meta["speechEndMs"])
            self.assertGreaterEqual(meta["speechStartMs"], meta["clipStartMs"])
            self.assertLessEqual(meta["speechEndMs"], meta["clipEndMs"])

    def test_no_constant_delay_onset_follows_each_clip_own_silence(self):
        turns = turns_for([("A", 0, [("s", 40), ("v", 300)]), ("B", 1, [("s", 250), ("v", 300)])])
        self.assertEqual([t.speechStartMs - t.clipStartMs for t in turns], [40, 250])


class EnableExpressionTest(unittest.TestCase):
    def test_expression_is_half_open_and_per_slot(self):
        turns = turns_for([("A", 0, [("v", 600)]), ("B", 1, [("v", 600)]), ("A", 0, [("v", 600)])], gap_ms=100)
        expr0 = enable_expression(turns, 0)
        self.assertEqual(expr0.count("gte(t,"), 2)
        self.assertIn("lt(t,", expr0)
        self.assertNotIn("between", expr0)
        self.assertEqual(enable_expression(turns, 5), "0")


if __name__ == "__main__":
    unittest.main()
