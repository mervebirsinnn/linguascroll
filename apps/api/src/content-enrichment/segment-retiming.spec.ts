import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { ABSOLUTE_PROFILE, RELATIVE_PROFILE, detectSpeechFromSamples, frameEnergiesDb, pcmS16leToSamples } from "./audio-onset";
import { evaluateTimingQa, retimeSegments, segmentTimingFingerprint, type TimedSegment } from "./segment-retiming";
import { assertTimingQaAllowsPromotion, TimingQaGateError } from "./timing-qa-gate";
import { parseAlignArgs } from "./align-onsets";

const SR = 16000;

/** [startMs, endMs] aralıklarında sabit genlikli ton, aralarında DİJİTAL sessizlik. Deterministik (rastgelelik yok). */
function synth(totalMs: number, speech: ReadonlyArray<readonly [number, number]>, amplitude = 8000): Int16Array {
  const samples = new Int16Array(Math.round((SR * totalMs) / 1000));
  for (const [from, to] of speech) {
    for (let i = Math.round((SR * from) / 1000); i < Math.round((SR * to) / 1000); i++) {
      samples[i] = Math.round(amplitude * Math.sin((2 * Math.PI * 220 * i) / SR));
    }
  }
  return samples;
}

const seg = (ordinal: number, startMs: number, endMs: number, text = `cümle ${ordinal}`): TimedSegment => ({ ordinal, startMs, endMs, text });

describe("audio-onset", () => {
  it("sessizlikle ayrılmış konuşma bölgelerinin başlangıcını 10 ms doğrulukla bulur", () => {
    const regions = detectSpeechFromSamples(synth(6000, [[700, 2400], [3200, 5000]]), SR, RELATIVE_PROFILE);
    expect(regions).toHaveLength(2);
    expect(Math.abs((regions[0]?.startMs as number) - 700)).toBeLessThanOrEqual(10);
    expect(Math.abs((regions[1]?.startMs as number) - 3200)).toBeLessThanOrEqual(10);
  });

  it("kısa kelime arası duraklar bölgeyi bölmez (mergeGap), uzun duraklar böler", () => {
    const regions = detectSpeechFromSamples(synth(5000, [[500, 1000], [1100, 1700], [3000, 3600]]), SR, RELATIVE_PROFILE);
    expect(regions).toHaveLength(2);
  });

  it("tamamen sessiz sinyal konuşma bölgesi üretmez", () => {
    expect(detectSpeechFromSamples(new Int16Array(SR * 2), SR, RELATIVE_PROFILE)).toEqual([]);
    expect(detectSpeechFromSamples(new Int16Array(SR * 2), SR, ABSOLUTE_PROFILE)).toEqual([]);
  });

  it("iki profil aynı sinyalde birbirinden BAĞIMSIZ yöntemle (göreli vs mutlak eşik) çalışır ama aynı onset'e yakınsar", () => {
    const samples = synth(4000, [[900, 2500]]);
    const a = detectSpeechFromSamples(samples, SR, RELATIVE_PROFILE)[0] as { startMs: number };
    const b = detectSpeechFromSamples(samples, SR, ABSOLUTE_PROFILE)[0] as { startMs: number };
    expect(RELATIVE_PROFILE.relativeDb).toBeDefined();
    expect(ABSOLUTE_PROFILE.absoluteDb).toBeDefined();
    expect(Math.abs(a.startMs - b.startMs)).toBeLessThanOrEqual(20);
  });

  it("sessiz kayıtta (düşük genlik) göreli profil çalışır, mutlak profil çalışmaz — bu yüzden ikisi ayrı sinyal", () => {
    const quiet = synth(4000, [[900, 2500]], 40); // ~ -58 dBFS
    expect(detectSpeechFromSamples(quiet, SR, RELATIVE_PROFILE)).toHaveLength(1);
    expect(detectSpeechFromSamples(quiet, SR, ABSOLUTE_PROFILE)).toHaveLength(0);
  });

  it("pcmS16leToSamples little-endian çözer; frameEnergiesDb tam ölçekte ~-3 dB verir", () => {
    const bytes = new Uint8Array([0x00, 0x80, 0xff, 0x7f]); // -32768, 32767
    expect(Array.from(pcmS16leToSamples(bytes))).toEqual([-32768, 32767]);
    const full = new Int16Array(160).fill(32767);
    expect(frameEnergiesDb(full, SR, 10)[0]).toBeGreaterThan(-0.1);
  });
});

