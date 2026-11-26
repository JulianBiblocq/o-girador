/**
 * aoVivoBallisticMath.ts — Cinématique balistique continue à rebond élastique immédiat (< 90 lignes).
 * - Zéro plateau figé à vitesse nulle (`0 px/s`) : décollement courbe immédiat dès `impactOff`,
 *   avec coussin d'amorti près de la peau (`tCushionMs`) garantissant lisibilité 30 Hz LTPO et fluidité 120 Hz.
 * - Préparation compacte de poignet lorsque `realMsUntilNext < 115 ms`.
 */

export const NOMINAL_STRONG_STROKE_MS = 225;
export const NOMINAL_WEAK_STROKE_MS = 160;
export const FAST_REPEAT_COMPACT_THRESHOLD_MS = 115;
export const ELASTIC_CUSHION_SPAN_MS = 22;

export interface ImpactHoldTiming {
  delayOff: number;
  impactOff: number;
  cushionOff: number;
  holdEndOff: number;
  tImpactMs: number;
  tCushionMs: number;
  tHoldEndMs: number;
}

export function isFastRepeatCompactPrep(realMsUntilNext?: number): boolean {
  return typeof realMsUntilNext === 'number' && Number.isFinite(realMsUntilNext) && realMsUntilNext > 0 && realMsUntilNext < FAST_REPEAT_COMPACT_THRESHOLD_MS;
}

export function computeBallisticDurationMs(
  isStrong: boolean,
  realMsUntilNext: number,
  speedMultiplier = 1,
  customNominalMs?: number
): number {
  const spd = Math.max(0.25, speedMultiplier || 1);
  const baseMs = customNominalMs ?? (isStrong ? NOMINAL_STRONG_STROKE_MS : NOMINAL_WEAK_STROKE_MS);
  const nominalMs = Math.round(baseMs / spd);
  if (!Number.isFinite(realMsUntilNext) || realMsUntilNext <= 0) return nominalMs;
  const availMs = Math.max(48, Math.round(realMsUntilNext - 8));
  return Math.min(nominalMs, availMs);
}

export function computeElasticImpactTiming(durationMs: number, extraDelayMs = 0): ImpactHoldTiming {
  const safeDur = Math.max(48, durationMs);
  const safeExtra = extraDelayMs > 0 ? Math.min(extraDelayMs, safeDur * 0.16) : 0;
  const baseImpactMs = Math.min(24, safeDur * 0.24);
  const tImpactMs = safeExtra > 0 ? Math.min(safeExtra + baseImpactMs, safeDur * 0.36) : baseImpactMs;
  const maxCushionFrac = safeExtra > 0 ? 0.58 : 0.48;
  const tCushionMs = Math.max(tImpactMs + 8, Math.min(tImpactMs + ELASTIC_CUSHION_SPAN_MS, safeDur * maxCushionFrac));
  const cushionOff = +(tCushionMs / safeDur).toFixed(3);
  return {
    delayOff: +(safeExtra / safeDur).toFixed(3),
    impactOff: +(tImpactMs / safeDur).toFixed(3),
    cushionOff,
    holdEndOff: cushionOff,
    tImpactMs,
    tCushionMs,
    tHoldEndMs: tCushionMs,
  };
}

export const computeImpactHoldTiming = computeElasticImpactTiming;

export function sumLookaheadDurationMs(
  currentStep: number,
  targetStep: number,
  isCurrentSub: boolean,
  isTargetSub: boolean,
  fallbackStepDurationMs: number,
  stepDurationsMs?: readonly number[]
): number {
  const durAt = (idx: number): number => {
    const d = stepDurationsMs?.[idx];
    return typeof d === 'number' && d > 0 ? d : fallbackStepDurationMs;
  };
  if (targetStep <= currentStep) {
    return Math.max(40, Math.round(0.5 * durAt(currentStep)));
  }
  let totalMs = (isCurrentSub ? 0.5 : 1.0) * durAt(currentStep);
  for (let idx = currentStep + 1; idx < targetStep; idx++) {
    totalMs += durAt(idx);
  }
  if (isTargetSub) {
    totalMs += 0.5 * durAt(targetStep);
  }
  return Math.max(40, Math.round(totalMs));
}
