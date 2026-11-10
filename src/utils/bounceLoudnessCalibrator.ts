/**
 * bounceLoudnessCalibrator.ts
 * Auto-calibration Mastering du Bounce WAV (ITU-R BS.1770-4 K-Weighting + Gate -70 LUFS / -10 LU) :
 * - Cible `-14.0 LUFS` par gain linéaire constant (0..+12 dB) préservant 100% de la dynamique musicale.
 * - Garde-fou anti-écrasement (`MAX_PEAK_SHAVE_DB = 2.5 dB`) et plafond strict `-0.5 dBFS` (< 135 lignes).
 */
import {
  MASTER_LOOKAHEAD_SAMPLES,
  createMasterBusDspState,
  updateMasterBusDspParams,
} from '../audio/worklet/master-bus/masterBusWorkletTypes';
import { processMasterStage3AdaaAndLimiter } from '../audio/worklet/master-bus/masterBusAdaaLimiter';

export const BOUNCE_TARGET_LUFS = -14.0;
export const BOUNCE_CEILING_DBFS = -0.5;
export const BOUNCE_MAX_PEAK_SHAVE_DB = 2.5;

export interface BounceLoudnessCalibrationResult {
  integratedLufsBefore: number;
  integratedLufsAfter: number;
  appliedGainDb: number;
  finalPeakDb: number;
}

interface BiquadCoeffs { b0: number; b1: number; b2: number; a1: number; a2: number; }

function computeKWeightingCoeffs(sr: number): { shelf: BiquadCoeffs; rlb: BiquadCoeffs } {
  const A = Math.pow(10, 3.999843853973347 / 40), wS = (2 * Math.PI * 1681.974450955533) / sr;
  const cosS = Math.cos(wS), alphaS = Math.sin(wS) / (2 * 0.7071752369554196), kS = 2 * Math.sqrt(A) * alphaS;
  const a0S = (A + 1) - (A - 1) * cosS + kS;
  const shelf: BiquadCoeffs = {
    b0: (A * ((A + 1) + (A - 1) * cosS + kS)) / a0S, b1: (-2 * A * ((A - 1) + (A + 1) * cosS)) / a0S,
    b2: (A * ((A + 1) + (A - 1) * cosS - kS)) / a0S, a1: (2 * ((A - 1) - (A + 1) * cosS)) / a0S,
    a2: ((A + 1) - (A - 1) * cosS - kS) / a0S,
  };
  const wR = (2 * Math.PI * 38.13547087602444) / sr, cosR = Math.cos(wR), alphaR = Math.sin(wR) / (2 * 0.5003270373238773);
  const a0R = 1 + alphaR;
  const rlb: BiquadCoeffs = {
    b0: (1 + cosR) / (2 * a0R), b1: -(1 + cosR) / a0R, b2: (1 + cosR) / (2 * a0R),
    a1: (-2 * cosR) / a0R, a2: (1 - alphaR) / a0R,
  };
  return { shelf, rlb };
}

export function measureIntegratedKWeightedLufs(
  left: Float32Array, right: Float32Array, sampleRate: number
): { integratedLufs: number; peakDb: number; peakLin: number } {
  const n = Math.min(left.length, right.length);
  if (n === 0) return { integratedLufs: -100, peakDb: -100, peakLin: 0 };
  const sr = sampleRate > 8000 ? sampleRate : 48000, { shelf: sC, rlb: rC } = computeKWeightingCoeffs(sr);
  const hop = Math.max(1, Math.round(0.1 * sr)), subEnergies: number[] = [];
  let sX1L = 0, sX2L = 0, sY1L = 0, sY2L = 0, rX1L = 0, rX2L = 0, rY1L = 0, rY2L = 0;
  let sX1R = 0, sX2R = 0, sY1R = 0, sY2R = 0, rX1R = 0, rX2R = 0, rY1R = 0, rY2R = 0;
  let peakLin = 0, subSum = 0, subCount = 0;

  for (let i = 0; i < n; i++) {
    const xL = left[i], xR = right[i], p = Math.max(Math.abs(xL), Math.abs(xR));
    if (p > peakLin) peakLin = p;
    const uL = sC.b0 * xL + sC.b1 * sX1L + sC.b2 * sX2L - sC.a1 * sY1L - sC.a2 * sY2L;
    sX2L = sX1L; sX1L = xL; sY2L = sY1L; sY1L = uL;
    const yL = rC.b0 * uL + rC.b1 * rX1L + rC.b2 * rX2L - rC.a1 * rY1L - rC.a2 * rY2L;
    rX2L = rX1L; rX1L = uL; rY2L = rY1L; rY1L = yL;
    const uR = sC.b0 * xR + sC.b1 * sX1R + sC.b2 * sX2R - sC.a1 * sY1R - sC.a2 * sY2R;
    sX2R = sX1R; sX1R = xR; sY2R = sY1R; sY1R = uR;
    const yR = rC.b0 * uR + rC.b1 * rX1R + rC.b2 * rX2R - rC.a1 * rY1R - rC.a2 * rY2R;
    rX2R = rX1R; rX1R = uR; rY2R = rY1R; rY1R = yR;
    subSum += yL * yL + yR * yR;
    if (++subCount === hop) { subEnergies.push(subSum / subCount); subSum = 0; subCount = 0; }
  }
  if (subCount > 0 && subEnergies.length === 0) subEnergies.push(subSum / subCount);
  const peakDb = peakLin > 1e-6 ? 20 * Math.log10(peakLin) : -100;
  if (peakLin <= 1e-6 || subEnergies.length === 0) return { integratedLufs: -100, peakDb, peakLin };

  const blocks400: number[] = [];
  if (subEnergies.length < 4) blocks400.push(subEnergies.reduce((a, b) => a + b, 0) / subEnergies.length);
  else for (let j = 0; j <= subEnergies.length - 4; j++) blocks400.push(0.25 * (subEnergies[j] + subEnergies[j + 1] + subEnergies[j + 2] + subEnergies[j + 3]));

  const absGateZ = Math.pow(10, (-70 + 0.691) / 10), activeBlocks = blocks400.filter((z) => z > absGateZ);
  if (activeBlocks.length === 0) return { integratedLufs: -100, peakDb, peakLin };
  const meanActiveZ = activeBlocks.reduce((a, b) => a + b, 0) / activeBlocks.length;
  const gated = activeBlocks.filter((z) => z > meanActiveZ * 0.1);
  const finalBlocks = gated.length > 0 ? gated : activeBlocks;
  const meanGatedZ = finalBlocks.reduce((a, b) => a + b, 0) / finalBlocks.length;
  return { integratedLufs: -0.691 + 10 * Math.log10(meanGatedZ), peakDb, peakLin };
}

