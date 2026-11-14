/**
 * strokeEnvelopeHelper.ts — Enveloppes Hold+Damping & Calibration Studio Linéaire (< 75 lignes).
 * Parité mathématique exacte avec `workletEnvelopeMath.ts`.
 */
import { NOMINAL_STUDIO_STEP_VEL } from '../worklet/processor/workletEnvelopeMath';

export interface ProgressiveDecayEnvelope {
  isFullBuffer: boolean;
  totalAudibleSec: number;
  holdSec: number;
  releaseSec: number;
}

export function computeEnginePeakGain(
  velocity: number,
  strokeBaseGain = 1.0,
  isStudioCalibrated = false,
  isLiveDirect = false
): number {
  const normVel = velocity > 3.0 ? velocity / 100 : velocity;
  if (normVel <= 0.001) return 0;
  const baseGain = strokeBaseGain > 0 ? strokeBaseGain : 1.0;
  if (isStudioCalibrated) {
    const refVel = isLiveDirect ? 1.0 : NOMINAL_STUDIO_STEP_VEL;
    return Math.max(0, Math.min(1.5, normVel / refVel)) * baseGain;
  }
  const compensatedVel = normVel * 1.142857;
  return Math.pow(Math.max(0, Math.min(2.0, compensatedVel)), 1.8) * baseGain;
}

export function computeProgressiveDecayEnvelope(
  realWorldDuration: number,
  rawDecay: number,
  forceShort80ms = false
): ProgressiveDecayEnvelope {
  if (forceShort80ms) {
    const totalAudibleSec = Math.min(realWorldDuration, 0.080);
    const holdSec = Math.min(0.035, totalAudibleSec * 0.45);
    const releaseSec = Math.max(0.020, totalAudibleSec - holdSec);
    return { isFullBuffer: false, totalAudibleSec, holdSec, releaseSec };
  }
  const effectiveDecayNorm = rawDecay > 1 ? rawDecay / 100 : Math.max(0.15, Math.min(1.0, rawDecay));
  if (effectiveDecayNorm >= 0.995) {
    return {
      isFullBuffer: true,
      totalAudibleSec: realWorldDuration,
      holdSec: Math.max(0, realWorldDuration - Math.min(0.015, realWorldDuration / 2)),
      releaseSec: Math.min(0.015, realWorldDuration / 2),
    };
  }
  const minDurationSec = 0.085;
  const maxDurationSec = Math.min(realWorldDuration, 1.35);
  const t = Math.max(0, Math.min(1, (effectiveDecayNorm - 0.15) / 0.85));
  const totalAudibleSec = minDurationSec + Math.pow(t, 1.6) * Math.max(0, maxDurationSec - minDurationSec);
  const holdSec = Math.max(0.030, totalAudibleSec * 0.55);
  const releaseSec = Math.max(0.040, totalAudibleSec - holdSec);
  return { isFullBuffer: false, totalAudibleSec, holdSec, releaseSec };
}
