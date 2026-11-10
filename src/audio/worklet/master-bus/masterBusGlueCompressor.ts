/**
 * O Girador - Étage 2 Master Bus : Ducking Vocal Spectral (`>= 300 Hz`) & Compresseur Bus Glue SSL (< 130 lignes)
 * - Ducking Vocal : atténue uniquement la bande `>= 300 Hz` de l'entrée 0 lorsque l'entrée 1 (`Toada`) chante,
 *   préservant 100 % du sous-grave des Alfaias (`55–90 Hz`).
 * - Compresseur Bus Glue : détecteur stéréo couplé avec filtre Sidechain HPF 2e ordre Butterworth (`95 Hz` défaut),
 *   soft-knee quadratique, ballistiques douces et Mix % parallèle (`0..100 %`).
 */

import { MasterBusDspState } from './masterBusWorkletTypes';

const TWO_PI = 2 * Math.PI;
const LOG10_20 = 20 / Math.LN10;

function sumSidechainStemInPlace(
  bufL: Float32Array, bufR: Float32Array,
  scInL: Float32Array | null, scInR: Float32Array | null,
  numFrames: number, gainLin: number, enabled: boolean
): void {
  if (!enabled || (!scInL && !scInR)) return;
  for (let i = 0; i < numFrames; i++) {
    const vL = (scInL ? scInL[i] : 0) * gainLin;
    const vR = (scInR ? scInR[i] : (scInL ? scInL[i] : 0)) * gainLin;
    bufL[i] += vL;
    bufR[i] += vR;
  }
}