export function calibrateBounceLoudnessInPlace(
  left: Float32Array, right: Float32Array, sampleRate: number
): BounceLoudnessCalibrationResult {
  const n = Math.min(left.length, right.length);
  const { integratedLufs, peakDb, peakLin } = measureIntegratedKWeightedLufs(left, right, sampleRate);
  if (!Number.isFinite(integratedLufs) || integratedLufs < -65 || peakLin <= 1e-6 || n === 0) {
    return { integratedLufsBefore: -100, integratedLufsAfter: -100, appliedGainDb: 0, finalPeakDb: -100 };
  }

  const desiredGainDb = Math.max(0, Math.min(12.0, BOUNCE_TARGET_LUFS - integratedLufs));
  const maxAllowedGainDb = (BOUNCE_CEILING_DBFS - peakDb) + BOUNCE_MAX_PEAK_SHAVE_DB;
  const appliedGainDb = desiredGainDb > 0
    ? Math.max(0, Math.min(desiredGainDb, maxAllowedGainDb))
    : (peakDb > BOUNCE_CEILING_DBFS ? BOUNCE_CEILING_DBFS - peakDb : 0);

  const gainLin = Math.pow(10, appliedGainDb / 20), ceilingLin = Math.pow(10, BOUNCE_CEILING_DBFS / 20);
  let postPeak = 0;
  for (let i = 0; i < n; i++) {
    const l = left[i] * gainLin, r = right[i] * gainLin;
    left[i] = l; right[i] = r;
    const p = Math.max(Math.abs(l), Math.abs(r));
    if (p > postPeak) postPeak = p;
  }

  if (postPeak > ceilingLin) {
    const state = createMasterBusDspState(sampleRate > 8000 ? sampleRate : 48000);
    updateMasterBusDspParams(state, { softClipEnabled: false, ceilingDb: BOUNCE_CEILING_DBFS, ecoBypassAesthetic: false });
    state.smoothCeilingLin = ceilingLin;
    const bufL = new Float32Array(128), bufR = new Float32Array(128), total = n + MASTER_LOOKAHEAD_SAMPLES;
    postPeak = 0;
    for (let offset = 0; offset < total; offset += 128) {
      const len = Math.min(128, total - offset);
      for (let k = 0; k < len; k++) {
        const idx = offset + k;
        bufL[k] = idx < n ? left[idx] : 0; bufR[k] = idx < n ? right[idx] : 0;
      }
      processMasterStage3AdaaAndLimiter(state, bufL, bufR, len);
      for (let k = 0; k < len; k++) {
        const outIdx = offset + k - MASTER_LOOKAHEAD_SAMPLES;
        if (outIdx >= 0 && outIdx < n) {
          left[outIdx] = bufL[k]; right[outIdx] = bufR[k];
          const p = Math.max(Math.abs(bufL[k]), Math.abs(bufR[k]));
          if (p > postPeak) postPeak = p;
        }
      }
    }
  }
  const finalPeakDb = postPeak > 1e-6 ? 20 * Math.log10(postPeak) : -100;
  return { integratedLufsBefore: integratedLufs, integratedLufsAfter: integratedLufs + appliedGainDb, appliedGainDb, finalPeakDb };
}