describe("retimeSegments", () => {
  const speech = [[700, 2400], [3200, 5000], [6400, 8000]] as const;
  const regions = detectSpeechFromSamples(synth(9000, speech), SR, RELATIVE_PROFILE);

  it("Whisper'ın erken verdiği başlangıçları onset'e snap eder; metin ve endMs DEĞİŞMEZ", () => {
    const input = [seg(1, 0, 2500, "Hello there."), seg(2, 2900, 5100, "How are you?"), seg(3, 6100, 8100, "Fine, thanks.")];
    const { segments, details } = retimeSegments(input, regions);
    expect(segments.map((s) => s.text)).toEqual(input.map((s) => s.text));
    expect(segments.map((s) => s.endMs)).toEqual(input.map((s) => s.endMs));
    expect(segments.map((s) => Math.abs(s.startMs - [700, 3200, 6400][s.ordinal - 1]!)).every((error) => error <= 10)).toBe(true);
    expect(details.every((d) => d.status === "snapped")).toBe(true);
  });

  it("deterministiktir: aynı girdi iki kez aynı çıktıyı verir ve girdiyi mutate etmez", () => {
    const input = [seg(1, 0, 2500), seg(2, 2900, 5100), seg(3, 6100, 8100)];
    const snapshot = JSON.stringify(input);
    expect(retimeSegments(input, regions)).toEqual(retimeSegments(input, regions));
    expect(JSON.stringify(input)).toBe(snapshot);
  });

  it("zaten hizalı başlangıç 'aligned' olur ve değişmez", () => {
    const aligned = regions[0]!.startMs;
    const { details } = retimeSegments([seg(1, aligned, 2500)], regions);
    expect(details[0]?.status).toBe("aligned");
    expect(details[0]?.deltaMs).toBe(0);
  });

  it("onset bulunamayan segment (sessizlikle ayrılmamış devam cümlesi) OLDUĞU GİBİ kalır ve 'no-onset' olur — zaman uydurulmaz", () => {
    const continuous = detectSpeechFromSamples(synth(9000, [[700, 8000]]), SR, RELATIVE_PROFILE);
    const { segments, details } = retimeSegments([seg(1, 0, 3500), seg(2, 3500, 8100)], continuous);
    expect(details[0]?.status).toBe("snapped");
    expect(details[1]?.status).toBe("no-onset");
    expect(segments[1]?.startMs).toBe(3500);
  });

  it("sonraki segmentin onset'i önceki segmente atanmaz (üst sınır = sonraki orijinal başlangıç)", () => {
    // Segment 1 için gerçek konuşma yok; yalnızca segment 2'nin konuşması (3200) var.
    const only = detectSpeechFromSamples(synth(9000, [[3200, 5000]]), SR, RELATIVE_PROFILE);
    const { details } = retimeSegments([seg(1, 0, 2500), seg(2, 2900, 5100)], only);
    expect(details[0]?.status).toBe("no-onset");
    expect(details[1]?.status).toBe("snapped");
  });

  it("onset segmentin bitişine çok yakınsa (min süre sağlanamaz) aday sayılmaz, 'no-onset' olur ve başlangıç korunur", () => {
    const { details, segments } = retimeSegments([seg(1, 0, 900)], detectSpeechFromSamples(synth(3000, [[700, 2000]]), SR, RELATIVE_PROFILE));
    expect(details[0]?.status).toBe("no-onset"); // onset (700) >= end - minDuration (600) olduğu için aday bile değil
    expect(segments[0]?.startMs).toBe(0);
  });
});

