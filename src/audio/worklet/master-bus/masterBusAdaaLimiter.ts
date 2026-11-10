/**
 * O Girador - Étage 3 Master Bus : Soft-Clipper ADAA 1er Ordre & Limiteur Lookahead True-Peak (< 125 lignes)
 * - Soft-Clipper ADAA : primitive analytique stable $F_1(u) = |u| + \ln(1 + e^{-2|u|}) - \ln 2$
 *   avec bascule analytique $\tanh(0.5(u + u_{prev}))$ dès que $|u - u_{prev}| < 10^{-5}$ (zéro `0/0`).
 * - Limiteur Brickwall Lookahead : ligne à retard circulaire pré-allouée de 64 échantillons par canal,
 *   plafond strict (`ceilingDb` `-3.0..-0.1 dBFS`, défaut `-0.3 dBFS`) toujours actif même en Éco Palier 2.
 */

import { MASTER_LOOKAHEAD_SAMPLES, MasterBusDspState } from './masterBusWorkletTypes';

const LN2 = Math.LN2;

function adaaF1Tanh(u: number): number {
  const absU = Math.abs(u);
  return absU + Math.log(1 + Math.exp(-2 * absU)) - LN2;
}

function adaaTanhStep(u: number, uPrev: number): number {
  const diff = u - uPrev;
  if (Math.abs(diff) < 1e-5) {
    return Math.tanh(0.5 * (u + uPrev));
  }
  return (adaaF1Tanh(u) - adaaF1Tanh(uPrev)) / diff;
}

export function processMasterStage3AdaaAndLimiter(
  s: MasterBusDspState,
  bufL: Float32Array,
  bufR: Float32Array,
  numFrames: number
): void {
  const p = s.params;
  const sr = s.sampleRate;

  // 3A. 1st-Order ADAA Soft-Clipper (bypassed in Eco Tier 2 or when disabled)
  if (!p.ecoBypassAesthetic && p.softClipEnabled) {
    const driveLin = Math.pow(10, Math.max(0, Math.min(6, p.softClipDriveDb)) / 20);
    const invDrive = 1 / Math.max(0.5, Math.tanh(driveLin));
    let prevL = s.adaaPrevL;
    let prevR = s.adaaPrevR;

    for (let i = 0; i < numFrames; i++) {
      const uL = bufL[i] * driveLin;
      const uR = bufR[i] * driveLin;
      bufL[i] = adaaTanhStep(uL, prevL) * invDrive;
      bufR[i] = adaaTanhStep(uR, prevR) * invDrive;
      prevL = uL;
      prevR = uR;
    }

    s.adaaPrevL = prevL;
    s.adaaPrevR = prevR;
  }

  // 3B. 64-Sample Lookahead True-Peak Brickwall Limiter (ALWAYS ACTIVE)
  const targetCeilingLin = Math.pow(10, Math.max(-3.0, Math.min(-0.1, p.ceilingDb)) / 20);
  const smoothC = s.smoothCoeff;
  const relC = 1 - Math.exp(-1 / (0.060 * sr));
  const attStep = 1 / MASTER_LOOKAHEAD_SAMPLES;
  const delayL = s.lookaheadBufL;
  const delayR = s.lookaheadBufR;
  const peakRing = s.lookaheadPeakBuf;
  let wIdx = s.lookaheadWriteIdx;
  let envGain = s.limiterEnvGain;
  let ceilingLin = s.smoothCeilingLin;

  for (let i = 0; i < numFrames; i++) {
    ceilingLin += smoothC * (targetCeilingLin - ceilingLin);
    const inL = bufL[i];
    const inR = bufR[i];
    const delayedL = delayL[wIdx];
    const delayedR = delayR[wIdx];

    delayL[wIdx] = inL;
    delayR[wIdx] = inR;
    const inPeak = Math.max(Math.abs(inL), Math.abs(inR));
    peakRing[wIdx] = inPeak;
    wIdx = (wIdx + 1) & (MASTER_LOOKAHEAD_SAMPLES - 1);

    // Find max peak across lookahead window
    let maxWindowPeak = inPeak;
    for (let k = 0; k < MASTER_LOOKAHEAD_SAMPLES; k += 4) {
      const p0 = peakRing[k], p1 = peakRing[k + 1], p2 = peakRing[k + 2], p3 = peakRing[k + 3];
      const m01 = p0 > p1 ? p0 : p1;
      const m23 = p2 > p3 ? p2 : p3;
      const m = m01 > m23 ? m01 : m23;
      if (m > maxWindowPeak) maxWindowPeak = m;
    }

    const reqGain = maxWindowPeak > ceilingLin ? ceilingLin / maxWindowPeak : 1.0;
    if (reqGain < envGain) {
      envGain -= Math.max(attStep * (envGain - reqGain), (envGain - reqGain) * 0.25);
      if (envGain < reqGain) envGain = reqGain;
    } else {
      envGain += relC * (reqGain - envGain);
    }

    const delayedPeak = Math.max(Math.abs(delayedL), Math.abs(delayedR));
    const safeGain = delayedPeak * envGain > ceilingLin ? ceilingLin / delayedPeak : envGain;

    bufL[i] = delayedL * safeGain;
    bufR[i] = delayedR * safeGain;
  }

  s.lookaheadWriteIdx = wIdx;
  s.limiterEnvGain = envGain;
  s.smoothCeilingLin = ceilingLin;
}

