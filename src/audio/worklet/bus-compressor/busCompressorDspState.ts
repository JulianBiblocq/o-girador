/**
 * busCompressorDspState.ts — Paramètres, État & Coefficients du noyau DSP Compresseur de Bus (< 125 lignes).
 * 100 % pur (aucune dépendance DOM / Tone) : bundlable dans l'AudioWorklet IIFE comme dans le Bounce hors-ligne.
 */

export interface BusCompressorDspParams {
  enabled: boolean;
  thresholdDb: number;
  ratio: number;
  attackMs: number;
  releaseMs: number;
  kneeDb: number;
  sidechainHpfHz: number;
  makeupDb: number;
  mixPct: number;
  /** Mode Éco (`ecoConfig.disableFx`) : rampe vers `activeMix = 0` puis copie directe. */
  ecoBypass: boolean;
}

export const DEFAULT_BUS_COMPRESSOR_DSP_PARAMS: Readonly<BusCompressorDspParams> = {
  enabled: false, thresholdDb: -16, ratio: 3, attackMs: 22, releaseMs: 110,
  kneeDb: 6, sidechainHpfHz: 115, makeupDb: 0, mixPct: 75, ecoBypass: false,
};

export const BUS_COMP_BYPASS_RAMP_SEC = 0.02;
export const BUTTERWORTH_Q_SC = Math.SQRT1_2;

export interface BusCompressorDspState {
  sampleRate: number;
  /** Mix parallèle effectif (0..1), rampé linéairement sur 20 ms. */
  activeMix: number;
  /** Enveloppe balistique de réduction de gain (dB, >= 0). */
  envGrDb: number;
  /** Coefficients HPF Butterworth 2e ordre (normalisés a0 = 1). */
  b0: number; b1: number; b2: number; a1: number; a2: number;
  x1L: number; x2L: number; y1L: number; y2L: number;
  x1R: number; x2R: number; y1R: number; y2R: number;
  attCoef: number; relCoef: number;
  /** Clés de cache pour recalcul paresseux (zéro trigonométrie par bloc). */
  cachedHpfHz: number; cachedAttackMs: number; cachedReleaseMs: number; cachedSr: number;
  /** `true` lorsque le chemin DSP est totalement court-circuité (état remis à zéro). */
  isIdle: boolean;
}

export function createBusCompressorDspState(sampleRate: number): BusCompressorDspState {
  return {
    sampleRate: sampleRate > 0 ? sampleRate : 48000,
    activeMix: 0, envGrDb: 0,
    b0: 1, b1: 0, b2: 0, a1: 0, a2: 0,
    x1L: 0, x2L: 0, y1L: 0, y2L: 0, x1R: 0, x2R: 0, y1R: 0, y2R: 0,
    attCoef: 0, relCoef: 0,
    cachedHpfHz: -1, cachedAttackMs: -1, cachedReleaseMs: -1, cachedSr: -1,
    isIdle: true,
  };
}

export function resetBusCompressorDetector(s: BusCompressorDspState): void {
  s.envGrDb = 0;
  s.x1L = 0; s.x2L = 0; s.y1L = 0; s.y2L = 0;
  s.x1R = 0; s.x2R = 0; s.y1R = 0; s.y2R = 0;
}

export function resetBusCompressorDspState(s: BusCompressorDspState): void {
  resetBusCompressorDetector(s);
  s.activeMix = 0;
  s.isIdle = true;
}

function msToCoef(ms: number, sr: number): number {
  const sec = Math.max(0.0001, ms * 0.001);
  return Math.exp(-1 / (sec * sr));
}

/** Recalcule HPF sidechain & balistique uniquement si un paramètre a changé (zéro allocation). */
export function refreshBusCompressorCoefficients(
  s: BusCompressorDspState,
  p: BusCompressorDspParams,
  sampleRate: number
): void {
  const sr = sampleRate > 0 ? sampleRate : s.sampleRate;
  if (sr !== s.cachedSr) {
    s.sampleRate = sr; s.cachedSr = sr;
    s.cachedHpfHz = -1; s.cachedAttackMs = -1; s.cachedReleaseMs = -1;
  }
  const hz = Math.max(20, Math.min(250, p.sidechainHpfHz));
  if (hz !== s.cachedHpfHz) {
    const w0 = (2 * Math.PI * hz) / sr;
    const cosW = Math.cos(w0);
    const alpha = Math.sin(w0) / (2 * BUTTERWORTH_Q_SC);
    const a0 = 1 + alpha;
    s.b0 = ((1 + cosW) * 0.5) / a0;
    s.b1 = -(1 + cosW) / a0;
    s.b2 = s.b0;
    s.a1 = (-2 * cosW) / a0;
    s.a2 = (1 - alpha) / a0;
    s.cachedHpfHz = hz;
  }
  if (p.attackMs !== s.cachedAttackMs) { s.attCoef = msToCoef(Math.max(1, p.attackMs), sr); s.cachedAttackMs = p.attackMs; }
  if (p.releaseMs !== s.cachedReleaseMs) { s.relCoef = msToCoef(Math.max(30, p.releaseMs), sr); s.cachedReleaseMs = p.releaseMs; }
}

/** Fusion bornée d'un patch entrant (port Worklet) dans des paramètres mutables (zéro NaN). */
export function mergeBusCompressorDspParams(target: BusCompressorDspParams, patch: Partial<BusCompressorDspParams>): void {
  const num = (v: unknown, min: number, max: number, cur: number) =>
    (typeof v === 'number' && Number.isFinite(v) ? Math.max(min, Math.min(max, v)) : cur);
  if (typeof patch.enabled === 'boolean') target.enabled = patch.enabled;
  if (typeof patch.ecoBypass === 'boolean') target.ecoBypass = patch.ecoBypass;
  target.thresholdDb = num(patch.thresholdDb, -40, 0, target.thresholdDb);
  target.ratio = num(patch.ratio, 1, 10, target.ratio);
  target.attackMs = num(patch.attackMs, 1, 50, target.attackMs);
  target.releaseMs = num(patch.releaseMs, 30, 400, target.releaseMs);
  target.kneeDb = num(patch.kneeDb, 0, 12, target.kneeDb);
  target.sidechainHpfHz = num(patch.sidechainHpfHz, 20, 250, target.sidechainHpfHz);
  target.makeupDb = num(patch.makeupDb, -6, 12, target.makeupDb);
  target.mixPct = num(patch.mixPct, 0, 100, target.mixPct);
}

