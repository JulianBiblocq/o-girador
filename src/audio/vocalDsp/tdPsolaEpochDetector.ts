/**
 * tdPsolaEpochDetector.ts
 * Étage 2 du moteur DSP Vocal Studio (Sequenciador) :
 * Extraction des Époques Glottiques (GCI) à Phase Nulle (filtfilt 80 Hz - 900 Hz)
 * avec alignement par corrélation croisée inter-périodes et précision sub-échantillon (< 140 lignes).
 */
import { type VocalFrameClassification, analyzeVocalFrames } from './vocalTransientSeparator';

export interface GlottalEpochAnalysis {
  epochs: Float32Array; epochPeriods: Float32Array; framePeriods: Float32Array; voicedMask: Uint8Array; hopSamples: number;
}

export function filterZeroPhaseFundamentalBand(rawAudio: Float32Array, sampleRate: number): Float32Array {
  const n = rawAudio.length, buf = new Float32Array(n);
  if (n < 4 || sampleRate <= 0) return new Float32Array(rawAudio);
  const hpA = Math.exp((-2 * Math.PI * 80) / sampleRate), lpA = Math.exp((-2 * Math.PI * 900) / sampleRate);
  let hp = 0, xPrev = rawAudio[0], lp = 0;
  for (let i = 0; i < n; i++) {
    const x = rawAudio[i]; hp = hpA * (hp + x - xPrev); xPrev = x; lp = lpA * lp + (1 - lpA) * hp; buf[i] = lp;
  }
  hp = 0; xPrev = buf[n - 1]; lp = 0;
  for (let i = n - 1; i >= 0; i--) {
    const x = buf[i]; hp = hpA * (hp + x - xPrev); xPrev = x; lp = lpA * lp + (1 - lpA) * hp; buf[i] = lp;
  }
  return buf;
}

function refinePeakSubSample(sig: Float32Array, idx: number): number {
  if (idx <= 0 || idx >= sig.length - 1) return idx;
  const ym1 = sig[idx - 1], y0 = sig[idx], yp1 = sig[idx + 1];
  const denom = ym1 - 2 * y0 + yp1;
  if (Math.abs(denom) < 1e-9) return idx;
  const delta = 0.5 * (ym1 - yp1) / denom;
  return idx + Math.max(-0.5, Math.min(0.5, delta));
}

function alignEpochByCrossCorrelation(
  f0Wave: Float32Array,
  rawAudio: Float32Array,
  prevEpochInt: number,
  expectedIdx: number,
  period: number
): number {
  const n = f0Wave.length;
  const tol = Math.max(2, Math.round(period * 0.24));
  const s0 = Math.max(prevEpochInt + Math.round(period * 0.62), expectedIdx - tol);
  const s1 = Math.min(n - 2, expectedIdx + tol);
  const halfWin = Math.max(8, Math.min(Math.round(period * 0.4), prevEpochInt, n - 1 - s1));
  if (s0 > s1 || halfWin < 4) return Math.min(n - 2, Math.max(1, expectedIdx));

  let bestCand = expectedIdx, bestScore = -Infinity;
  const step = f0Wave.length > 96000 ? 2 : 1;
  for (let cand = s0; cand <= s1; cand++) {
    let dot = 0, e1 = 0, e2 = 0;
    for (let k = -halfWin; k <= halfWin; k += step) {
      const a = f0Wave[prevEpochInt + k] + 0.3 * rawAudio[prevEpochInt + k];
      const b = f0Wave[cand + k] + 0.3 * rawAudio[cand + k];
      dot += a * b; e1 += a * a; e2 += b * b;
    }
    const corr = e1 * e2 > 1e-10 ? dot / Math.sqrt(e1 * e2) : 0;
    const exc = f0Wave[cand] + 0.35 * rawAudio[cand];
    const phasePenalty = ((cand - expectedIdx) / tol) * ((cand - expectedIdx) / tol);
    const score = corr * 0.65 + exc * 0.45 - 0.10 * phasePenalty;
    if (score > bestScore) { bestScore = score; bestCand = cand; }
  }
  return refinePeakSubSample(f0Wave, bestCand);
}

export function detectGlottalEpochs(
  rawAudio: Float32Array,
  sampleRate: number,
  frames?: VocalFrameClassification[]
): GlottalEpochAnalysis {
  const n = rawAudio.length;
  const resolvedFrames = frames ?? analyzeVocalFrames(rawAudio, sampleRate, 10);
  const hopSamples = Math.max(64, Math.round(0.01 * sampleRate));
  const numFrames = Math.max(1, resolvedFrames.length);
  const framePeriods = new Float32Array(numFrames);
  const voicedMask = new Uint8Array(n);
  const defaultT0 = Math.max(24, Math.round(sampleRate / 180));

  for (let f = 0; f < resolvedFrames.length; f++) {
    const fr = resolvedFrames[f];
    framePeriods[f] = Math.max(16, fr.estimatedPeriodSamples || defaultT0);
    const v = fr.isUnvoicedOrTransient ? 0 : 1;
    for (let i = fr.startSample; i < fr.endSample && i < n; i++) voicedMask[i] = v;
  }

  const f0Wave = filterZeroPhaseFundamentalBand(rawAudio, sampleRate);
  const epochs: number[] = [];
  const epochPeriods: number[] = [];
  let cursor = 0;

  while (cursor < n - 2) {
    const fIdx = Math.min(numFrames - 1, Math.floor(cursor / hopSamples));
    const T0 = Math.max(16, framePeriods[fIdx] || defaultT0);
    if (voicedMask[cursor] === 0) {
      epochs.push(cursor);
      epochPeriods.push(T0);
      cursor += Math.round(T0);
      continue;
    }
    const searchEnd = Math.min(n - 2, Math.round(cursor + T0));
    let seedIdx = Math.max(1, cursor), bestVal = -Infinity;
    for (let s = seedIdx; s <= searchEnd; s++) {
      const val = f0Wave[s] + 0.35 * rawAudio[s];
      if (val > bestVal) { bestVal = val; seedIdx = s; }
    }
    let mk = refinePeakSubSample(f0Wave, seedIdx);
    epochs.push(mk);
    epochPeriods.push(T0);

    while (mk < n - 2) {
      const curInt = Math.min(n - 2, Math.max(1, Math.round(mk)));
      const pLocal = Math.max(16, framePeriods[Math.min(numFrames - 1, Math.floor(curInt / hopSamples))] || T0);
      const expected = Math.round(mk + pLocal);
      if (expected >= n - 2 || voicedMask[expected] === 0) {
        cursor = Math.round(mk + pLocal);
        break;
      }
      const nextMk = alignEpochByCrossCorrelation(f0Wave, rawAudio, curInt, expected, pLocal);
      const actualPeriod = Math.max(16, nextMk - mk);
      epochs.push(nextMk);
      epochPeriods.push(actualPeriod);
      mk = nextMk;
    }
  }

  return {
    epochs: Float32Array.from(epochs),
    epochPeriods: Float32Array.from(epochPeriods),
    framePeriods,
    voicedMask,
    hopSamples,
  };
}
