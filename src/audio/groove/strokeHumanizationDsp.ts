/**
 * strokeHumanizationDsp.ts — Primitives pures Zéro-GC d'Humanisation Acoustique « État de l'Art » (< 110 lignes).
 * Partagé à l'identique entre l'AudioWorklet SOA, le moteur Web Audio temps réel, le Worker de compilation et le Bounce WAV.
 */

export const VELOCITY_TONE_THRESHOLD = 0.68;
export const VELOCITY_TONE_MIN_HZ = 2800;
export const VELOCITY_TONE_MAX_HZ = 16000;
export const HIGH_BPM_DAMPING_START = 105;
export const HIGH_BPM_DECAY_THRESHOLD = 0.85;

function hashUint32(a: number, b: number, c: number, d: number): number {
  let h = (
    Math.imul((a | 0) + 11, 374761393) ^
    Math.imul((b | 0) + 23, 668265263) ^
    Math.imul((c | 0) + 7, 2246822519) ^
    Math.imul((d | 0) + 3, 3266489917)
  ) >>> 0;
  h = Math.imul(h ^ (h >>> 15), 2246822519) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 3266489917) >>> 0;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}

export function computeBeatProtectedStepVolume(
  rawStepVol: unknown,
  strokeIndex: number,
  nextRand: () => number,
  stepInMeasure = -1,
  isBeatHead?: boolean
): number {
  const rawVal = Array.isArray(rawStepVol) ? (rawStepVol[strokeIndex] ?? 70) : (rawStepVol ?? 70);
  let baseVol = typeof rawVal === 'number' && Number.isFinite(rawVal) ? rawVal : 70;
  if (baseVol <= 0) return 0;

  const strong =
    strokeIndex === 0 &&
    (isBeatHead !== undefined
      ? isBeatHead
      : stepInMeasure === 0 || stepInMeasure === 4 || stepInMeasure === 8 || stepInMeasure === 12);

  const u = Math.max(0, Math.min(1, nextRand()));
  const delta = strong
    ? u * (baseVol * 0.03) // [0 %, +3 %] strict : jamais < baseVol sur un temps fort
    : (u * 2 - 1) * (baseVol * 0.035);

  const finalVol = Math.max(strong ? baseVol : 0, Math.min(100, baseVol + delta));
  return (Number.isFinite(finalVol) ? finalVol : 70) / 100;
}

export function computeLivePlayerVelocityBreathing(
  velocity: number,
  seqId: number,
  trackId: number,
  playerIdx: number,
  stepSeed: number,
  isBeatHead = false
): number {
  if (velocity <= 0) return 0;
  const u = hashUint32(seqId, trackId, playerIdx, stepSeed);
  const mul = isBeatHead ? 1.0 + u * 0.015 : 1.0 + (u * 2 - 1) * 0.025;
  const cap = velocity > 3.0 ? 100 : 1.5;
  return Math.max(0, Math.min(cap, velocity * mul));
}

export function computeVelocityToneCutoffHz(rawVelocity: number): number {
  const normVel = rawVelocity > 3.0 ? rawVelocity / 100 : rawVelocity;
  if (!Number.isFinite(normVel) || normVel >= VELOCITY_TONE_THRESHOLD || normVel <= 0) {
    return 0;
  }
  const t = Math.max(0, Math.min(1, normVel / VELOCITY_TONE_THRESHOLD));
  return VELOCITY_TONE_MIN_HZ + Math.pow(t, 2.1) * (VELOCITY_TONE_MAX_HZ - VELOCITY_TONE_MIN_HZ);
}

export function computeOnePoleLowPassAlpha(cutoffHz: number, sampleRate: number): number {
  if (cutoffHz <= 0) return 0;
  const sr = sampleRate > 0 ? sampleRate : 48000;
  const clampedHz = Math.min(sr * 0.45, Math.max(200, cutoffHz));
  return 1 - Math.exp((-2 * Math.PI * clampedHz) / sr);
}

export function computeVelocityToneAlpha(rawVelocity: number, sampleRate: number): number {
  const hz = computeVelocityToneCutoffHz(rawVelocity);
  return hz <= 0 ? 0 : computeOnePoleLowPassAlpha(hz, sampleRate);
}

export function computeAlfaiaHighBpmDecayNorm(
  instrumentId: string,
  rawTrackDecay: number | undefined,
  bpm: number | undefined
): number {
  const raw = rawTrackDecay !== undefined ? rawTrackDecay : 1.0;
  const tNorm = raw <= 0 ? 1.0 : (raw > 1 ? raw / 100 : raw);
  const isAlfaia = instrumentId === 'marcante' || instrumentId === 'meiao' || instrumentId === 'repique';
  if (!isAlfaia || tNorm <= HIGH_BPM_DECAY_THRESHOLD || !bpm || !Number.isFinite(bpm) || bpm <= HIGH_BPM_DAMPING_START) {
    return tNorm;
  }
  const overBpm = Math.min(55, bpm - HIGH_BPM_DAMPING_START);
  const bpmDecayScale = 1.0 - (overBpm / 55) * 0.26;
  return Math.max(0.72, Math.min(1.0, tNorm * bpmDecayScale));
}
