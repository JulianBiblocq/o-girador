/**
 * aoVivoBallisticMath.ts — Primitives physiques invariantes & anti-aliasing LTPO (< 95 lignes).
 * - Découple la vélocité balistique du geste (`225 ms` fort / `160 ms` faible) de `realMsUntilNext`.
 * - Garantit un maintien peau incompressible de `34 ms` (>= 1 trame 30 Hz LTPO complète).
 * - Force une préparation compacte de poignet lorsque `realMsUntilNext < 115 ms`.
 */

export const NOMINAL_STRONG_STROKE_MS = 225;
export const NOMINAL_WEAK_STROKE_MS = 160;
export const FAST_REPEAT_COMPACT_THRESHOLD_MS = 115;
export const MIN_SKIN_HOLD_MS = 34;

export interface ImpactHoldTiming {
  delayOff: number;
  impactOff: number;
  holdEndOff: number;
  tImpactMs: number;
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

export function computeImpactHoldTiming(durationMs: number, extraDelayMs = 0): ImpactHoldTiming {
  const safeDur = Math.max(48, durationMs);
  const safeExtra = extraDelayMs > 0 ? Math.min(extraDelayMs, safeDur * 0.16) : 0;
  const baseImpactMs = Math.min(18, safeDur * 0.22);
  const tImpactMs = safeExtra > 0 ? Math.min(safeExtra + baseImpactMs, safeDur * 0.34) : baseImpactMs;
  const maxHoldFrac = safeExtra > 0 ? 0.62 : 0.52;
  const tHoldEndMs = Math.max(tImpactMs + 4, Math.min(tImpactMs + MIN_SKIN_HOLD_MS, safeDur * maxHoldFrac));
  return {
    delayOff: +(safeExtra / safeDur).toFixed(3),
    impactOff: +(tImpactMs / safeDur).toFixed(3),
    holdEndOff: +(tHoldEndMs / safeDur).toFixed(3),
    tImpactMs,
    tHoldEndMs,
  };
}

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