export function processMasterStage2DuckingAndGlue(
  s: MasterBusDspState,
  bufL: Float32Array,
  bufR: Float32Array,
  scInL: Float32Array | null,
  scInR: Float32Array | null,
  numFrames: number
): void {
  const p = s.params;
  const g = p.masterGainLin ?? 1;
  const sumSc = p.sumSidechainToMix !== false;
  if (p.ecoBypassAesthetic) {
    s.currentDuckDb = 0;
    s.currentGrDb = 0;
    sumSidechainStemInPlace(bufL, bufR, scInL, scInR, numFrames, g, sumSc);
    return;
  }
  const sr = s.sampleRate;

  // 2A. Spectral Vocal Ducking (>= 300 Hz) from Sidechain Input 1 (2-stage complementary high-shelf)
  if (p.duckingDb > 1e-3 && (scInL || scInR)) {
    const duckAlpha = 1 - Math.exp((-TWO_PI * 260) / sr);
    const scAtt = 1 - Math.exp(-1 / (0.012 * sr));
    const scRel = 1 - Math.exp(-1 / (0.180 * sr));
    let dLp1L = s.duckLp1L, dLp2L = s.duckLp2L, dLp1R = s.duckLp1R, dLp2R = s.duckLp2R;
    let scEnv = s.duckScEnv, maxDuck = 0;

    for (let i = 0; i < numFrames; i++) {
      const vL = (scInL ? scInL[i] : 0) * g;
      const vR = (scInR ? scInR[i] : vL / (g || 1)) * g;
      const vAbs = Math.max(Math.abs(vL), Math.abs(vR));
      scEnv += (vAbs > scEnv ? scAtt : scRel) * (vAbs - scEnv);

      // Map vocal envelope (-40 dB .. -10 dB -> 0 .. 1)
      const normVox = scEnv <= 0.01 ? 0 : Math.min(1, (scEnv - 0.01) / 0.25);
      const instDuckDb = normVox * p.duckingDb;
      if (instDuckDb > maxDuck) maxDuck = instDuckDb;
      const stageGain = instDuckDb > 1e-4 ? Math.pow(10, -instDuckDb / 40) : 1;

      const xL = bufL[i], xR = bufR[i];
      dLp1L += duckAlpha * (xL - dLp1L);
      const s1L = dLp1L + (xL - dLp1L) * stageGain;
      dLp2L += duckAlpha * (s1L - dLp2L);
      bufL[i] = dLp2L + (s1L - dLp2L) * stageGain;

      dLp1R += duckAlpha * (xR - dLp1R);
      const s1R = dLp1R + (xR - dLp1R) * stageGain;
      dLp2R += duckAlpha * (s1R - dLp2R);
      bufR[i] = dLp2R + (s1R - dLp2R) * stageGain;
    }
    s.duckLp1L = dLp1L; s.duckLp2L = dLp2L; s.duckLp1R = dLp1R; s.duckLp2R = dLp2R;
    s.duckScEnv = scEnv; s.currentDuckDb = maxDuck;
  } else {
    s.currentDuckDb = 0;
  }

  // 2B. SSL Bus Glue Compressor with Internal Sidechain HPF (Biquad Butterworth 2nd order)
  const mix = Math.max(0, Math.min(1, p.compMixPct / 100));
  if (!p.compressorEnabled || p.ratio <= 1.001 || mix <= 1e-4) {
    s.currentGrDb = 0;
    sumSidechainStemInPlace(bufL, bufR, scInL, scInR, numFrames, g, sumSc);
    return;
  }

  const useScHpf = p.scHpfHz >= 60;
  let b0 = 1, b1 = 0, b2 = 0, a1 = 0, a2 = 0;
  if (useScHpf) {
    const w0 = (TWO_PI * Math.min(150, p.scHpfHz)) / sr;
    const cosW = Math.cos(w0), alpha = Math.sin(w0) / Math.SQRT2;
    const a0Inv = 1 / (1 + alpha);
    b0 = ((1 + cosW) * 0.5) * a0Inv; b1 = -(1 + cosW) * a0Inv; b2 = b0;
    a1 = (-2 * cosW) * a0Inv; a2 = (1 - alpha) * a0Inv;
  }

  const attC = 1 - Math.exp(-1 / (Math.max(0.001, p.attackMs / 1000) * sr));
  const relC = 1 - Math.exp(-1 / (Math.max(0.040, p.releaseMs / 1000) * sr));
  const T = p.thresholdDb, R = p.ratio, W = Math.max(0, p.kneeDb), slope = 1 - 1 / R;
  const makeupLin = Math.pow(10, p.makeupDb / 20);
  let x1 = s.scHpfX1, x2 = s.scHpfX2, y1 = s.scHpfY1, y2 = s.scHpfY2;
  let envDb = s.compEnvDb, maxGr = 0;

  for (let i = 0; i < numFrames; i++) {
    const inL = bufL[i], inR = bufR[i];
    const monoSc = 0.5 * (inL + inR);
    let detSig = Math.max(Math.abs(inL), Math.abs(inR));
    if (useScHpf) {
      const y = b0 * monoSc + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2;
      x2 = x1; x1 = monoSc; y2 = y1; y1 = y;
      detSig = Math.abs(y);
    }

    const levelDb = detSig > 1e-5 ? LOG10_20 * Math.log(detSig) : -100;
    let targetGrDb = 0;
    const over = levelDb - T;
    if (W > 0.01 && over > -W * 0.5 && over < W * 0.5) {
      const k = over + W * 0.5;
      targetGrDb = (slope * k * k) / (2 * W);
    } else if (over >= W * 0.5) {
      targetGrDb = slope * over;
    }

    envDb += (targetGrDb > envDb ? attC : relC) * (targetGrDb - envDb);
    if (envDb > maxGr) maxGr = envDb;
    const wetGain = Math.pow(10, -envDb / 20) * makeupLin;
    bufL[i] = inL * (1 - mix + mix * wetGain);
    bufR[i] = inR * (1 - mix + mix * wetGain);
  }

  s.scHpfX1 = x1; s.scHpfX2 = x2; s.scHpfY1 = y1; s.scHpfY2 = y2;
  s.compEnvDb = envDb; s.currentGrDb = maxGr;
  sumSidechainStemInPlace(bufL, bufR, scInL, scInR, numFrames, g, sumSc);
}
