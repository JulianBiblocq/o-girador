/**
 * busCompressorDspCore.ts — Noyau Mathématique Pur Zéro Latence du Compresseur VCA de Bus (< 125 lignes).
 * Partagé à l'identique entre l'AudioWorklet temps réel et l'export WAV hors-ligne (parité bit-à-bit).
 *
 * Chaîne : HPF Butterworth sidechain (détection seule) -> détecteur stéréo lié max(|L|,|R|)
 *          -> calculateur Soft-Knee (dB) -> balistique attack/release -> makeup -> mix parallèle.
 * Le signal audio (Dry ET Wet) conserve 100 % de son sous-grave : seul le détecteur est filtré.
 * 0 sample de lookahead => mix parallèle sans aucun filtrage en peigne.
 */
import {
  BUS_COMP_BYPASS_RAMP_SEC,
  BusCompressorDspParams,
  BusCompressorDspState,
  createBusCompressorDspState,
  refreshBusCompressorCoefficients,
  resetBusCompressorDetector,
} from './busCompressorDspState';

const DB_TO_LN = Math.LN10 / 20;
const LN_TO_DB = 20 / Math.LN10;
const DET_FLOOR = 1e-9;
const DENORMAL = 1e-20;

export function computeBusCompTargetMix(p: BusCompressorDspParams): number {
  if (!p.enabled || p.ecoBypass) return 0;
  return Math.max(0, Math.min(1, p.mixPct / 100));
}

/** Retourne la réduction de gain maximale (dB, >= 0) atteinte sur le bloc. */
export function processBusCompressorBlock(
  inL: Float32Array, inR: Float32Array | null,
  outL: Float32Array, outR: Float32Array,
  params: BusCompressorDspParams, state: BusCompressorDspState, sampleRate: number
): number {
  const n = Math.min(inL.length, outL.length, outR.length);
  const targetMix = computeBusCompTargetMix(params);

  if (targetMix === 0 && state.activeMix === 0) {
    if (!state.isIdle) { resetBusCompressorDetector(state); state.isIdle = true; }
    if (outL !== inL) outL.set(n === inL.length ? inL : inL.subarray(0, n));
    const srcR = inR ?? inL;
    if (outR !== srcR) outR.set(n === srcR.length ? srcR : srcR.subarray(0, n));
    return 0;
  }
  state.isIdle = false;
  refreshBusCompressorCoefficients(state, params, sampleRate);

  const { b0, b1, b2, a1, a2, attCoef, relCoef } = state;
  const T = params.thresholdDb, knee = params.kneeDb, halfKnee = knee * 0.5;
  const slope = 1 - 1 / Math.max(1, params.ratio);
  const makeup = params.makeupDb;
  const step = Math.max(0.01, params.mixPct / 100) / (BUS_COMP_BYPASS_RAMP_SEC * state.sampleRate);
  let { x1L, x2L, y1L, y2L, x1R, x2R, y1R, y2R } = state;
  let env = state.envGrDb, mix = state.activeMix, maxGr = 0;

  for (let i = 0; i < n; i++) {
    const xL = inL[i];
    const xR = inR ? inR[i] : xL;

    const scL = b0 * xL + b1 * x1L + b2 * x2L - a1 * y1L - a2 * y2L;
    x2L = x1L; x1L = xL; y2L = y1L; y1L = scL;
    const scR = b0 * xR + b1 * x1R + b2 * x2R - a1 * y1R - a2 * y2R;
    x2R = x1R; x1R = xR; y2R = y1R; y1R = scR;

    const aL = scL < 0 ? -scL : scL, aR = scR < 0 ? -scR : scR;
    const det = aL > aR ? aL : aR;
    let grTarget = 0;
    if (slope > 0 && det > DET_FLOOR) {
      const over = LN_TO_DB * Math.log(det) - T;
      if (knee > 0 && 2 * over > -knee && 2 * over < knee) {
        const k = over + halfKnee;
        grTarget = (slope * k * k) / (2 * knee);
      } else if (over > 0) {
        grTarget = slope * over;
      }
    }
    env = grTarget > env ? grTarget + (env - grTarget) * attCoef : grTarget + (env - grTarget) * relCoef;
    if (env > maxGr) maxGr = env;

    if (mix < targetMix) { mix += step; if (mix > targetMix) mix = targetMix; }
    else if (mix > targetMix) { mix -= step; if (mix < targetMix) mix = targetMix; }

    const wet = Math.exp((makeup - env) * DB_TO_LN);
    const g = 1 - mix + wet * mix;
    outL[i] = xL * g;
    outR[i] = xR * g;
  }

  if (y1L < DENORMAL && y1L > -DENORMAL) y1L = 0;
  if (y2L < DENORMAL && y2L > -DENORMAL) y2L = 0;
  if (y1R < DENORMAL && y1R > -DENORMAL) y1R = 0;
  if (y2R < DENORMAL && y2R > -DENORMAL) y2R = 0;
  if (env < 1e-9) env = 0;
  state.x1L = x1L; state.x2L = x2L; state.y1L = y1L; state.y2L = y2L;
  state.x1R = x1R; state.x2R = x2R; state.y1R = y1R; state.y2R = y2R;
  state.envGrDb = env; state.activeMix = mix;
  return maxGr;
}

/**
 * Traitement hors-ligne en place par blocs de 128 (même quantum que l'AudioWorklet).
 * `primeEngaged` : démarre directement au mix cible (le compresseur est déjà engagé en lecture live).
 */
export function processBusCompressorOffline(
  chL: Float32Array, chR: Float32Array, sampleRate: number,
  params: BusCompressorDspParams, primeEngaged = true
): { state: BusCompressorDspState; maxGrDb: number } {
  const state = createBusCompressorDspState(sampleRate);
  if (primeEngaged) state.activeMix = computeBusCompTargetMix(params);
  let maxGrDb = 0;
  for (let off = 0; off < chL.length; off += 128) {
    const end = Math.min(chL.length, off + 128);
    const subL = chL.subarray(off, end), subR = chR.subarray(off, end);
    const gr = processBusCompressorBlock(subL, subR, subL, subR, params, state, sampleRate);
    if (gr > maxGrDb) maxGrDb = gr;
  }
  return { state, maxGrDb };
}

