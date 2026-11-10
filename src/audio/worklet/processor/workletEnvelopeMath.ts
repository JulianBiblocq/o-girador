/**
 * O Girador - Calcul Analytique d'Enveloppe & Gain pour AudioWorklet (< 90 lignes)
 * Exécuté uniquement à l'ouverture d'une voix (dépilement d'événement) :
 * - 0 `Math.pow` par sample dans la boucle `process()` (facteur récurrent `expMul`).
 * - Parité mathématique 100 % identique à `EngineStrokePlayback`.
 */

export interface WorkletVoiceEnvelopeParams {
  isFullBuffer: number;
  safePeakGain: number;
  midGain: number;
  holdFrames: number;
  midRelFrames: number;
  relEndFrames: number;
  endFrames: number;
  linStep1: number;
  expMul: number;
  linStep2: number;
}

export function computeWorkletPeakGain(velocity: number, strokeBaseGain: number): number {
  const normVel = velocity > 3.0 ? velocity / 100 : velocity;
  if (normVel <= 0.001) return 0;
  const clamped = Math.max(0, Math.min(2.0, normVel * 1.142857));
  const baseGain = strokeBaseGain > 0 ? strokeBaseGain : 1.0;
  return Math.pow(clamped, 1.8) * baseGain;
}

export function computeWorkletEffectiveDecay(stepDecayNorm: number, trackDecayNorm: number): number {
  const s = stepDecayNorm <= 0 ? 1.0 : (stepDecayNorm > 1 ? stepDecayNorm / 100 : stepDecayNorm);
  const t = trackDecayNorm <= 0 ? 1.0 : (trackDecayNorm > 1 ? trackDecayNorm / 100 : trackDecayNorm);
  return Math.max(0.15, Math.min(1.0, s * t));
}

export function fillWorkletVoiceEnvelope(
  realWorldDurationSec: number,
  effectiveDecayNorm: number,
  peakGain: number,
  contextSampleRate: number,
  out: WorkletVoiceEnvelopeParams
): void {
  const sr = contextSampleRate > 0 ? contextSampleRate : 48000;
  const safePeak = Math.max(0.0001, peakGain);
  out.safePeakGain = safePeak;

  if (effectiveDecayNorm >= 0.995) {
    const releaseSec = Math.min(0.015, realWorldDurationSec * 0.5);
    const holdFrames = Math.max(1, Math.round(Math.max(0, realWorldDurationSec - releaseSec) * sr));
    const endFrames = Math.max(holdFrames + 1, Math.round(realWorldDurationSec * sr));
    out.isFullBuffer = 1;
    out.midGain = safePeak;
    out.holdFrames = holdFrames;
    out.midRelFrames = holdFrames;
    out.relEndFrames = endFrames;
    out.endFrames = endFrames;
    out.linStep1 = 0;
    out.expMul = 1.0;
    out.linStep2 = -safePeak / Math.max(1, endFrames - holdFrames);
    return;
  }

  const minDurationSec = 0.085;
  const maxDurationSec = Math.min(realWorldDurationSec, 1.35);
  const t = Math.max(0, Math.min(1, (effectiveDecayNorm - 0.15) / 0.85));
  const totalAudibleSec = minDurationSec + Math.pow(t, 1.6) * Math.max(0, maxDurationSec - minDurationSec);
  const holdSec = Math.max(0.030, totalAudibleSec * 0.55);
  const releaseSec = Math.max(0.040, totalAudibleSec - holdSec);

  const holdFrames = Math.max(1, Math.round(holdSec * sr));
  const halfRelFrames = Math.max(1, Math.round(releaseSec * 0.5 * sr));
  const midRelFrames = holdFrames + halfRelFrames;
  const expFrames = Math.max(1, Math.round(releaseSec * sr) - halfRelFrames);
  const relEndFrames = midRelFrames + expFrames;
  const tailFrames = Math.max(1, Math.round(0.010 * sr));
  const midGain = Math.max(0.0001, safePeak * 0.35);

  out.isFullBuffer = 0;
  out.midGain = midGain;
  out.holdFrames = holdFrames;
  out.midRelFrames = midRelFrames;
  out.relEndFrames = relEndFrames;
  out.endFrames = relEndFrames + tailFrames;
  out.linStep1 = (midGain - safePeak) / halfRelFrames;
  out.expMul = Math.pow(0.0001 / midGain, 1 / expFrames);
  out.linStep2 = -0.0001 / tailFrames;
}
