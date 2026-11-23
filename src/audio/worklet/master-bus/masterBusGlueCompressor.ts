/**
 * O Girador - Étage 2 Master Bus : Ducking Vocal Spectral (`>= 300 Hz`) & Compresseur Bus Glue SSL (< 140 lignes)
 */
import {
  advanceLinearMixToward, computeMasterBypassRampStep,
  computeMasterTargetAestheticMix, computeMasterTargetCompMix,
} from './masterBusBypassRamp';
import { CONSOLE_HEADROOM_GAIN, CONSOLE_MAKEUP_GAIN, MasterBusDspState } from './masterBusWorkletTypes';

const TWO_PI = 2 * Math.PI, LOG10_20 = 20 / Math.LN10;

function sumSidechainStemInPlace(
  bufL: Float32Array, bufR: Float32Array, scInL: Float32Array | null, scInR: Float32Array | null,
  numFrames: number, gainLin: number, enabled: boolean
): void {
  if (!enabled || (!scInL && !scInR)) return;
  for (let i = 0; i < numFrames; i++) {
    const vL = (scInL ? scInL[i] : 0) * gainLin;
    const vR = (scInR ? scInR[i] : (scInL ? scInL[i] : 0)) * gainLin;
    bufL[i] += vL; bufR[i] += vR;
  }
}

export function processMasterStage2DuckingAndGlue(
  s: MasterBusDspState, bufL: Float32Array, bufR: Float32Array,
  scInL: Float32Array | null, scInR: Float32Array | null, numFrames: number
): void {
  const p = s.params, sr = s.sampleRate;
  const makeup = p.compensateConsoleHeadroom === false ? 1 : CONSOLE_MAKEUP_GAIN;
  const g = (p.masterGainLin ?? 1) * makeup, sumSc = p.sumSidechainToMix !== false;
  const targetAesthetic = computeMasterTargetAestheticMix(p);
  const targetCompMix = computeMasterTargetCompMix(p);
  const stepAesthetic = computeMasterBypassRampStep(sr, 1);
  const stepComp = computeMasterBypassRampStep(sr, Math.max(0.01, p.compMixPct / 100));

  let aesMix = s.activeAestheticMix;
  // 2A. Spectral Vocal Ducking (>= 300 Hz) from Sidechain Input 1
  if (p.duckingDb > 1e-3 && (scInL || scInR) && (targetAesthetic > 0 || aesMix > 0)) {
    const duckAlpha = 1 - Math.exp((-TWO_PI * 260) / sr);
    const scAtt = 1 - Math.exp(-1 / (0.012 * sr)), scRel = 1 - Math.exp(-1 / (0.180 * sr));
    let dLp1L = s.duckLp1L, dLp2L = s.duckLp2L, dLp1R = s.duckLp1R, dLp2R = s.duckLp2R;
    let scEnv = s.duckScEnv, maxDuck = 0;

    for (let i = 0; i < numFrames; i++) {
      aesMix = advanceLinearMixToward(aesMix, targetAesthetic, stepAesthetic);
      const vL = (scInL ? scInL[i] : 0) * g, vR = (scInR ? scInR[i] : vL / (g || 1)) * g;
      const vAbs = Math.max(Math.abs(vL), Math.abs(vR));
      scEnv += (vAbs > scEnv ? scAtt : scRel) * (vAbs - scEnv);

      const voxFloor = 0.01 * CONSOLE_HEADROOM_GAIN, voxSpan = 0.25 * CONSOLE_HEADROOM_GAIN;
      const normVox = scEnv <= voxFloor ? 0 : Math.min(1, (scEnv - voxFloor) / voxSpan);
      const instDuckDb = normVox * p.duckingDb * aesMix;
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
    if (aesMix === 0) {
      s.duckLp1L = 0; s.duckLp2L = 0; s.duckLp1R = 0; s.duckLp2R = 0; s.duckScEnv = 0; s.currentDuckDb = 0;
    } else {
      s.duckLp1L = dLp1L; s.duckLp2L = dLp2L; s.duckLp1R = dLp1R; s.duckLp2R = dLp2R; s.duckScEnv = scEnv; s.currentDuckDb = maxDuck;
    }
  } else {
    for (let i = 0; i < numFrames; i++) aesMix = advanceLinearMixToward(aesMix, targetAesthetic, stepAesthetic);
    s.currentDuckDb = 0;
    if (aesMix === 0) { s.duckLp1L = 0; s.duckLp2L = 0; s.duckLp1R = 0; s.duckLp2R = 0; s.duckScEnv = 0; }
  }
  s.activeAestheticMix = aesMix;

  // 2B. SSL Bus Glue Compressor with Internal Sidechain HPF & 25 ms click-free parallel mix ramp
  if (targetCompMix === 0 && s.activeCompMix === 0) {
    s.currentGrDb = 0; s.compEnvDb = 0;
    s.scHpfX1 = 0; s.scHpfX2 = 0; s.scHpfY1 = 0; s.scHpfY2 = 0;
    sumSidechainStemInPlace(bufL, bufR, scInL, scInR, numFrames, g, sumSc);
    return;
  }

  const useScHpf = p.scHpfHz >= 60;
  let b0 = 1, b1 = 0, b2 = 0, a1 = 0, a2 = 0;
  if (useScHpf) {
    const w0 = (TWO_PI * Math.min(150, p.scHpfHz)) / sr;
    const cosW = Math.cos(w0), alpha = Math.sin(w0) / Math.SQRT2, a0Inv = 1 / (1 + alpha);
    b0 = ((1 + cosW) * 0.5) * a0Inv; b1 = -(1 + cosW) * a0Inv; b2 = b0;
    a1 = (-2 * cosW) * a0Inv; a2 = (1 - alpha) * a0Inv;
  }

  const attC = 1 - Math.exp(-1 / (Math.max(0.001, p.attackMs / 1000) * sr));
  const relC = 1 - Math.exp(-1 / (Math.max(0.040, p.releaseMs / 1000) * sr));
  const T = p.thresholdDb, R = Math.max(1.001, p.ratio), W = Math.max(0, p.kneeDb), slope = 1 - 1 / R;
  const makeupLin = Math.pow(10, p.makeupDb / 20);
  let x1 = s.scHpfX1, x2 = s.scHpfX2, y1 = s.scHpfY1, y2 = s.scHpfY2;
  let envDb = s.compEnvDb, mix = s.activeCompMix, maxGr = 0;

  for (let i = 0; i < numFrames; i++) {
    const inL = bufL[i], inR = bufR[i], monoSc = 0.5 * (inL + inR);
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
    mix = advanceLinearMixToward(mix, targetCompMix, stepComp);
    const effGr = envDb * (targetCompMix > 0 ? mix / targetCompMix : mix);
    if (effGr > maxGr) maxGr = effGr;
    const wetGain = Math.pow(10, -envDb / 20) * makeupLin;
    bufL[i] = inL * (1 - mix + mix * wetGain);
    bufR[i] = inR * (1 - mix + mix * wetGain);
  }

  s.activeCompMix = mix;
  if (mix === 0) {
    s.scHpfX1 = 0; s.scHpfX2 = 0; s.scHpfY1 = 0; s.scHpfY2 = 0;
    s.compEnvDb = 0; s.currentGrDb = 0;
  } else {
    s.scHpfX1 = x1; s.scHpfX2 = x2; s.scHpfY1 = y1; s.scHpfY2 = y2;
    s.compEnvDb = envDb; s.currentGrDb = maxGr;
  }
  sumSidechainStemInPlace(bufL, bufR, scInL, scInR, numFrames, g, sumSc);
}
