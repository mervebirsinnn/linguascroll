/**
 * Ses dalga biçiminden KONUŞMA BÖLGELERİ (gerçek audio onset/offset) çıkaran saf (I/O'suz) fonksiyonlar.
 *
 * Neden var: Whisper segment başlangıçlarını konuşmanın gerçek başlangıcından 0–700 ms ERKEN veriyor
 * (ölçüm: bkz. content/timing-qa raporu); altyazı sesten önce yanıyor. Düzeltme, transcript METNİNE ve
 * elle girilmiş zamanlara dayanmaz: yalnızca PCM'den ölçülen onset'e snap eder (bkz. segment-retiming.ts).
 *
 * İki BAĞIMSIZ dedektör profili vardır (aynı sinyale iki farklı yöntem): düzeltme `RELATIVE_PROFILE` ile
 * yapılır, doğrulama `ABSOLUTE_PROFILE` ile — düzeltmenin kendi ölçümüne karşı "doğrulanması" (döngüsel
 * test) engellenir. `scripts/free-video/speech_timing.py` aynı mutlak eşik sınıfını (-40 dBFS RMS) kullanır.
 */

export interface SpeechRegion {
  readonly startMs: number;
  readonly endMs: number;
}

export interface DetectorProfile {
  readonly name: string;
  readonly frameMs: number;
  /** Verilirse eşik = (tepe seviye - relativeDb); tepe = enerjinin 95. yüzdeliği. Kayıt seviyesinden bağımsız. */
  readonly relativeDb?: number;
  /** Verilirse eşik sabit dBFS'tir (ör. -40). `relativeDb` ile birlikte verilirse mutlak eşik kullanılır. */
  readonly absoluteDb?: number;
  /** Bölge sayılması için en az ardışık aktif süre. */
  readonly minRegionMs: number;
  /** Bu süreden kısa boşluklar iki bölgeyi BİRLEŞTİRİR (kelime arası duraklar konuşmayı bölmesin). */
  readonly mergeGapMs: number;
}

export const RELATIVE_PROFILE: DetectorProfile = { name: "relative(-32dB from p95)", frameMs: 10, relativeDb: 32, minRegionMs: 120, mergeGapMs: 150 };
export const ABSOLUTE_PROFILE: DetectorProfile = { name: "absolute(-40dBFS)", frameMs: 20, absoluteDb: -40, minRegionMs: 100, mergeGapMs: 200 };

/** Dijital sessizlikte log(0)'ı önleyen taban (dB). */
const SILENCE_FLOOR_DB = -120;

/** Her frame için RMS seviyesi (dBFS, 16-bit tam ölçek = 0 dB). Eksik son frame atılır. */
export function frameEnergiesDb(samples: Int16Array, sampleRate: number, frameMs: number): number[] {
  const frameSize = Math.round((sampleRate * frameMs) / 1000);
  if (frameSize <= 0) throw new Error("frameMs geçersiz");
  const energies: number[] = [];
  for (let start = 0; start + frameSize <= samples.length; start += frameSize) {
    let sumSquares = 0;
    for (let i = start; i < start + frameSize; i++) {
      const value = (samples[i] as number) / 32768;
      sumSquares += value * value;
    }
    const meanSquare = sumSquares / frameSize;
    energies.push(meanSquare > 0 ? Math.max(SILENCE_FLOOR_DB, 10 * Math.log10(meanSquare)) : SILENCE_FLOOR_DB);
  }
  return energies;
}

function percentile(sortedAscending: readonly number[], fraction: number): number {
  return sortedAscending[Math.min(sortedAscending.length - 1, Math.floor(sortedAscending.length * fraction))] as number;
}

/** Profilin kullandığı eşik (dBFS). Sinyal tamamen sessizse `null` (konuşma yok). */
export function resolveThresholdDb(energiesDb: readonly number[], profile: DetectorProfile): number | null {
  if (energiesDb.length === 0) return null;
  if (profile.absoluteDb !== undefined) return profile.absoluteDb;
  if (profile.relativeDb === undefined) throw new Error(`Profil "${profile.name}" absoluteDb veya relativeDb gerektirir`);
  const sorted = [...energiesDb].sort((a, b) => a - b);
  const floor = percentile(sorted, 0.1);
  const peak = percentile(sorted, 0.95);
  if (peak <= SILENCE_FLOOR_DB + 1) return null;
  // Taban + 6 dB: gürültü tabanı yüksek kayıtlarda eşik tabanın altına inmesin.
  return Math.max(floor + 6, peak - profile.relativeDb);
}

export function detectSpeechRegions(energiesDb: readonly number[], profile: DetectorProfile): SpeechRegion[] {
  const threshold = resolveThresholdDb(energiesDb, profile);
  if (threshold === null) return [];
  const raw: Array<[number, number]> = [];
  let activeStart = -1;
  for (let i = 0; i <= energiesDb.length; i++) {
    const active = i < energiesDb.length && (energiesDb[i] as number) > threshold;
    if (active && activeStart < 0) activeStart = i;
    if (!active && activeStart >= 0) {
      raw.push([activeStart * profile.frameMs, i * profile.frameMs]);
      activeStart = -1;
    }
  }
  const merged: Array<[number, number]> = [];
  for (const region of raw) {
    const last = merged[merged.length - 1];
    if (last && region[0] - last[1] <= profile.mergeGapMs) last[1] = region[1];
    else merged.push([region[0], region[1]]);
  }
  return merged.filter(([start, end]) => end - start >= profile.minRegionMs).map(([startMs, endMs]) => ({ startMs, endMs }));
}

/** s16le (little-endian) ham baytlarını Int16Array'e çevirir. */
export function pcmS16leToSamples(bytes: Uint8Array): Int16Array {
  const sampleCount = Math.floor(bytes.length / 2);
  const samples = new Int16Array(sampleCount);
  const view = new DataView(bytes.buffer, bytes.byteOffset, sampleCount * 2);
  for (let i = 0; i < sampleCount; i++) samples[i] = view.getInt16(i * 2, true);
  return samples;
}

export function detectSpeechFromSamples(samples: Int16Array, sampleRate: number, profile: DetectorProfile): SpeechRegion[] {
  return detectSpeechRegions(frameEnergiesDb(samples, sampleRate, profile.frameMs), profile);
}