describe("evaluateTimingQa", () => {
  const speech = [[700, 2400], [3200, 5000]] as const;
  const samples = synth(6000, speech);
  const primary = detectSpeechFromSamples(samples, SR, RELATIVE_PROFILE);
  const verifier = detectSpeechFromSamples(samples, SR, ABSOLUTE_PROFILE);

  it("düzeltilmiş başlangıçlar bağımsız dedektörle ±300 ms içindeyse GEÇER ve önceki hatayı (negatif=erken) raporlar", () => {
    const { details } = retimeSegments([seg(1, 0, 2500), seg(2, 2900, 5100)], primary);
    const qa = evaluateTimingQa(details, verifier);
    expect(qa.status).toBe("pass");
    expect(qa.meanPreErrorMs).toBeLessThan(0);
    expect(qa.maxAbsPostErrorMs).toBeLessThanOrEqual(20);
  });

  it("onset bulunamayan içerik KALIR (publish'e kapalı)", () => {
    const { details } = retimeSegments([seg(1, 0, 2500), seg(2, 2900, 5100), seg(3, 5200, 5900)], primary);
    const qa = evaluateTimingQa(details, verifier);
    expect(qa.status).toBe("fail");
    expect(qa.failures.join(" ")).toMatch(/#3/);
  });

  it("düzeltme doğrulayıcıdan 300 ms'den fazla saparsa KALIR (sahte onset'e snap güvenilir sayılmaz)", () => {
    const fakeDetails = [{ ordinal: 1, originalStartMs: 0, onsetMs: 1200, correctedStartMs: 1200, deltaMs: 1200, status: "snapped" as const }];
    const qa = evaluateTimingQa(fakeDetails, verifier);
    expect(qa.status).toBe("fail");
    expect(qa.segments[0]?.postErrorMs).toBeGreaterThan(300);
  });
});

describe("assertTimingQaAllowsPromotion", () => {
  let dir: string;
  const segments = [seg(1, 700, 2500), seg(2, 3200, 5100)];
  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), "timing-qa-"));
    fs.mkdirSync(path.join(dir, "clip"));
  });
  afterEach(() => fs.rmSync(dir, { recursive: true, force: true }));
  const writeQa = (status: "pass" | "fail", fingerprint: string): void =>
    fs.writeFileSync(path.join(dir, "clip", "timing-qa.json"), JSON.stringify({ contentId: "clip", status, toleranceMs: 300, correctedFingerprint: fingerprint, failures: status === "fail" ? ["#2: no-onset"] : [] }));

  it("QA kaydı yoksa kapı geçer (eski içerik davranışı değişmez)", () => {
    expect(() => assertTimingQaAllowsPromotion("clip", segments, dir)).not.toThrow();
  });
  it("status=fail terfiyi reddeder ve sebebi söyler", () => {
    writeQa("fail", segmentTimingFingerprint(segments));
    expect(() => assertTimingQaAllowsPromotion("clip", segments, dir)).toThrow(/GEÇMEDİ[\s\S]*no-onset/);
  });
  it("status=pass ve zamanlar birebir aynıysa geçer", () => {
    writeQa("pass", segmentTimingFingerprint(segments));
    expect(() => assertTimingQaAllowsPromotion("clip", segments, dir)).not.toThrow();
  });
  it("QA geçtikten sonra zamanlar değiştiyse (uygulanmadı/elle değişti) reddeder", () => {
    writeQa("pass", segmentTimingFingerprint(segments));
    expect(() => assertTimingQaAllowsPromotion("clip", [seg(1, 0, 2500), seg(2, 3200, 5100)], dir)).toThrow(TimingQaGateError);
  });
  it("bozuk QA kaydı sessizce geçmez", () => {
    fs.writeFileSync(path.join(dir, "clip", "timing-qa.json"), JSON.stringify({ status: "pass" }));
    expect(() => assertTimingQaAllowsPromotion("clip", segments, dir)).toThrow(TimingQaGateError);
  });
  it("metin değişimi parmak izini değiştirir", () => {
    expect(segmentTimingFingerprint(segments)).not.toBe(segmentTimingFingerprint([seg(1, 700, 2500, "başka"), seg(2, 3200, 5100)]));
  });
});

describe("parseAlignArgs", () => {
  it("virgüllü liste, tekrarlı bayrak ve --apply ayrıştırılır", () => {
    expect(parseAlignArgs(["--content-ids", "a-b,c-d", "--content-id", "e", "--apply"])).toEqual({ contentIds: ["a-b", "c-d", "e"], apply: true, reportDir: null });
  });
  it("içerik yoksa, geçersiz id'de ve bilinmeyen argümanda hata verir", () => {
    expect(() => parseAlignArgs([])).toThrow();
    expect(() => parseAlignArgs(["--content-ids", "../x"])).toThrow();
    expect(() => parseAlignArgs(["--content-ids", "a", "--force"])).toThrow();
  });
});
